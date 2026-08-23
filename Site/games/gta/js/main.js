import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';
import { WeatherSystem } from './weather.js';
import { CityWorld } from './city.js';
import { VehicleManager } from './vehicles.js';
import { WeaponManager } from './weapons.js';
import { PlayerCharacter } from './player.js';
import { TrafficSimulation } from './traffic.js';
import { PedestrianSystem } from './pedestrians.js';
import { PoliceSystem } from './police.js';
import { MissionManager, STORY_MISSIONS } from './missions.js';
import { CheatSystem } from './cheats.js';
import { UIManager } from './ui.js';

class GrandTheftAutoGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.canvas = document.getElementById('renderCanvas');

        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.timeScale = 1.0;
        this.isRunning = false;

        // Camera System
        this.cameraMode = 'third_person'; // 'third_person', 'first_person', 'top_down', 'cinematic'
        this.cameraDist = 6.5;
        this.cameraHeight = 2.8;
        this.cameraYaw = 0;
        this.cameraPitch = 0.25;

        // Aim Target
        this.aimWorldTarget = new THREE.Vector3();

        // Input state
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            moveX: 0,
            moveZ: 0,
            jump: false,
            sprint: false,
            crouch: false,
            handbrake: false,
            shoot: false,
            aim: false
        };

        // Subsystems
        this.weather = null;
        this.city = null;
        this.vehicles = null;
        this.weapons = null;
        this.player = null;
        this.traffic = null;
        this.pedestrians = null;
        this.police = null;
        this.missions = null;
        this.cheats = null;
        this.ui = null;

        this.initEngine();
        this.initInput();
    }

    initEngine() {
        this.canvas = document.getElementById('renderCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'renderCanvas';
            const cont = document.getElementById('game-container') || document.body;
            cont.appendChild(this.canvas);
        }

        const width = window.innerWidth || 1280;
        const height = window.innerHeight || 720;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x3498db);

        // 2. Camera with extended 2800m view distance
        this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2800);
        this.camera.position.set(0, 4, 12);

        // 3. Renderer with high performance & safe fallbacks
        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                powerPreference: 'high-performance'
            });
        } catch (e) {
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        }

        this.renderer.setSize(width, height);
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // 4. Subsystems
        this.weather = new WeatherSystem(this.scene, this.renderer);
        this.city = new CityWorld(this.scene, this.weather);
        this.vehicles = new VehicleManager(this.scene, this.city);
        this.weapons = new WeaponManager(this.scene, this.camera);
        this.player = new PlayerCharacter(this.scene, this.city, this.vehicles, this.weapons);
        this.traffic = new TrafficSimulation(this.scene, this.city, this.vehicles);
        this.pedestrians = new PedestrianSystem(this.scene, this.city);
        this.police = new PoliceSystem(this.scene, this.city, this.vehicles, this.weapons);
        this.missions = new MissionManager(this.scene, this.city, this.player, this.vehicles, this.police, this.weapons);
        this.cheats = new CheatSystem(this);
        this.ui = new UIManager(this);

        this.applyGraphicsSettings(this.ui.graphicsQuality);

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('orientationchange', () => setTimeout(() => this.onWindowResize(), 150));

        console.log("APEX CITY: OVERDRIVE Engine Loaded.");
    }

    applyGraphicsSettings(quality) {
        if (!this.renderer) return;

        if (quality === 'low') {
            this.renderer.setPixelRatio(1.0);
            this.renderer.shadowMap.enabled = false;
            this.camera.far = 1000;
            this.camera.updateProjectionMatrix();
            if (this.traffic) this.traffic.maxTrafficCars = 10;
            if (this.pedestrians) this.pedestrians.maxPedestrians = 12;
        } else if (quality === 'medium') {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.BasicShadowMap;
            this.camera.far = 1600;
            this.camera.updateProjectionMatrix();
            if (this.traffic) this.traffic.maxTrafficCars = 18;
            if (this.pedestrians) this.pedestrians.maxPedestrians = 22;
        } else if (quality === 'high') {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.camera.far = 2200;
            this.camera.updateProjectionMatrix();
            if (this.traffic) this.traffic.maxTrafficCars = 24;
            if (this.pedestrians) this.pedestrians.maxPedestrians = 30;
        } else if (quality === 'ultra') {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.camera.far = 2800;
            this.camera.updateProjectionMatrix();
            if (this.traffic) this.traffic.maxTrafficCars = 30;
            if (this.pedestrians) this.pedestrians.maxPedestrians = 36;
        }

        if (this.weather) {
            this.weather.setGraphicsQuality(quality);
        }

        this.onWindowResize();
    }

    start() {
        if (this.isRunning) return;

        try {
            soundEngine.init();
        } catch(e) {}

        const intro = document.getElementById('intro-screen');
        if (intro) intro.style.display = 'none';

        this.isRunning = true;
        this.clock.start();

        try {
            const m = this.missions.startStoryMission(0);
            if (m) {
                this.ui.showMissionBanner(m.title, m.dialogue);
            }
        } catch(e) {}

        try {
            const r = soundEngine.setRadioStation(0);
            this.ui.showRadioHUD(r);
        } catch(e) {}

        this.animate();
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            const code = e.code;
            if (code === 'KeyW' || code === 'ArrowUp') this.input.forward = true;
            if (code === 'KeyS' || code === 'ArrowDown') this.input.backward = true;
            if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = true;
            if (code === 'KeyD' || code === 'ArrowRight') this.input.right = true;
            if (code === 'Space') {
                this.input.jump = true;
                this.input.handbrake = true;
            }
            if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.sprint = true;
            if (code === 'ControlLeft' || code === 'KeyC') {
                this.input.crouch = true;
                this.player.performRoll();
            }

            // Smart Car Jacking / Enter Vehicle [F] or [E]
            if (code === 'KeyF' || code === 'KeyE') {
                if (!this.player.inVehicle) {
                    this.vehicles.jackNearestVehicle(this.player.position, (npc) => {
                        this.pedestrians.damagePedestrian(npc, 10, this.player.position);
                    });
                }
                this.player.toggleVehicle();
            }

            // Reload [R]
            if (code === 'KeyR') {
                this.weapons.reload();
            }

            // Cycle Camera View [V]
            if (code === 'KeyV') {
                this.cycleCamera();
            }

            // Next Radio Station [Q]
            if (code === 'KeyQ') {
                const st = soundEngine.nextRadioStation();
                this.ui.showRadioHUD(st);
            }

            // Toggle Full City Map [M]
            if (code === 'KeyM') {
                this.ui.toggleMapModal();
            }

            // Escape key closes modals
            if (code === 'Escape') {
                this.ui.closeSettingsModal();
                this.ui.closeCheatsModal();
                this.ui.closeMapModal();
                this.ui.hideWeaponWheel();
            }

            // Weapon Selector Wheel [Tab]
            if (code === 'Tab') {
                e.preventDefault();
                this.ui.showWeaponWheel();
            }

            // Quick Weapon Select (1-8)
            if (e.key >= '1' && e.key <= '8') {
                const num = parseInt(e.key) - 1;
                this.weapons.selectWeapon(num);
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code;
            if (code === 'KeyW' || code === 'ArrowUp') this.input.forward = false;
            if (code === 'KeyS' || code === 'ArrowDown') this.input.backward = false;
            if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = false;
            if (code === 'KeyD' || code === 'ArrowRight') this.input.right = false;
            if (code === 'Space') {
                this.input.jump = false;
                this.input.handbrake = false;
            }
            if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.sprint = false;
            if (code === 'ControlLeft' || code === 'KeyC') this.input.crouch = false;

            if (code === 'Tab') {
                this.ui.hideWeaponWheel();
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (!this.isRunning) return;
            if (e.target.closest('#top-controls') || e.target.closest('.modal-overlay') || e.target.closest('#touch-controls')) {
                return;
            }
            if (e.button === 0) {
                this.input.shoot = true;
            } else if (e.button === 2) {
                this.input.aim = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.input.shoot = false;
            if (e.button === 2) this.input.aim = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('mousemove', (e) => {
            if (!this.isRunning) return;
            const sensitivity = 0.003;
            this.cameraYaw -= e.movementX * sensitivity;
            this.cameraPitch = Math.min(Math.max(this.cameraPitch + e.movementY * sensitivity, -0.25), 1.2);
        });

        window.addEventListener('wheel', (e) => {
            if (!this.isRunning) return;
            const cur = this.weapons.currentWeaponIndex;
            const dir = e.deltaY > 0 ? 1 : -1;
            let next = (cur + dir + this.weapons.inventory.length) % this.weapons.inventory.length;
            this.weapons.selectWeapon(next);
        });
    }

    cycleCamera() {
        const modes = ['third_person', 'first_person', 'top_down', 'cinematic'];
        const curIdx = modes.indexOf(this.cameraMode);
        this.cameraMode = modes[(curIdx + 1) % modes.length];
        this.ui.showNotification(`CAMERA MODE: ${this.cameraMode.toUpperCase().replace('_', ' ')}`);

        if (this.cameraMode === 'first_person') {
            this.player.group.visible = false;
        } else {
            this.player.group.visible = !this.player.inVehicle;
        }
    }

    handleCombatRaycast(origin, direction, damage, range) {
        // 1. Pedestrians
        for (let ped of this.pedestrians.pedestrians) {
            if (ped.state === 'DEAD') continue;
            const pedPos = ped.group.position.clone().add(new THREE.Vector3(0, 1.0, 0));
            const toPed = pedPos.clone().sub(origin);
            const distAlongRay = toPed.dot(direction);

            if (distAlongRay > 0 && distAlongRay < range) {
                const closestPoint = origin.clone().add(direction.clone().multiplyScalar(distAlongRay));
                const distToRay = closestPoint.distanceTo(pedPos);

                if (distToRay < 1.2) {
                    this.ui.triggerHitMarker();
                    this.pedestrians.damagePedestrian(ped, damage, origin, () => {
                        this.police.reportCrime(2, this.player.position);
                    });
                    return;
                }
            }
        }

        // 2. Vehicles
        for (let v of this.vehicles.vehicles) {
            if (v.isDestroyed || v === this.player.inVehicle) continue;
            const vPos = v.group.position.clone().add(new THREE.Vector3(0, 0.8, 0));
            const toV = vPos.clone().sub(origin);
            const distAlongRay = toV.dot(direction);

            if (distAlongRay > 0 && distAlongRay < range) {
                const closestPoint = origin.clone().add(direction.clone().multiplyScalar(distAlongRay));
                if (closestPoint.distanceTo(vPos) < 2.5) {
                    this.ui.triggerHitMarker();
                    v.health -= damage;
                    if (v.health <= 0) {
                        this.vehicles.destroyVehicle(v);
                        this.police.reportCrime(3, this.player.position);
                    }
                    return;
                }
            }
        }

        // 3. Props & Gas Pumps
        for (let prop of this.city.destructibleProps) {
            if (prop.isDestroyed) continue;
            const pPos = new THREE.Vector3(prop.x, 0.6, prop.z);
            const toP = pPos.clone().sub(origin);
            const dist = toP.dot(direction);
            if (dist > 0 && dist < range) {
                const cp = origin.clone().add(direction.clone().multiplyScalar(dist));
                if (cp.distanceTo(pPos) < prop.radius + 0.5) {
                    if (prop.type === 'hydrant') {
                        this.city.triggerHydrantBlast(prop);
                    }
                    return;
                }
            }
        }

        for (let pump of this.city.gasPumps) {
            if (pump.exploded) continue;
            const pPos = new THREE.Vector3(pump.x, 1.2, pump.z);
            const toPump = pPos.clone().sub(origin);
            const dist = toPump.dot(direction);
            if (dist > 0 && dist < range) {
                const cp = origin.clone().add(direction.clone().multiplyScalar(dist));
                if (cp.distanceTo(pPos) < 1.4) {
                    this.city.triggerGasPumpExplosion(pump, (x, y, z, r, dmg) => {
                        this.weapons.createExplosion(x, y, z, r, dmg, (pos, radius, d) => this.handleExplosionAoE(pos, radius, d));
                    });
                    return;
                }
            }
        }
    }

    handleExplosionAoE(origin, radius, damage) {
        const distToPlayer = this.player.position.distanceTo(origin);
        if (distToPlayer < radius) {
            const dmgRatio = 1 - (distToPlayer / radius);
            this.player.takeDamage(damage * dmgRatio);
        }

        this.pedestrians.pedestrians.forEach(ped => {
            if (ped.state === 'DEAD') return;
            const dist = ped.group.position.distanceTo(origin);
            if (dist < radius) {
                const hitDir = ped.group.position.clone().sub(origin).normalize();
                this.pedestrians.applyRagdollImpact(ped, hitDir, 8.0, damage, () => {
                    this.police.reportCrime(2, origin);
                });
            }
        });

        this.vehicles.vehicles.forEach(v => {
            if (v.isDestroyed) return;
            const dist = v.group.position.distanceTo(origin);
            if (dist < radius) {
                const dmgRatio = 1 - (dist / radius);
                v.health -= damage * dmgRatio;
                if (v.health <= 0) this.vehicles.destroyVehicle(v);
            }
        });

        this.police.reportCrime(3, origin);
    }

    // ----------------------------------------------------
    // CAMERA SYSTEM WITH FIXED TRUE FIRST-PERSON & ORBITAL
    // ----------------------------------------------------
    updateCamera(delta) {
        const pPos = this.player.position;
        const inVeh = this.player.inVehicle;

        // TRUE FIRST PERSON CAMERA (FIXED)
        if (this.cameraMode === 'first_person') {
            this.player.group.visible = false; // Hide body in FPS mode so nothing blocks view

            const cosP = Math.cos(this.cameraPitch);
            const lookX = -Math.sin(this.cameraYaw) * cosP;
            const lookY = Math.sin(this.cameraPitch);
            const lookZ = -Math.cos(this.cameraYaw) * cosP;

            if (inVeh) {
                const eyeX = inVeh.group.position.x;
                const eyeY = inVeh.group.position.y + 1.15;
                const eyeZ = inVeh.group.position.z;
                this.camera.position.set(eyeX, eyeY, eyeZ);
                this.camera.lookAt(eyeX + lookX * 10, eyeY + lookY * 10, eyeZ + lookZ * 10);
            } else {
                const eyeX = pPos.x;
                const eyeY = pPos.y + 1.6;
                const eyeZ = pPos.z;
                this.camera.position.set(eyeX, eyeY, eyeZ);
                this.camera.lookAt(eyeX + lookX * 10, eyeY + lookY * 10, eyeZ + lookZ * 10);
            }

            this.aimWorldTarget.set(this.camera.position.x + lookX * 50, this.camera.position.y + lookY * 50, this.camera.position.z + lookZ * 50);
            return;
        }

        // TOP-DOWN CAMERA
        if (this.cameraMode === 'top_down') {
            this.player.group.visible = !inVeh;
            this.camera.position.set(pPos.x, pPos.y + 35, pPos.z + 0.1);
            this.camera.lookAt(pPos.x, pPos.y, pPos.z);
            return;
        }

        // DYNAMIC THIRD-PERSON CHASE CAMERA
        this.player.group.visible = !inVeh;

        let targetYaw = this.cameraYaw;
        let dist = this.cameraDist;
        let height = this.cameraHeight;

        if (inVeh) {
            if (inVeh.type === 'helicopter') {
                dist = 14;
                height = 5.5;
            } else {
                dist = 8.5;
                height = 3.0;
                if (Math.abs(inVeh.speed) > 8) {
                    const carYaw = inVeh.group.rotation.y;
                    this.cameraYaw += (carYaw - this.cameraYaw) * 1.5 * delta;
                    targetYaw = this.cameraYaw;
                }
            }
        }

        const camX = pPos.x + Math.sin(targetYaw) * dist * Math.cos(this.cameraPitch);
        const camZ = pPos.z + Math.cos(targetYaw) * dist * Math.cos(this.cameraPitch);
        const camY = pPos.y + height + Math.sin(this.cameraPitch) * dist;

        this.camera.position.lerp(new THREE.Vector3(camX, Math.max(camY, 1.2), camZ), 0.18);
        this.camera.lookAt(pPos.x, pPos.y + 1.3, pPos.z);

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -pPos.y);
        const intersect = new THREE.Vector3();
        if (ray.ray.intersectPlane(groundPlane, intersect)) {
            this.aimWorldTarget.copy(intersect);
        }
    }

    onWindowResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const rawDelta = Math.min(this.clock.getDelta(), 0.1);
        const delta = rawDelta * this.timeScale;

        this.weather.update(delta, this.player.position);
        this.city.update(delta);
        this.vehicles.update(delta, this.input);
        this.player.update(
            delta,
            this.input,
            this.cameraYaw,
            this.aimWorldTarget,
            (origin, dir, dmg, range) => this.handleCombatRaycast(origin, dir, dmg, range)
        );
        this.weapons.update(
            delta,
            (x, z, r) => this.city.checkCollision(x, z, r),
            (pos, rad, dmg) => this.handleExplosionAoE(pos, rad, dmg)
        );
        this.traffic.update(delta, this.player.position);
        this.pedestrians.update(
            delta,
            this.player.position,
            (amount) => { this.player.addMoney(amount); },
            (pos) => { this.police.reportCrime(1, pos); }
        );
        this.police.update(
            delta,
            this.player,
            (dmg) => { this.player.takeDamage(dmg); },
            () => { this.player.triggerBusted(); }
        );
        this.missions.update(delta, this.player.position, (title, reward) => {
            this.ui.showMissionPassedOverlay(title, reward);
        });
        this.ui.update(delta);

        this.updateCamera(delta);
        this.renderer.render(this.scene, this.camera);
    }
}

