import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export class VehicleManager {
    constructor(scene, cityWorld) {
        this.scene = scene;
        this.city = cityWorld;
        this.vehicles = [];
        this.activeVehicle = null;

        // Particle pool for exhaust, smoke, and drift
        this.particlePool = [];
        this.initParticlePool();
        this.spawnInitialWorldVehicles();
    }

    initParticlePool() {
        const pGeo = new THREE.SphereGeometry(0.2, 5, 5);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
        for (let i = 0; i < 70; i++) {
            const p = new THREE.Mesh(pGeo, pMat.clone());
            p.visible = false;
            this.scene.add(p);
            this.particlePool.push({ mesh: p, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0 });
        }
    }

    spawnParticle(x, y, z, vx, vy, vz, color = 0xffffff, scale = 1, maxLife = 0.55) {
        const p = this.particlePool.find(item => !item.mesh.visible);
        if (!p) return;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.material.color.setHex(color);
        p.mesh.material.opacity = 0.75;
        p.mesh.visible = true;
        p.life = 0;
        p.maxLife = maxLife;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
    }

    spawnInitialWorldVehicles() {
        // Spawn iconic vehicles along the grand open intersection and safe areas
        this.createVehicle('supercar', 0, 0.5, 18, 0, 0xeb4d4b, "Infernus");
        this.createVehicle('muscle', -18, 0.5, 0, Math.PI / 2, 0x30336b, "Banshee");
        this.createVehicle('sedan', 18, 0.5, 0, -Math.PI / 2, 0x6ab04c, "Sentinel");
        this.createVehicle('suv', -180, 0.5, -18, 0, 0xf0932b, "Patriot 4x4");
        this.createVehicle('bike', 6, 0.5, 24, 0, 0xbe2edd, "PCJ-600");
        this.createVehicle('tank', -270, 0.5, 270, 0, 0x4b6584, "Rhino Tank");
        this.createVehicle('helicopter', -90, 156, -90, 0, 0x2c3e50, "Hunter Chopper"); // On Maze Tower Helipad
        this.createVehicle('helicopter', -270, 0.5, 300, 0, 0x222f3e, "Airbase Chopper");
    }

    createVehicle(type, x, y, z, rotY = 0, color = 0xeb4d4b, customName = null) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotY;

        let vehicleData = {
            type,
            name: customName || type.toUpperCase(),
            group,
            health: 100,
            maxHealth: 100,
            speed: 0,
            maxSpeed: 48,
            accel: 28,
            braking: 45,
            steerAngle: 0,
            maxSteer: 0.55,
            steerSpeed: 3.5,
            nitro: 100,
            isNitroActive: false,
            wheels: [],
            rotors: [],
            turretMesh: null,
            cannonMesh: null,
            headlights: [],
            sirenLights: [],
            sirenTimer: 0,
            isSirenActive: (type === 'police' || type === 'swat'),
            altitude: y,
            pitch: 0,
            roll: 0,
            isFlying: (type === 'helicopter'),
            isDestroyed: false,
            driver: null
        };

        switch (type) {
            case 'supercar':
                this.buildSupercarMesh(group, color, vehicleData);
                vehicleData.maxSpeed = 62;
                vehicleData.accel = 36;
                break;
            case 'muscle':
                this.buildMuscleCarMesh(group, color, vehicleData);
                vehicleData.maxSpeed = 52;
                vehicleData.accel = 32;
                break;
            case 'sedan':
                this.buildSedanMesh(group, color, vehicleData);
                vehicleData.maxSpeed = 44;
                vehicleData.accel = 24;
                break;
            case 'suv':
                this.buildSUVMesh(group, color, vehicleData);
                vehicleData.maxSpeed = 40;
                vehicleData.accel = 22;
                break;
            case 'police':
                this.buildPoliceMesh(group, vehicleData);
                vehicleData.maxSpeed = 54;
                vehicleData.accel = 32;
                break;
            case 'swat':
                this.buildSWATMesh(group, vehicleData);
                vehicleData.maxSpeed = 38;
                vehicleData.accel = 20;
                vehicleData.maxHealth = 250;
                vehicleData.health = 250;
                break;
            case 'bike':
                this.buildBikeMesh(group, color, vehicleData);
                vehicleData.maxSpeed = 56;
                vehicleData.accel = 38;
                break;
            case 'tank':
                this.buildTankMesh(group, vehicleData);
                vehicleData.maxSpeed = 26;
                vehicleData.accel = 16;
                vehicleData.maxHealth = 600;
                vehicleData.health = 600;
                break;
            case 'helicopter':
                this.buildHelicopterMesh(group, color, vehicleData);
                vehicleData.maxSpeed = 45;
                vehicleData.accel = 20;
                break;
        }

        this.scene.add(group);
        this.vehicles.push(vehicleData);
        return vehicleData;
    }

    buildSupercarMesh(group, color, vData) {
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const trimMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x111122 });

        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.6), bodyMat);
        lowerBody.position.y = 0.5;
        lowerBody.castShadow = true;
        group.add(lowerBody);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), glassMat);
        cabin.position.set(0, 0.95, -0.2);
        group.add(cabin);

        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.6), trimMat);
        wing.position.set(0, 1.15, 2.1);
        group.add(wing);

        this.addCarWheels(group, vData, 1.05, 1.45, 0.42);
        this.addHeadlights(group, vData, 0.85, 0.55, -2.3);
    }

    buildMuscleCarMesh(group, color, vData) {
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const chromeMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x222233 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.8), bodyMat);
        body.position.y = 0.65;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.4), glassMat);
        cabin.position.set(0, 1.2, 0.1);
        group.add(cabin);

        const blower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), chromeMat);
        blower.position.set(0, 1.15, -1.3);
        group.add(blower);

        this.addCarWheels(group, vData, 1.1, 1.5, 0.46);
        this.addHeadlights(group, vData, 0.9, 0.65, -2.4);
    }

    buildSedanMesh(group, color, vData) {
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x334455 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.4), bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.4), glassMat);
        cabin.position.set(0, 1.15, -0.1);
        group.add(cabin);

        this.addCarWheels(group, vData, 1.0, 1.4, 0.42);
        this.addHeadlights(group, vData, 0.8, 0.6, -2.2);
    }

    buildSUVMesh(group, color, vData) {
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x223344 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 5.0), bodyMat);
        body.position.y = 0.95;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 3.2), glassMat);
        cabin.position.set(0, 1.7, 0.1);
        group.add(cabin);

        this.addCarWheels(group, vData, 1.2, 1.6, 0.52);
        this.addHeadlights(group, vData, 0.95, 0.9, -2.5);
    }

    buildPoliceMesh(group, vData) {
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x222233 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 4.6), whiteMat);
        body.position.y = 0.65;
        body.castShadow = true;
        group.add(body);

        const hood = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.2, 1.4), blackMat);
        hood.position.set(0, 0.95, -1.5);
        group.add(hood);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.4), glassMat);
        cabin.position.set(0, 1.25, 0.0);
        group.add(cabin);

        // Lightbar
        const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.38), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        redLight.position.set(-0.35, 1.65, 0.0);
        const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.38), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        blueLight.position.set(0.35, 1.65, 0.0);
        group.add(redLight, blueLight);
        vData.sirenLights = [redLight, blueLight];

        this.addCarWheels(group, vData, 1.05, 1.45, 0.44);
        this.addHeadlights(group, vData, 0.85, 0.65, -2.3);
    }

    buildSWATMesh(group, vData) {
        const armorMat = new THREE.MeshLambertMaterial({ color: 0x2c3a47 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 5.6), armorMat);
        body.position.y = 1.2;
        body.castShadow = true;
        group.add(body);

        const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        redLight.position.set(-0.8, 2.1, 0.5);
        const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        blueLight.position.set(0.8, 2.1, 0.5);
        group.add(redLight, blueLight);
        vData.sirenLights = [redLight, blueLight];

        this.addCarWheels(group, vData, 1.3, 1.8, 0.58);
        this.addHeadlights(group, vData, 1.0, 1.1, -2.8);
    }

    buildBikeMesh(group, color, vData) {
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 2.0), bodyMat);
        frame.position.y = 0.7;
        group.add(frame);

        const wGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8);
        wGeo.rotateZ(Math.PI / 2);
        const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        const frontWheel = new THREE.Mesh(wGeo, wMat);
        frontWheel.position.set(0, 0.42, -1.1);
        const rearWheel = new THREE.Mesh(wGeo, wMat);
        rearWheel.position.set(0, 0.42, 1.1);
        group.add(frontWheel, rearWheel);
        vData.wheels = [frontWheel, rearWheel];

        this.addHeadlights(group, vData, 0.0, 0.75, -1.2);
    }

    buildTankMesh(group, vData) {
        const tankMat = new THREE.MeshLambertMaterial({ color: 0x576574 });

        const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.3, 6.2), tankMat);
        hull.position.y = 1.0;
        hull.castShadow = true;
        group.add(hull);

        [-1.7, 1.7].forEach(tx => {
            const tread = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 6.4), new THREE.MeshLambertMaterial({ color: 0x1e272e }));
            tread.position.set(tx, 0.55, 0);
            group.add(tread);
        });

        // 360 Rotating Turret
        const turret = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.8), tankMat);
        turret.position.set(0, 1.95, -0.2);
        turret.castShadow = true;
        group.add(turret);
        vData.turretMesh = turret;

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4.5, 8), tankMat);
        barrel.rotateX(-Math.PI / 2);
        barrel.position.set(0, 0.1, -2.4);
        barrel.castShadow = true;
        turret.add(barrel);
        vData.cannonMesh = barrel;
    }

    buildHelicopterMesh(group, color, vData) {
        const heliMat = new THREE.MeshLambertMaterial({ color });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 5.0), heliMat);
        body.position.y = 1.6;
        body.castShadow = true;
        group.add(body);

        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 1.6), glassMat);
        cockpit.position.set(0, 1.7, -1.8);
        group.add(cockpit);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 4.5), heliMat);
        tail.position.set(0, 1.8, 4.0);
        group.add(tail);

        const mainRotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 6), heliMat);
        mainRotorHub.position.set(0, 2.7, 0);
        const blades = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        blades.position.y = 0.3;
        mainRotorHub.add(blades);
        group.add(mainRotorHub);

        const tailRotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 6), heliMat);
        tailRotorHub.rotateZ(Math.PI / 2);
        tailRotorHub.position.set(0.35, 2.0, 6.2);
        const tailBlades = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.2), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        tailRotorHub.add(tailBlades);
        group.add(tailRotorHub);

        vData.rotors = [mainRotorHub, tailRotorHub];

        [-1.1, 1.1].forEach(sx => {
            const skid = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 4.2), heliMat);
            skid.position.set(sx, 0.4, 0);
            group.add(skid);
        });
    }

    addCarWheels(group, vData, halfW, halfL, radius) {
        const wGeo = new THREE.CylinderGeometry(radius, radius, 0.38, 8);
        wGeo.rotateZ(Math.PI / 2);
        const wMat = new THREE.MeshLambertMaterial({ color: 0x1e272e });

        const offsets = [
            { x: -halfW, z: -halfL, isFront: true },
            { x: halfW, z: -halfL, isFront: true },
            { x: -halfW, z: halfL, isFront: false },
            { x: halfW, z: halfL, isFront: false }
        ];

        offsets.forEach(off => {
            const wheel = new THREE.Mesh(wGeo, wMat);
            wheel.position.set(off.x, radius, off.z);
            wheel.castShadow = true;
            group.add(wheel);
            vData.wheels.push({ mesh: wheel, isFront: off.isFront });
        });
    }

    addHeadlights(group, vData, halfW, y, z) {
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff9e6 });
        const bulbGeo = new THREE.SphereGeometry(0.18, 5, 5);

        [-halfW, halfW].forEach(x => {
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(x, y, z);
            group.add(bulb);
            vData.headlights.push(bulb);
        });
    }

    // ----------------------------------------------------
    // CAR JACKING & INTERACTION LOGIC
    // ----------------------------------------------------
    jackNearestVehicle(playerPos, onCarJackSuccess) {
        const nearest = this.findNearestVehicle(playerPos, 5.5);
        if (!nearest) return null;

        // If occupied by an NPC driver, eject them
        if (nearest.npcDriver) {
            const npc = nearest.npcDriver;
            nearest.npcDriver = null;
            if (onCarJackSuccess) onCarJackSuccess(npc, nearest);
        }

        return nearest;
    }

    // ----------------------------------------------------
    // VEHICLE PHYSICS & CONTROL LOOP
    // ----------------------------------------------------
    update(delta, input) {
        for (let p of this.particlePool) {
            if (p.mesh.visible) {
                p.life += delta;
                if (p.life >= p.maxLife) {
                    p.mesh.visible = false;
                } else {
                    p.mesh.position.x += p.vx * delta;
                    p.mesh.position.y += p.vy * delta;
                    p.mesh.position.z += p.vz * delta;
                    const ratio = 1 - (p.life / p.maxLife);
                    p.mesh.material.opacity = ratio * 0.75;
                }
            }
        }

        for (let v of this.vehicles) {
            if (v.isDestroyed) continue;

            if (v.isSirenActive && v.sirenLights.length >= 2) {
                v.sirenTimer += delta * 6;
                const isRed = Math.floor(v.sirenTimer) % 2 === 0;
                v.sirenLights[0].material.color.setHex(isRed ? 0xff0000 : 0x220000);
                v.sirenLights[1].material.color.setHex(!isRed ? 0x0000ff : 0x000022);
            }

            // Damage smoke & flame
            if (v.health < 50) {
                const smokeColor = v.health < 20 ? 0xff4757 : 0x555555;
                this.spawnParticle(
                    v.group.position.x + (Math.random() - 0.5) * 0.8,
                    v.group.position.y + 0.8,
                    v.group.position.z + (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 2,
                    3 + Math.random() * 3,
                    (Math.random() - 0.5) * 2,
                    smokeColor,
                    v.health < 20 ? 1.2 : 0.8,
                    0.6
                );
            }

            if (v === this.activeVehicle) {
                this.updatePlayerVehicle(v, delta, input);
            } else if (v.isFlying) {
                if (v.rotors.length > 0) {
                    v.rotors[0].rotation.y += delta * 2;
                    v.rotors[1].rotation.x += delta * 2;
                }
            }
        }
    }

    updatePlayerVehicle(v, delta, input) {
        if (v.type === 'helicopter') {
            this.updateHelicopterPhysics(v, delta, input);
            return;
        }

        let throttle = 0;
        if (input.forward) throttle += 1;
        if (input.backward) throttle -= 0.65;

        let steer = 0;
        if (input.left) steer += 1;
        if (input.right) steer -= 1;

        // Nitro Boost [Shift]
        let isBoosting = false;
        if (input.sprint && v.nitro > 0 && throttle > 0) {
            isBoosting = true;
            v.nitro = Math.max(0, v.nitro - delta * 28);
            v.speed = Math.min(v.speed + v.accel * 2.2 * delta, v.maxSpeed * 1.35);

            const exX = Math.sin(v.group.rotation.y) * 2.2;
            const exZ = Math.cos(v.group.rotation.y) * 2.2;
            this.spawnParticle(
                v.group.position.x + exX,
                v.group.position.y + 0.4,
                v.group.position.z + exZ,
                exX * 3, 0.4, exZ * 3,
                0x00d2d3, 1.0, 0.35
            );
        } else {
            v.nitro = Math.min(100, v.nitro + delta * 12);
        }

        if (throttle > 0) {
            v.speed = Math.min(v.speed + v.accel * delta, v.maxSpeed);
        } else if (throttle < 0) {
            v.speed = Math.max(v.speed - v.braking * delta, -v.maxSpeed * 0.4);
        } else {
            if (v.speed > 0) v.speed = Math.max(0, v.speed - 15 * delta);
            else if (v.speed < 0) v.speed = Math.min(0, v.speed + 15 * delta);
        }

        // Handbrake Drift [Space]
        let isDrifting = false;
        if (input.handbrake && Math.abs(v.speed) > 8) {
            isDrifting = true;
            v.speed *= (1 - 0.45 * delta);
            const rearX = Math.sin(v.group.rotation.y) * 1.5;
            const rearZ = Math.cos(v.group.rotation.y) * 1.5;
            this.spawnParticle(
                v.group.position.x + rearX,
                0.2,
                v.group.position.z + rearZ,
                (Math.random() - 0.5) * 2, 0.4, (Math.random() - 0.5) * 2,
                0xeeeeee, 0.75, 0.45
            );
            soundEngine.updateSkidSound(0.75);
        } else {
            soundEngine.updateSkidSound(0.0);
        }

        // Steer angle
        const speedRatio = Math.abs(v.speed) / v.maxSpeed;
        const targetSteer = steer * v.maxSteer * (1.1 - speedRatio * 0.35);
        v.steerAngle += (targetSteer - v.steerAngle) * v.steerSpeed * delta;

        if (Math.abs(v.speed) > 0.5) {
            const turnMult = v.speed > 0 ? 1 : -1;
            const driftBonus = isDrifting ? 1.7 : 1.0;
            v.group.rotation.y += v.steerAngle * turnMult * (v.speed / v.maxSpeed) * 3.2 * driftBonus * delta;
        }

        const forwardX = -Math.sin(v.group.rotation.y);
        const forwardZ = -Math.cos(v.group.rotation.y);
        const newX = v.group.position.x + forwardX * v.speed * delta;
        const newZ = v.group.position.z + forwardZ * v.speed * delta;

        // Collision against buildings
        const hitBuilding = this.city.checkCollision(newX, newZ, 1.5);
        if (hitBuilding) {
            const crashSeverity = Math.min(Math.abs(v.speed) / 20, 2.0);
            if (crashSeverity > 0.35) {
                soundEngine.playCarCrash(crashSeverity);
                v.health -= Math.floor(crashSeverity * 10);
                if (v.health <= 0) this.destroyVehicle(v);
            }
            v.speed = -v.speed * 0.3;
        } else {
            v.group.position.x = newX;
            v.group.position.z = newZ;
        }

        // Stunt ramps
        for (let ramp of this.city.stuntRamps) {
            const dx = v.group.position.x - ramp.x;
            const dz = v.group.position.z - ramp.z;
            if (Math.sqrt(dx * dx + dz * dz) < 4.2 && v.speed > 16) {
                v.group.position.y += 11 * delta;
            }
        }
        if (v.group.position.y > 0.5) {
            v.group.position.y = Math.max(0.5, v.group.position.y - 18 * delta);
        }

        // Spin wheels
        for (let w of v.wheels) {
            if (w.isFront) {
                w.mesh.rotation.y = v.steerAngle;
            }
            w.mesh.rotation.x += (v.speed * 1.5) * delta;
        }

        soundEngine.updateEngineSound(speedRatio, throttle !== 0, isBoosting);
    }

    updateHelicopterPhysics(v, delta, input) {
        if (v.rotors.length > 0) {
            v.rotors[0].rotation.y += delta * 30;
            v.rotors[1].rotation.x += delta * 30;
        }

        if (input.forward) v.altitude += 20 * delta;
        if (input.backward) v.altitude = Math.max(0.6, v.altitude - 16 * delta);

        if (input.left) v.group.rotation.y += 2.0 * delta;
        if (input.right) v.group.rotation.y -= 2.0 * delta;

        let pitch = 0;
        let roll = 0;
        if (input.forward) pitch = -0.22;
        if (input.backward) pitch = 0.16;
        if (input.left) roll = -0.2;
        if (input.right) roll = 0.2;

        v.pitch += (pitch - v.pitch) * 4 * delta;
        v.roll += (roll - v.roll) * 4 * delta;
        v.group.rotation.x = v.pitch;
        v.group.rotation.z = v.roll;

        if (v.altitude > 1.2) {
            const fX = -Math.sin(v.group.rotation.y) * 26 * -v.pitch;
            const fZ = -Math.cos(v.group.rotation.y) * 26 * -v.pitch;
            v.group.position.x += fX * delta;
            v.group.position.z += fZ * delta;
        }

        v.group.position.y += (v.altitude - v.group.position.y) * 4 * delta;
        soundEngine.updateEngineSound(0.85, true, false);
    }

    destroyVehicle(v) {
        if (v.isDestroyed) return;
        v.isDestroyed = true;
        v.health = 0;
        v.speed = 0;

        soundEngine.playExplosion();
        for (let i = 0; i < 25; i++) {
            this.spawnParticle(
                v.group.position.x + (Math.random() - 0.5) * 2,
                v.group.position.y + Math.random() * 2,
                v.group.position.z + (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 10,
                4 + Math.random() * 8,
                (Math.random() - 0.5) * 10,
                Math.random() > 0.5 ? 0xff4757 : 0xffa502,
                1.6,
                1.0
            );
        }

        v.group.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = new THREE.MeshLambertMaterial({ color: 0x111111 });
            }
        });
    }

    findNearestVehicle(playerPos, maxDist = 6.0) {
        let nearest = null;
        let minDist = maxDist;
        for (let v of this.vehicles) {
            if (v.isDestroyed) continue;
            const dx = v.group.position.x - playerPos.x;
            const dy = v.group.position.y - playerPos.y;
            const dz = v.group.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < minDist) {
                minDist = dist;
                nearest = v;
            }
        }
        return nearest;
    }
}
