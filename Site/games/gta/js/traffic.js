import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export class TrafficSimulation {
    constructor(scene, cityWorld, vehicleManager) {
        this.scene = scene;
        this.city = cityWorld;
        this.vehicles = vehicleManager;

        this.trafficCars = [];
        this.maxTrafficCars = 24;
        this.spawnTimer = 0;

        this.initTraffic();
    }

    initTraffic() {
        for (let i = 0; i < 18; i++) {
            this.spawnTrafficCar();
        }
    }

    spawnTrafficCar(nearPos = null) {
        if (this.trafficCars.length >= this.maxTrafficCars) return;

        const nodes = this.city.roadNodes;
        if (!nodes || nodes.length === 0) return;

        let node = null;
        if (nearPos) {
            const nearbyNodes = nodes.filter(n => {
                const dist = Math.sqrt((n.x - nearPos.x)**2 + (n.z - nearPos.z)**2);
                return dist > 40 && dist < 160;
            });
            if (nearbyNodes.length > 0) {
                node = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
            }
        }

        if (!node) {
            node = nodes[Math.floor(Math.random() * nodes.length)];
        }

        const types = ['sedan', 'muscle', 'suv', 'supercar'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = [0xeb4d4b, 0x30336b, 0x6ab04c, 0xf0932b, 0x130f40, 0x95afc0, 0xf9ca24, 0x2c3e50, 0xe74c3c];
        const color = colors[Math.floor(Math.random() * colors.length)];

        let rotY = 0;
        if (node.dirX === 1) rotY = -Math.PI / 2;
        else if (node.dirX === -1) rotY = Math.PI / 2;
        else if (node.dirZ === 1) rotY = Math.PI;
        else if (node.dirZ === -1) rotY = 0;

        const vData = this.vehicles.createVehicle(type, node.x, 0.5, node.z, rotY, color, "Traffic " + type.toUpperCase());

        const trafficCar = {
            vData,
            targetDirX: node.dirX,
            targetDirZ: node.dirZ,
            cruiseSpeed: 16 + Math.random() * 10,
            isPanicked: false,
            panicTimer: 0,
            honkTimer: Math.random() * 8
        };

        this.trafficCars.push(trafficCar);
    }

    triggerTrafficPanic(originPos, radius = 50) {
        this.trafficCars.forEach(tc => {
            const dx = tc.vData.group.position.x - originPos.x;
            const dz = tc.vData.group.position.z - originPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < radius) {
                tc.isPanicked = true;
                tc.panicTimer = 8.0;
                tc.cruiseSpeed = 36;
            }
        });
    }

    update(delta, playerPos) {
        this.spawnTimer += delta;
        if (this.spawnTimer > 3.0) {
            this.spawnTimer = 0;
            if (this.trafficCars.length < this.maxTrafficCars && playerPos) {
                this.spawnTrafficCar(playerPos);
            }
        }

        for (let i = this.trafficCars.length - 1; i >= 0; i--) {
            const tc = this.trafficCars[i];
            const v = tc.vData;

            if (v.isDestroyed || v.driver) {
                this.trafficCars.splice(i, 1);
                continue;
            }

            if (playerPos) {
                const distToPlayer = Math.sqrt((v.group.position.x - playerPos.x)**2 + (v.group.position.z - playerPos.z)**2);
                if (distToPlayer > 260) {
                    this.scene.remove(v.group);
                    const vIdx = this.vehicles.vehicles.indexOf(v);
                    if (vIdx !== -1) this.vehicles.vehicles.splice(vIdx, 1);
                    this.trafficCars.splice(i, 1);
                    continue;
                }
            }

            if (tc.isPanicked) {
                tc.panicTimer -= delta;
                if (tc.panicTimer <= 0) {
                    tc.isPanicked = false;
                    tc.cruiseSpeed = 18;
                }
            }

            let shouldStop = false;
            const fwdX = -Math.sin(v.group.rotation.y);
            const fwdZ = -Math.cos(v.group.rotation.y);

            // Distance checking against other vehicles
            for (let other of this.vehicles.vehicles) {
                if (other === v || other.isDestroyed) continue;
                const ox = other.group.position.x - v.group.position.x;
                const oz = other.group.position.z - v.group.position.z;
                const dot = ox * fwdX + oz * fwdZ;
                const distSq = ox * ox + oz * oz;

                if (dot > 0 && distSq < 160) {
                    shouldStop = true;
                    tc.honkTimer -= delta;
                    if (tc.honkTimer <= 0 && !tc.isPanicked) {
                        soundEngine.playHorn();
                        tc.honkTimer = 5 + Math.random() * 5;
                    }
                    break;
                }
            }

            if (shouldStop && !tc.isPanicked) {
                v.speed = Math.max(0, v.speed - 32 * delta);
            } else {
                v.speed = Math.min(tc.cruiseSpeed, v.speed + 18 * delta);
            }

            const newX = v.group.position.x + fwdX * v.speed * delta;
            const newZ = v.group.position.z + fwdZ * v.speed * delta;

            const hit = this.city.checkCollision(newX, newZ, 1.4);
            if (hit) {
                v.group.rotation.y += Math.PI / 2;
            } else {
                v.group.position.x = newX;
                v.group.position.z = newZ;
            }

            for (let w of v.wheels) {
                w.mesh.rotation.x += v.speed * 1.5 * delta;
            }
        }
    }
}