function initGame() {
    if (window.__GTA_INITIALIZED__) return;
    window.__GTA_INITIALIZED__ = true;

    const game = new GrandTheftAutoGame();
    window.gtaGame = game;

    const attachBtn = (id, cb) => {
        const el = document.getElementById(id);
        if (!el) return;
        const trigger = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            cb();
        };
        el.addEventListener('click', trigger);
        el.addEventListener('touchend', trigger);
        el.addEventListener('pointerdown', trigger);
    };

    attachBtn('play-btn', () => game.start());

    // Top Bar Modal Openers
    attachBtn('open-settings-btn', () => game.ui.openSettingsModal());
    attachBtn('open-map-btn', () => game.ui.openMapModal());
    attachBtn('open-cheats-btn', () => game.ui.openCheatsModal());

    // Modal Close Buttons
    attachBtn('close-settings-btn', () => game.ui.closeSettingsModal());
    attachBtn('close-map-btn', () => game.ui.closeMapModal());
    attachBtn('close-cheats-btn', () => game.ui.closeCheatsModal());
    attachBtn('close-wheel-btn', () => game.ui.hideWeaponWheel());

    // Top Bar Mission Jobs
    attachBtn('btn-job-taxi', () => {
        const m = game.missions.startTaxiMission();
        game.ui.showMissionBanner(m.title, m.objective);
    });

    attachBtn('btn-job-vigilante', () => {
        const m = game.missions.startVigilanteMission();
        game.ui.showMissionBanner(m.title, m.objective);
    });

    attachBtn('btn-job-racing', () => {
        const m = game.missions.startStreetRace();
        game.ui.showMissionBanner(m.title, m.objective);
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
