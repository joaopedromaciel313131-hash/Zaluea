import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export const WEAPON_TYPES = [
    { id: 0, name: "Fists", type: "melee", icon: "👊", magSize: Infinity, maxAmmo: Infinity, damage: 30, fireRate: 0.35, range: 2.5 },
    { id: 1, name: "9mm Pistol", type: "gun", icon: "🔫", magSize: 12, maxAmmo: 180, damage: 38, fireRate: 0.22, range: 75 },
    { id: 2, name: "Micro SMG", type: "gun", icon: "⚡", magSize: 30, maxAmmo: 300, damage: 24, fireRate: 0.085, range: 60 },
    { id: 3, name: "Combat Shotgun", type: "shotgun", icon: "💥", magSize: 8, maxAmmo: 80, damage: 18, pellets: 7, fireRate: 0.65, range: 35 },
    { id: 4, name: "Assault Rifle", type: "gun", icon: "🎯", magSize: 30, maxAmmo: 300, damage: 45, fireRate: 0.11, range: 110 },
    { id: 5, name: "Heavy Sniper", type: "sniper", icon: "🔭", magSize: 5, maxAmmo: 40, damage: 160, fireRate: 1.1, range: 220 },
    { id: 6, name: "RPG Launcher", type: "rpg", icon: "🚀", magSize: 1, maxAmmo: 15, damage: 350, fireRate: 1.4, range: 180 },
    { id: 7, name: "Frag Grenade", type: "throwable", icon: "💣", magSize: 1, maxAmmo: 10, damage: 250, fireRate: 1.0, range: 45 }
];

