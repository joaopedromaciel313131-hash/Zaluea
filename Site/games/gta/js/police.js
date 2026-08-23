import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export class PoliceSystem {
    constructor(scene, cityWorld, vehicleManager, weaponManager) {
        this.scene = scene;
        this.city = cityWorld;
        this.vehicles = vehicleManager;
        this.weapons = weaponManager;

        // Wanted System (0 to 5 Stars)
        this.wantedLevel = 0;
        this.crimeScore = 0;
        this.isFlashing = false;
        this.evadeTimer = 0;
        this.lastKnownCrimePos = new THREE.Vector3();
        this.searchRadius = 80;

        // Busting Mechanic
        this.bustedTimer = 0;
        this.isBusted = false;

        // Active Police Units
        this.policeVehicles = [];
        this.heliUnit = null;
        this.heliSpotlight = null;
        this.roadblocks = [];

        this.spawnTimer = 0;
        this.sirenAudioTimer = 0;
    }

    reportCrime(severity = 1, playerPos) {
        this.crimeScore += severity * 22;
        this.lastKnownCrimePos.copy(playerPos);
        this.evadeTimer = 16.0;
        this.searchRadius = 70 + this.wantedLevel * 25;

        if (this.crimeScore > 240) this.setWantedLevel(5);
        else if (this.crimeScore > 150) this.setWantedLevel(4);
        else if (this.crimeScore > 85) this.setWantedLevel(3);
        else if (this.crimeScore > 35) this.setWantedLevel(2);
        else if (this.crimeScore > 8) this.setWantedLevel(1);
    }

    setWantedLevel(stars) {
        if (this.wantedLevel === stars) return;
        const prev = this.wantedLevel;
        this.wantedLevel = Math.min(Math.max(stars, 0), 5);

        if (this.wantedLevel > 0 && prev === 0) {
            soundEngine.playSiren('wail');
        }

        if (this.wantedLevel >= 3 && prev < 3) {
            this.spawnRoadblock(this.lastKnownCrimePos);
        }

        if (this.wantedLevel === 0) {
            this.clearAllPolice();
        }
    }

    clearWantedLevel() {
        this.wantedLevel = 0;
        this.crimeScore = 0;
        this.isFlashing = false;
        this.evadeTimer = 0;
        this.bustedTimer = 0;
        this.clearAllPolice();
    }

    clearAllPolice() {
        this.policeVehicles.forEach(pv => {
            if (!pv.vData.driver) {
                this.scene.remove(pv.vData.group);
                const idx = this.vehicles.vehicles.indexOf(pv.vData);
                if (idx !== -1) this.vehicles.vehicles.splice(idx, 1);
            }
        });
        this.policeVehicles = [];

        this.roadblocks.forEach(rb => {
            this.scene.remove(rb.group);
        });
        this.roadblocks = [];

        if (this.heliUnit) {
            this.scene.remove(this.heliUnit.group);
            if (this.heliSpotlight) this.scene.remove(this.heliSpotlight);
            this.heliUnit = null;
            this.heliSpotlight = null;
        }
    }

    spawnRoadblock(pos) {
        const rbGroup = new THREE.Group();
        const roadNode = this.city.roadNodes.find(n => Math.abs(n.x - pos.x) < 80 && Math.abs(n.z - pos.z) < 80);
        if (!roadNode) return;

        rbGroup.position.set(roadNode.x, 0, roadNode.z);

        // Barricade with flashing hazard light
        const barMat = new THREE.MeshLambertMaterial({ color: 0xffa502 });
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.6), barMat);
        barrier.position.y = 0.6;
        rbGroup.add(barrier);

        const hazardLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
        hazardLight.position.set(0, 1.5, 0);
        rbGroup.add(hazardLight);

        this.scene.add(rbGroup);
        this.roadblocks.push({ group: rbGroup, x: roadNode.x, z: roadNode.z });
    }

    spawnPoliceReinforcements(playerPos) {
        if (this.wantedLevel === 0) return;

        const maxUnits = this.wantedLevel * 2;
        if (this.policeVehicles.length >= maxUnits) return;

        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 35;
        const sx = playerPos.x + Math.cos(angle) * dist;
        const sz = playerPos.z + Math.sin(angle) * dist;

        const isSWAT = this.wantedLevel >= 4 && Math.random() < 0.5;
        const type = isSWAT ? 'swat' : 'police';
        const vData = this.vehicles.createVehicle(type, sx, 0.5, sz, angle, 0xffffff, isSWAT ? "SWAT Enforcer" : "Police Cruiser");

        this.policeVehicles.push({
            vData,
            shootTimer: Math.random() * 2,
            targetPos: playerPos.clone()
        });

        // 5 Stars: Spawn Police Helicopter
        if (this.wantedLevel === 5 && !this.heliUnit) {
            this.spawnPoliceHelicopter(playerPos);
        }
    }

    spawnPoliceHelicopter(playerPos) {
        const hData = this.vehicles.createVehicle('helicopter', playerPos.x + 50, 40, playerPos.z + 50, 0, 0x1e272e, "Police Air-1");
        hData.altitude = 40;
        this.heliUnit = hData;

        this.heliSpotlight = new THREE.SpotLight(0xffffff, 3.0, 85, Math.PI / 6, 0.4);
        this.heliSpotlight.position.set(playerPos.x + 50, 40, playerPos.z + 50);
        this.heliSpotlight.target.position.copy(playerPos);
        this.scene.add(this.heliSpotlight);
        this.scene.add(this.heliSpotlight.target);
    }

    // ----------------------------------------------------
    // POLICE UPDATE: PURSUIT, SIGHT SEARCH & BUSTING MECHANIC
    // ----------------------------------------------------
    update(delta, player, onPlayerDamage, onPlayerBusted) {
        if (this.wantedLevel === 0) return;

        const playerPos = player.position;

        // Pay 'n' Spray check
        const pns = this.city.payNSprayTrigger;
        if (pns && player.inVehicle) {
            const dx = playerPos.x - pns.x;
            const dz = playerPos.z - pns.z;
            if (Math.sqrt(dx * dx + dz * dz) < pns.radius) {
                this.clearWantedLevel();
                player.inVehicle.health = player.inVehicle.maxHealth;
                soundEngine.playMoneySound();
                return;
            }
        }

        // Periodic Siren Audio
        this.sirenAudioTimer += delta;
        if (this.sirenAudioTimer > 4.2) {
            this.sirenAudioTimer = 0;
            soundEngine.playSiren(Math.random() < 0.5 ? 'wail' : 'yelp');
        }

        // Spawning
        this.spawnTimer += delta;
        if (this.spawnTimer > 3.8) {
            this.spawnTimer = 0;
            this.spawnPoliceReinforcements(playerPos);
        }

        // Sight & Search radius tracking
        const distFromCrime = playerPos.distanceTo(this.lastKnownCrimePos);
        if (distFromCrime > this.searchRadius) {
            this.evadeTimer -= delta;
            this.isFlashing = true;

            if (this.evadeTimer <= 0) {
                player.addMoney(1500);
                this.clearWantedLevel();
                return;
            }
        } else {
            this.evadeTimer = 16.0;
            this.isFlashing = false;
        }

        // Busting Proximity Mechanic: If player is pinned/stopped near police
        let isNearPolice = false;

        // Pursuing police cruisers
        for (let i = this.policeVehicles.length - 1; i >= 0; i--) {
            const pv = this.policeVehicles[i];
            const v = pv.vData;

            if (v.isDestroyed) {
                this.policeVehicles.splice(i, 1);
                continue;
            }

            const dx = playerPos.x - v.group.position.x;
            const dz = playerPos.z - v.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 5.0) {
                isNearPolice = true;
            }

            const targetAngle = Math.atan2(-dx, -dz);
            let diff = targetAngle - v.group.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            v.group.rotation.y += Math.min(Math.max(diff, -2.6 * delta), 2.6 * delta);
            v.speed = Math.min(48, v.speed + 28 * delta);

            const fX = -Math.sin(v.group.rotation.y);
            const fZ = -Math.cos(v.group.rotation.y);
            const nX = v.group.position.x + fX * v.speed * delta;
            const nZ = v.group.position.z + fZ * v.speed * delta;

            const hit = this.city.checkCollision(nX, nZ, 1.4);
            if (!hit) {
                v.group.position.x = nX;
                v.group.position.z = nZ;
            }

            for (let w of v.wheels) {
                w.mesh.rotation.x += v.speed * 1.5 * delta;
            }

            // Shoot at player
            if (dist < 32 && dist > 4) {
                pv.shootTimer -= delta;
                if (pv.shootTimer <= 0) {
                    pv.shootTimer = 1.1 + Math.random() * 1.0;
                    soundEngine.playPistolShot();
                    if (onPlayerDamage && Math.random() < 0.4) {
                        onPlayerDamage(12);
                    }
                }
            }

            // PIT Maneuver / Ramming
            if (dist < 3.5 && player.inVehicle) {
                player.inVehicle.speed *= 0.8;
                soundEngine.playCarCrash(0.9);
            }
        }

        // Busting Timer check (if player is slow/stopped and near police)
        const playerSpeed = player.inVehicle ? Math.abs(player.inVehicle.speed) : player.velocity.length();
        if (isNearPolice && playerSpeed < 2.0) {
            this.bustedTimer += delta;
            if (this.bustedTimer >= 3.5 && !player.isWasted && onPlayerBusted) {
                this.bustedTimer = 0;
                onPlayerBusted();
            }
        } else {
            this.bustedTimer = Math.max(0, this.bustedTimer - delta * 2);
        }

        // Helicopter searchlight tracking
        if (this.heliUnit && !this.heliUnit.isDestroyed) {
            const h = this.heliUnit;
            h.group.position.x += (playerPos.x - h.group.position.x) * 0.8 * delta;
            h.group.position.z += (playerPos.z - h.group.position.z) * 0.8 * delta;
            h.group.position.y = 38 + Math.sin(performance.now() * 0.002) * 1.5;

            if (h.rotors.length > 0) {
                h.rotors[0].rotation.y += delta * 30;
                h.rotors[1].rotation.x += delta * 30;
            }

            if (this.heliSpotlight) {
                this.heliSpotlight.position.copy(h.group.position);
                this.heliSpotlight.target.position.copy(playerPos);
                this.heliSpotlight.target.updateMatrixWorld();
            }
        }
    }
}
