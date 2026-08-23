import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export const STORY_MISSIONS = [
    {
        id: 1,
        title: "The Repo Job",
        giver: "Vlad",
        dialogue: "A high-roller failed to pay his debt. His custom red Infernus is parked at Ocean Drive. Steal it, lose the heat, and deliver it to our docks chop shop!",
        stage: 0,
        rewardCash: 15000,
        checkpoints: [
            { x: 350, z: 0, desc: "Go to Ocean Drive & Steal the Supercar", type: "steal_car" },
            { x: 100, z: 270, desc: "Deliver the car to the Docks Chop Shop", type: "deliver_car" }
        ]
    },
    {
        id: 2,
        title: "Docks Firefight",
        giver: "El Toro",
        dialogue: "Rival cartel goons are guarding contraband crates at the warehouse. Take out 6 guards and destroy the 3 weapon caches!",
        stage: 0,
        rewardCash: 25000,
        checkpoints: [
            { x: 200, z: 270, desc: "Eliminate Cartel Guards & Destroy 3 Weapon Crates", type: "eliminate_targets", targetCount: 6 }
        ]
    },
    {
        id: 3,
        title: "Armored Highway Heist",
        giver: "The Boss",
        dialogue: "An armored bank transport with half a million dollars is moving across the central avenue. Stop the truck, hijack it, and deliver the loot to our safehouse!",
        stage: 0,
        rewardCash: 50000,
        checkpoints: [
            { x: 0, z: -180, desc: "Intercept & Hijack the Armored Bank Van", type: "hijack_van" },
            { x: -270, z: -270, desc: "Deliver Cash to the Suburb Safehouse", type: "deliver_loot" }
        ]
    },
    {
        id: 4,
        title: "Airborne Mayhem",
        giver: "Captain Miller",
        dialogue: "Infiltrate the military airbase, steal the Attack Chopper, destroy the 3 rooftop radio antennas downtown, and land on Maze Tower helipad!",
        stage: 0,
        rewardCash: 75000,
        checkpoints: [
            { x: -270, z: 270, desc: "Steal the Hunter Attack Chopper from the Airbase", type: "steal_heli" },
            { x: -90, z: -90, desc: "Land on Maze Tower Rooftop Helipad", type: "land_helipad" }
        ]
    },
    {
        id: 5,
        title: "The Kingpin's Last Stand",
        giver: "Don Falcone",
        dialogue: "Don Falcone is escaping the city in an armored limousine with heavily armed escorts. Hunt down his convoy, destroy his limo, and take over the city!",
        stage: 0,
        rewardCash: 250000,
        checkpoints: [
            { x: 180, z: -350, desc: "Hunt down & Destroy Don Falcone's Armored Limousine!", type: "destroy_boss" }
        ]
    }
];

export class MissionManager {
    constructor(scene, cityWorld, player, vehicles, police, weapons) {
        this.scene = scene;
        this.city = cityWorld;
        this.player = player;
        this.vehicles = vehicles;
        this.police = police;
        this.weapons = weapons;

        this.currentMissionIndex = 0;
        this.activeMission = null;
        this.activeCheckpointIndex = 0;
        this.isMissionActive = false;

        // Side Jobs
        this.activeSideJob = null; // 'taxi', 'vigilante', 'racing'
        this.sideJobTimer = 0;
        this.sideJobScore = 0;

        // 3D Mission Marker Beacon
        this.markerMesh = null;
        this.initMissionMarker();
    }