export class WeaponManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Player Inventory
        this.inventory = WEAPON_TYPES.map(w => ({
            ...w,
            ammoInMag: w.magSize,
            reserveAmmo: w.maxAmmo === Infinity ? Infinity : Math.floor(w.maxAmmo * 0.75),
            unlocked: w.id <= 2 // Start with Fists, Pistol, SMG unlocked
        }));
        this.currentWeaponIndex = 1; // Start with Pistol
        this.lastFireTime = 0;

        // Tracers & Projectiles
        this.tracers = [];
        this.rockets = [];
        this.grenades = [];
        this.explosions = [];

        // Muzzle Flash
        this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 15);
        this.scene.add(this.muzzleLight);
        this.muzzleTimer = 0;

        // Raycaster for hit detection
        this.raycaster = new THREE.Raycaster();
    }

    getCurrentWeapon() {
        return this.inventory[this.currentWeaponIndex];
    }

    selectWeapon(index) {
        if (index >= 0 && index < this.inventory.length && this.inventory[index].unlocked) {
            this.currentWeaponIndex = index;
            return this.inventory[index];
        }
        return this.getCurrentWeapon();
    }

    unlockAllWeapons() {
        this.inventory.forEach(w => {
            w.unlocked = true;
            w.reserveAmmo = w.maxAmmo;
            w.ammoInMag = w.magSize;
        });
    }

    // ----------------------------------------------------
    // FIRING LOGIC
    // ----------------------------------------------------
    shoot(originPos, aimDir, onHitCallback) {
        const weapon = this.getCurrentWeapon();
        const now = performance.now() / 1000;

        if (now - this.lastFireTime < weapon.fireRate) return false;

        // Ammo check
        if (weapon.type !== 'melee') {
            if (weapon.ammoInMag <= 0) {
                this.reload();
                return false;
            }
            weapon.ammoInMag--;
        }

        this.lastFireTime = now;

        // Flash muzzle
        this.triggerMuzzleFlash(originPos);

        // Sound effect
        switch (weapon.id) {
            case 0: soundEngine.playPunch(); break;
            case 1: soundEngine.playPistolShot(); break;
            case 2: soundEngine.playSMGShot(); break;
            case 3: soundEngine.playShotgunShot(); break;
            case 4: soundEngine.playRifleShot(); break;
            case 5: soundEngine.playSniperShot(); break;
            case 6: soundEngine.playRPGLaunch(); break;
            case 7: soundEngine.playNoiseCrack(0.15, 2000, 0.4); break;
        }

        if (weapon.type === 'rpg') {
            this.spawnRocket(originPos, aimDir);
        } else if (weapon.type === 'throwable') {
            this.spawnGrenade(originPos, aimDir);
        } else if (weapon.type === 'shotgun') {
            // Multipellet spread
            for (let i = 0; i < weapon.pellets; i++) {
                const spreadDir = aimDir.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.12,
                    (Math.random() - 0.5) * 0.12,
                    (Math.random() - 0.5) * 0.12
                )).normalize();
                this.fireBulletRay(originPos, spreadDir, weapon.damage, weapon.range, onHitCallback);
            }
        } else if (weapon.type === 'melee') {
            this.fireMeleeHit(originPos, aimDir, weapon.damage, weapon.range, onHitCallback);
        } else {
            // Standard Bullet
            this.fireBulletRay(originPos, aimDir, weapon.damage, weapon.range, onHitCallback);
        }

        return true;
    }

    reload() {
        const weapon = this.getCurrentWeapon();
        if (weapon.type === 'melee' || weapon.ammoInMag === weapon.magSize || weapon.reserveAmmo <= 0) return;
        const needed = weapon.magSize - weapon.ammoInMag;
        const toLoad = Math.min(needed, weapon.reserveAmmo);
        weapon.ammoInMag += toLoad;
        weapon.reserveAmmo -= toLoad;
        soundEngine.playNoiseCrack(0.2, 3000, 0.4);
    }

    fireBulletRay(origin, direction, damage, range, onHitCallback) {
        // Create 3D laser bullet tracer
        const endPos = origin.clone().add(direction.clone().multiplyScalar(range));
        this.createBulletTracer(origin, endPos);

        // Perform raycast against enemies/vehicles
        if (onHitCallback) {
            onHitCallback(origin, direction, damage, range);
        }
    }

    fireMeleeHit(origin, direction, damage, range, onHitCallback) {
        if (onHitCallback) {
            onHitCallback(origin, direction, damage, range);
        }
    }

    createBulletTracer(start, end) {
        const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
        const mat = new THREE.LineBasicMaterial({ color: 0xffeaa7, linewidth: 2, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(geom, mat);
        this.scene.add(line);
        this.tracers.push({ line, life: 0, maxLife: 0.08 });
    }

    triggerMuzzleFlash(pos) {
        this.muzzleLight.position.copy(pos);
        this.muzzleLight.intensity = 4.0;
        this.muzzleTimer = 0.06;
    }

    spawnRocket(origin, dir) {
        const rocketGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8);
        rocketGeo.rotateX(Math.PI / 2);
        const rocketMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8 });
        const rocket = new THREE.Mesh(rocketGeo, rocketMat);
        rocket.position.copy(origin);
        rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.scene.add(rocket);

        this.rockets.push({
            mesh: rocket,
            dir: dir.clone(),
            speed: 55,
            life: 0,
            maxLife: 4.0
        });
    }

    spawnGrenade(origin, dir) {
        const gGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const gMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
        const grenade = new THREE.Mesh(gGeo, gMat);
        grenade.position.copy(origin);
        this.scene.add(grenade);

        this.grenades.push({
            mesh: grenade,
            vel: dir.clone().multiplyScalar(22).add(new THREE.Vector3(0, 6, 0)),
            life: 0,
            maxLife: 2.5
        });
    }

    createExplosion(x, y, z, radius = 12, damage = 250, onExplosionAoECallback = null) {
        soundEngine.playExplosion();

        // 3D Shockwave ring & Fireball sphere
        const expGeo = new THREE.SphereGeometry(1.5, 12, 12);
        const expMat = new THREE.MeshBasicMaterial({ color: 0xff4757, transparent: true, opacity: 0.9 });
        const expMesh = new THREE.Mesh(expGeo, expMat);
        expMesh.position.set(x, y, z);
        this.scene.add(expMesh);

        this.explosions.push({
            mesh: expMesh,
            maxScale: radius * 0.7,
            life: 0,
            maxLife: 0.7
        });

        if (onExplosionAoECallback) {
            onExplosionAoECallback(new THREE.Vector3(x, y, z), radius, damage);
        }
    }

    // ----------------------------------------------------
    // UPDATE
    // ----------------------------------------------------
    update(delta, checkWorldCollision, onExplosionAoECallback) {
        // Update muzzle light
        if (this.muzzleTimer > 0) {
            this.muzzleTimer -= delta;
            if (this.muzzleTimer <= 0) {
                this.muzzleLight.intensity = 0;
            }
        }

        // Update Tracers
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const tr = this.tracers[i];
            tr.life += delta;
            if (tr.life >= tr.maxLife) {
                this.scene.remove(tr.line);
                this.tracers.splice(i, 1);
            }
        }

        // Update Flying Rockets
        for (let r = this.rockets.length - 1; r >= 0; r--) {
            const rk = this.rockets[r];
            rk.life += delta;
            const moveStep = rk.dir.clone().multiplyScalar(rk.speed * delta);
            rk.mesh.position.add(moveStep);

            // Check contact collision with ground or buildings
            const hit = checkWorldCollision(rk.mesh.position.x, rk.mesh.position.z, 0.4);
            if (hit || rk.mesh.position.y <= 0.2 || rk.life >= rk.maxLife) {
                this.createExplosion(rk.mesh.position.x, Math.max(rk.mesh.position.y, 0.5), rk.mesh.position.z, 14, 350, onExplosionAoECallback);
                this.scene.remove(rk.mesh);
                this.rockets.splice(r, 1);
            }
        }

        // Update Bouncing Grenades
        for (let g = this.grenades.length - 1; g >= 0; g--) {
            const gr = this.grenades[g];
            gr.life += delta;
            gr.vel.y -= 19.6 * delta; // Gravity
            gr.mesh.position.add(gr.vel.clone().multiplyScalar(delta));

            // Bounce on ground
            if (gr.mesh.position.y <= 0.2) {
                gr.mesh.position.y = 0.2;
                gr.vel.y = -gr.vel.y * 0.45;
                gr.vel.x *= 0.7;
                gr.vel.z *= 0.7;
            }

            if (gr.life >= gr.maxLife) {
                this.createExplosion(gr.mesh.position.x, 0.5, gr.mesh.position.z, 12, 250, onExplosionAoECallback);
                this.scene.remove(gr.mesh);
                this.grenades.splice(g, 1);
            }
        }

        // Update Explosions
        for (let e = this.explosions.length - 1; e >= 0; e--) {
            const exp = this.explosions[e];
            exp.life += delta;
            const progress = exp.life / exp.maxLife;
            const currentScale = 1 + progress * exp.maxScale;
            exp.mesh.scale.set(currentScale, currentScale, currentScale);
            exp.mesh.material.opacity = (1 - progress) * 0.85;

            if (exp.life >= exp.maxLife) {
                this.scene.remove(exp.mesh);
                this.explosions.splice(e, 1);
            }
        }
    }
}
