import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export class PedestrianSystem {
    constructor(scene, cityWorld) {
        this.scene = scene;
        this.city = cityWorld;
        this.pedestrians = [];
        this.maxPedestrians = 32;
        this.pickups = []; // Cash & Ammo loot drops
        this.spawnTimer = 0;

        this.initPedestrians();
    }

    initPedestrians() {
        for (let i = 0; i < 24; i++) {
            this.spawnPedestrian();
        }
    }

    spawnPedestrian(nearPos = null) {
        if (this.pedestrians.length >= this.maxPedestrians) return;

        let spawnX = (Math.random() - 0.5) * 320;
        let spawnZ = (Math.random() - 0.5) * 320;

        if (nearPos) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 65;
            spawnX = nearPos.x + Math.cos(angle) * dist;
            spawnZ = nearPos.z + Math.sin(angle) * dist;
        }

        const group = new THREE.Group();
        group.position.set(spawnX, 0, spawnZ);

        const skinColors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0x8d5524, 0x54361e];
        const shirtColors = [0x2ecc71, 0x3498db, 0x9b59b6, 0xf1c40f, 0xe67e22, 0xe74c3c, 0x34495e, 0xffffff, 0x1abc9c];
        const pantsColors = [0x2c3e50, 0x7f8c8d, 0x34495e, 0x1e272e, 0x2f3640];

        const skinMat = new THREE.MeshLambertMaterial({ color: skinColors[Math.floor(Math.random() * skinColors.length)] });
        const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColors[Math.floor(Math.random() * shirtColors.length)] });
        const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColors[Math.floor(Math.random() * pantsColors.length)] });

        // Articulated Skeleton Hierarchy
        const hips = new THREE.Group();
        hips.position.y = 0.9;
        group.add(hips);

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.28), shirtMat);
        torso.position.y = 0.3;
        torso.castShadow = true;
        hips.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
        head.position.y = 0.75;
        head.castShadow = true;
        hips.add(head);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), shirtMat);
        leftArm.position.set(-0.32, 0.3, 0);
        hips.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), shirtMat);
        rightArm.position.set(0.32, 0.3, 0);
        hips.add(rightArm);

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), pantsMat);
        leftLeg.position.set(-0.14, -0.38, 0);
        hips.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), pantsMat);
        rightLeg.position.set(0.14, -0.38, 0);
        hips.add(rightLeg);

        this.scene.add(group);

        const isGangster = Math.random() < 0.22;

        const pedData = {
            group,
            hips,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            health: 50,
            state: 'WALKING', // 'WALKING', 'PANICKED', 'AGGRESSIVE', 'RAGDOLL', 'DEAD'
            speed: 2.2 + Math.random() * 1.4,
            facingAngle: Math.random() * Math.PI * 2,
            targetDir: new THREE.Vector3(Math.cos(Math.random() * Math.PI * 2), 0, Math.sin(Math.random() * Math.PI * 2)),
            walkTimer: 3 + Math.random() * 6,
            panicTimer: 0,
            ragdollTimer: 0,
            ragdollVel: new THREE.Vector3(),
            isGangster,
            hasCalledPolice: false,
            animOffset: Math.random() * 10
        };

        this.pedestrians.push(pedData);
    }

    triggerPanic(originPos, radius = 50, onPoliceCalled = null) {
        this.pedestrians.forEach(p => {
            if (p.state === 'DEAD' || p.state === 'RAGDOLL') return;
            const dx = p.group.position.x - originPos.x;
            const dz = p.group.position.z - originPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < radius) {
                if (p.isGangster && Math.random() < 0.6) {
                    p.state = 'AGGRESSIVE';
                } else {
                    p.state = 'PANICKED';
                    p.panicTimer = 10.0;
                    p.speed = 7.2;
                    p.targetDir.set(dx, 0, dz).normalize();
                    p.facingAngle = Math.atan2(-p.targetDir.x, -p.targetDir.z);
                    p.group.rotation.y = p.facingAngle;

                    if (!p.hasCalledPolice && Math.random() < 0.35 && onPoliceCalled) {
                        p.hasCalledPolice = true;
                        onPoliceCalled(originPos);
                    }
                }
            }
        });
    }

    // Biomechanical active ragdoll with impact bracing and velocity transfer
    applyRagdollImpact(ped, hitDir, force, damage, onKilledCallback) {
        if (ped.state === 'DEAD') return;
        ped.health -= damage;

        ped.state = 'RAGDOLL';
        ped.ragdollTimer = (ped.health <= 0) ? 9999 : (1.8 + Math.random() * 1.2);
        ped.ragdollVel.copy(hitDir).multiplyScalar(force);
        ped.ragdollVel.y = Math.min(force * 0.4, 5.5);

        // Biomechanical bracing: arms reach out to absorb fall
        ped.hips.rotation.x = Math.PI / 2;
        ped.hips.rotation.z = (Math.random() - 0.5) * 0.8;
        ped.leftArm.rotation.x = -1.2 + (Math.random() - 0.5) * 0.6;
        ped.rightArm.rotation.x = -1.2 + (Math.random() - 0.5) * 0.6;
        ped.leftLeg.rotation.x = (Math.random() - 0.5) * 1.0;
        ped.rightLeg.rotation.x = (Math.random() - 0.5) * 1.0;

        if (ped.health <= 0) {
            this.killPedestrian(ped, onKilledCallback);
        }
    }

    damagePedestrian(ped, damage, attackerPos = null, onKilledCallback = null) {
        if (ped.state === 'DEAD') return;
        const hitDir = attackerPos ? ped.group.position.clone().sub(attackerPos).normalize() : new THREE.Vector3(0, 0, 1);
        this.applyRagdollImpact(ped, hitDir, 4.5, damage, onKilledCallback);
    }

    killPedestrian(ped, onKilledCallback) {
        ped.state = 'DEAD';
        ped.health = 0;

        const cashAmount = 50 + Math.floor(Math.random() * 250);
        this.spawnCashPickup(ped.group.position.x, 0.3, ped.group.position.z, cashAmount);

        if (onKilledCallback) {
            onKilledCallback(ped);
        }
    }

    spawnCashPickup(x, y, z, amount) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const cashGeo = new THREE.BoxGeometry(0.55, 0.22, 0.32);
        const cashMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
        const mesh = new THREE.Mesh(cashGeo, cashMat);
        group.add(mesh);

        this.scene.add(group);
        this.pickups.push({
            mesh: group,
            amount,
            life: 30.0
        });
    }

    update(delta, playerPos, onPlayerCollectPickup, onPoliceAlerted) {
        this.spawnTimer += delta;
        if (this.spawnTimer > 3.0) {
            this.spawnTimer = 0;
            if (this.pedestrians.length < this.maxPedestrians && playerPos) {
                this.spawnPedestrian(playerPos);
            }
        }

        const time = performance.now() * 0.008;

        for (let i = this.pedestrians.length - 1; i >= 0; i--) {
            const p = this.pedestrians[i];

            if (p.state === 'DEAD') {
                continue;
            }

            if (playerPos) {
                const distSq = (p.group.position.x - playerPos.x)**2 + (p.group.position.z - playerPos.z)**2;
                if (distSq > 200 * 200) {
                    this.scene.remove(p.group);
                    this.pedestrians.splice(i, 1);
                    continue;
                }
            }

            // RAGDOLL Physics & Recovery
            if (p.state === 'RAGDOLL') {
                p.ragdollTimer -= delta;

                p.group.position.x += p.ragdollVel.x * delta;
                p.group.position.z += p.ragdollVel.z * delta;
                p.group.position.y += p.ragdollVel.y * delta;

                p.ragdollVel.x *= (1 - 4 * delta);
                p.ragdollVel.z *= (1 - 4 * delta);
                p.ragdollVel.y -= 18 * delta;

                if (p.group.position.y <= 0) {
                    p.group.position.y = 0;
                    p.ragdollVel.y = 0;
                }

                // Balance Recovery if alive
                if (p.ragdollTimer <= 0 && p.health > 0) {
                    p.state = 'PANICKED';
                    p.panicTimer = 8.0;
                    p.speed = 6.8;
                    p.hips.rotation.x = 0;
                    p.hips.rotation.z = 0;
                    p.hips.position.y = 0.9;
                }
                continue;
            }

            if (p.state === 'PANICKED') {
                p.panicTimer -= delta;
                if (p.panicTimer <= 0) {
                    p.state = 'WALKING';
                    p.speed = 2.2;
                }
            } else if (p.state === 'WALKING') {
                p.walkTimer -= delta;
                if (p.walkTimer <= 0) {
                    p.walkTimer = 4 + Math.random() * 6;
                    p.facingAngle = Math.random() * Math.PI * 2;
                    p.targetDir.set(Math.cos(p.facingAngle), 0, Math.sin(p.facingAngle));
                    p.group.rotation.y = p.facingAngle;
                }
            } else if (p.state === 'AGGRESSIVE' && playerPos) {
                const dx = playerPos.x - p.group.position.x;
                const dz = playerPos.z - p.group.position.z;
                p.targetDir.set(dx, 0, dz).normalize();
                p.facingAngle = Math.atan2(-dx, -dz);
                p.group.rotation.y = p.facingAngle;
                p.speed = 4.6;
            }

            // Movement
            const newX = p.group.position.x + p.targetDir.x * p.speed * delta;
            const newZ = p.group.position.z + p.targetDir.z * p.speed * delta;

            const hit = this.city.checkCollision(newX, newZ, 0.4);
            if (hit) {
                p.targetDir.negate();
                p.facingAngle += Math.PI;
                p.group.rotation.y = p.facingAngle;
            } else {
                p.group.position.x = newX;
                p.group.position.z = newZ;
            }

            // Stride Animation
            const stride = Math.sin(time * (p.speed * 0.8) + p.animOffset);
            p.leftLeg.rotation.x = stride * 0.7;
            p.rightLeg.rotation.x = -stride * 0.7;
            p.leftArm.rotation.x = -stride * 0.6;
            p.rightArm.rotation.x = stride * 0.6;
        }

        for (let k = this.pickups.length - 1; k >= 0; k--) {
            const pk = this.pickups[k];
            pk.life -= delta;
            pk.mesh.rotation.y += delta * 3;

            if (playerPos) {
                const dx = pk.mesh.position.x - playerPos.x;
                const dz = pk.mesh.position.z - playerPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < 2.2) {
                    if (onPlayerCollectPickup) {
                        onPlayerCollectPickup(pk.amount);
                    }
                    this.scene.remove(pk.mesh);
                    this.pickups.splice(k, 1);
                    continue;
                }
            }

            if (pk.life <= 0) {
                this.scene.remove(pk.mesh);
                this.pickups.splice(k, 1);
            }
        }
    }
}