    initMissionMarker() {
        const group = new THREE.Group();

        // Glowing Yellow / Cyan Marker Cylinder
        const cylGeo = new THREE.CylinderGeometry(2.5, 2.5, 6, 16, 1, true);
        const cylMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.y = 3;
        group.add(cyl);

        // Ground Ring
        const ringGeo = new THREE.RingGeometry(2.2, 2.8, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffbb00, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.1;
        group.add(ring);

        this.scene.add(group);
        this.markerMesh = group;
        this.markerMesh.visible = false;
    }

    startStoryMission(index) {
        if (index < 0 || index >= STORY_MISSIONS.length) return;
        this.currentMissionIndex = index;
        const mData = STORY_MISSIONS[index];
        this.activeMission = JSON.parse(JSON.stringify(mData));
        this.activeCheckpointIndex = 0;
        this.isMissionActive = true;
        this.activeSideJob = null;

        this.updateMarkerPosition();
        return this.activeMission;
    }

    getCurrentCheckpoint() {
        if (!this.isMissionActive || !this.activeMission) return null;
        return this.activeMission.checkpoints[this.activeCheckpointIndex];
    }

    updateMarkerPosition() {
        const cp = this.getCurrentCheckpoint();
        if (cp && this.markerMesh) {
            this.markerMesh.position.set(cp.x, 0, cp.z);
            this.markerMesh.visible = true;
        } else if (this.markerMesh) {
            this.markerMesh.visible = false;
        }
    }

    // ----------------------------------------------------
    // SIDE JOBS: TAXI, VIGILANTE, STREET RACING
    // ----------------------------------------------------
    startTaxiMission() {
        this.activeSideJob = 'taxi';
        this.sideJobTimer = 60.0;
        this.isMissionActive = false;

        // Pick random destination
        const dest = this.city.roadNodes[Math.floor(Math.random() * this.city.roadNodes.length)];
        this.sideJobDest = { x: dest.x, z: dest.z, desc: "Drive Passenger to Destination!" };
        this.markerMesh.position.set(dest.x, 0, dest.z);
        this.markerMesh.visible = true;
        return { title: "TAXI FARE", objective: "Drive passenger to destination before time runs out!" };
    }

    startVigilanteMission() {
        this.activeSideJob = 'vigilante';
        this.sideJobTimer = 90.0;
        this.isMissionActive = false;

        // Spawn criminal car
        const spawnNode = this.city.roadNodes[Math.floor(Math.random() * this.city.roadNodes.length)];
        const crimCar = this.vehicles.createVehicle('muscle', spawnNode.x, 0.5, spawnNode.z, 0, 0x111111, "Criminal Suspect");
        this.vigilanteTarget = crimCar;
        this.sideJobDest = { x: spawnNode.x, z: spawnNode.z, desc: "Eliminate the Criminal Suspect!" };
        this.markerMesh.position.set(spawnNode.x, 0, spawnNode.z);
        this.markerMesh.visible = true;
        return { title: "VIGILANTE PATROL", objective: "Hunt down and eliminate the wanted criminal!" };
    }

    startStreetRace() {
        this.activeSideJob = 'racing';
        this.sideJobTimer = 120.0;
        this.raceCheckpoints = [
            { x: -200, z: -200 },
            { x: 0, z: -200 },
            { x: 200, z: 0 },
            { x: 0, z: 200 },
            { x: -200, z: 0 }
        ];
        this.raceIndex = 0;
        this.isMissionActive = false;
        this.markerMesh.position.set(this.raceCheckpoints[0].x, 0, this.raceCheckpoints[0].z);
        this.markerMesh.visible = true;
        return { title: "STREET RACE", objective: "Hit all race checkpoints in record time!" };
    }

    // ----------------------------------------------------
    // UPDATE
    // ----------------------------------------------------
    update(delta, playerPos, onMissionPassed) {
        // Animate 3D Beacon Marker
        if (this.markerMesh && this.markerMesh.visible) {
            this.markerMesh.rotation.y += delta * 2;
            const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.15;
            this.markerMesh.scale.set(pulse, 1, pulse);
        }

        // Check Story Mission Progress
        if (this.isMissionActive && this.activeMission) {
            const cp = this.getCurrentCheckpoint();
            if (cp && playerPos) {
                const dx = playerPos.x - cp.x;
                const dz = playerPos.z - cp.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Reached Checkpoint!
                if (dist < 8.0) {
                    this.activeCheckpointIndex++;
                    if (this.activeCheckpointIndex >= this.activeMission.checkpoints.length) {
                        // MISSION COMPLETE!
                        this.completeMission(onMissionPassed);
                    } else {
                        soundEngine.playMoneySound();
                        this.updateMarkerPosition();
                    }
                }
            }
        }

        // Check Side Job Progress
        if (this.activeSideJob) {
            this.sideJobTimer -= delta;

            if (this.activeSideJob === 'taxi' && this.sideJobDest && playerPos) {
                const dist = Math.sqrt((playerPos.x - this.sideJobDest.x)**2 + (playerPos.z - this.sideJobDest.z)**2);
                if (dist < 8.0) {
                    const fare = 800 + Math.floor(this.sideJobTimer * 20);
                    this.player.addMoney(fare);
                    soundEngine.playMissionPassedSound();
                    this.activeSideJob = null;
                    this.markerMesh.visible = false;
                    if (onMissionPassed) onMissionPassed("FARE COMPLETED", `+$${fare} (Speed Tip Included!)`);
                }
            } else if (this.activeSideJob === 'racing' && playerPos) {
                const targetCp = this.raceCheckpoints[this.raceIndex];
                const dist = Math.sqrt((playerPos.x - targetCp.x)**2 + (playerPos.z - targetCp.z)**2);
                if (dist < 10.0) {
                    this.raceIndex++;
                    soundEngine.playMoneySound();
                    if (this.raceIndex >= this.raceCheckpoints.length) {
                        const reward = 12000;
                        this.player.addMoney(reward);
                        soundEngine.playMissionPassedSound();
                        this.activeSideJob = null;
                        this.markerMesh.visible = false;
                        if (onMissionPassed) onMissionPassed("STREET RACE WON!", `+$${reward} 1st Place Trophy!`);
                    } else {
                        const nextCp = this.raceCheckpoints[this.raceIndex];
                        this.markerMesh.position.set(nextCp.x, 0, nextCp.z);
                    }
                }
            }

            if (this.sideJobTimer <= 0) {
                this.activeSideJob = null;
                this.markerMesh.visible = false;
            }
        }
    }

    completeMission(onMissionPassed) {
        this.isMissionActive = false;
        if (this.markerMesh) this.markerMesh.visible = false;

        const m = this.activeMission;
        this.player.addMoney(m.rewardCash);
        soundEngine.playMissionPassedSound();

        if (onMissionPassed) {
            onMissionPassed(m.title, `+$${m.rewardCash.toLocaleString()} RESPECT +`);
        }

        // Progress to next mission
        this.currentMissionIndex = (this.currentMissionIndex + 1) % STORY_MISSIONS.length;
    }
}
