import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export class CityWorld {
    constructor(scene, weatherSystem) {
        this.scene = scene;
        this.weather = weatherSystem;

        // Collision bounds for static buildings & props: [{ minX, maxX, minZ, maxZ, height, type }]
        this.colliders = [];
        this.destructibleProps = [];
        this.waterFountains = [];
        this.gasPumps = [];
        this.stuntRamps = [];

        // Interactive Interior Triggers: [{ x, z, radius, name, type, onInteract }]
        this.interiorTriggers = [];

        // Road network waypoints for AI traffic
        this.roadNodes = [];
        this.intersections = [];

        // Shared materials
        this.materials = {};
        this.initMaterials();
        this.buildWorld();
    }

    initMaterials() {
        this.materials.asphalt = new THREE.MeshLambertMaterial({ color: 0x1e272e });
        this.materials.roadMarkYellow = new THREE.MeshBasicMaterial({ color: 0xffc048 });
        this.materials.roadMarkWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.materials.sidewalk = new THREE.MeshLambertMaterial({ color: 0x57606f });
        this.materials.grass = new THREE.MeshLambertMaterial({ color: 0x2ed573 });
        this.materials.sand = new THREE.MeshLambertMaterial({ color: 0xffbe76 });
        
        // Ocean Water
        this.materials.water = new THREE.MeshLambertMaterial({
            color: 0x0984e3,
            transparent: true,
            opacity: 0.85
        });

        // Building Materials
        this.materials.concreteLight = new THREE.MeshLambertMaterial({ color: 0xc8d6e5 });
        this.materials.concreteDark = new THREE.MeshLambertMaterial({ color: 0x222f3e });
        this.materials.brick = new THREE.MeshLambertMaterial({ color: 0xee5253 });
        this.materials.glassBlue = new THREE.MeshLambertMaterial({ color: 0x0abde3, transparent: true, opacity: 0.85 });
        this.materials.glassGold = new THREE.MeshLambertMaterial({ color: 0xff9f43 });
        this.materials.glassCyan = new THREE.MeshLambertMaterial({ color: 0x48dbfb });
        this.materials.interiorFloor = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
        this.materials.interiorWood = new THREE.MeshLambertMaterial({ color: 0xa0522d });
        this.materials.neonRed = new THREE.MeshBasicMaterial({ color: 0xff3838 });
        this.materials.neonPink = new THREE.MeshBasicMaterial({ color: 0xff7675 });
        this.materials.neonCyan = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
        this.materials.neonGreen = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });

        // Props Materials
        this.materials.metalRed = new THREE.MeshLambertMaterial({ color: 0xd63031 });
        this.materials.metalYellow = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
        this.materials.metalGrey = new THREE.MeshLambertMaterial({ color: 0x8395a7 });
        this.materials.palmTrunk = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
        this.materials.palmLeaves = new THREE.MeshLambertMaterial({ color: 0x10ac84 });
        this.materials.containerRed = new THREE.MeshLambertMaterial({ color: 0xff4757 });
        this.materials.containerBlue = new THREE.MeshLambertMaterial({ color: 0x2e86de });
        this.materials.containerGreen = new THREE.MeshLambertMaterial({ color: 0x1dd1a1 });
    }

    buildWorld() {
        this.buildTerrain();
        this.buildDistantSkylineSilhouettes();
        this.buildRoadNetwork();
        this.buildDowntownDistrict();
        this.buildEnterablePenthouseSafehouse();
        this.buildEnterableAmmuNation();
        this.buildEnterableOceanPalmsHotel();
        this.buildEnterablePayNSpray();
        this.buildEnterableCartelWarehouse();
        this.buildSuburbsDistrict();
        this.buildMilitaryBase();
        this.buildDestructibleProps();
        this.buildStuntRamps();
    }

    buildTerrain() {
        // Main Ground Base
        const groundGeo = new THREE.PlaneGeometry(3200, 3200);
        groundGeo.rotateX(-Math.PI / 2);
        const groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
        groundMesh.receiveShadow = true;
        groundMesh.position.y = -0.05;
        this.scene.add(groundMesh);

        // Ocean Beach Sand at East
        const sandGeo = new THREE.PlaneGeometry(240, 2400);
        sandGeo.rotateX(-Math.PI / 2);
        const sandMesh = new THREE.Mesh(sandGeo, this.materials.sand);
        sandMesh.receiveShadow = true;
        sandMesh.position.set(480, 0.02, 0);
        this.scene.add(sandMesh);

        // Ocean Water
        const oceanGeo = new THREE.PlaneGeometry(1200, 2400);
        oceanGeo.rotateX(-Math.PI / 2);
        const oceanMesh = new THREE.Mesh(oceanGeo, this.materials.water);
        oceanMesh.position.set(1100, -0.2, 0);
        this.scene.add(oceanMesh);
    }

    // Distant Mountain & Skyscraper Silhouettes for seamless view distance
    buildDistantSkylineSilhouettes() {
        const mountainMat = new THREE.MeshLambertMaterial({ color: 0x1b263b });
        const distantTowerMat = new THREE.MeshLambertMaterial({ color: 0x1e272e });

        // Distant Mountains in North & West (Z < -700, X < -700)
        for (let i = 0; i < 8; i++) {
            const mGeo = new THREE.ConeGeometry(180 + Math.random() * 120, 220 + Math.random() * 140, 6);
            const mountain = new THREE.Mesh(mGeo, mountainMat);
            mountain.position.set(-800 + i * 220, 110, -950 + (Math.random() - 0.5) * 200);
            this.scene.add(mountain);
        }

        // Distant Skyline Towers in South & West
        for (let j = 0; j < 12; j++) {
            const tw = 40 + Math.random() * 30;
            const th = 100 + Math.random() * 160;
            const tGeo = new THREE.BoxGeometry(tw, th, tw);
            const tower = new THREE.Mesh(tGeo, distantTowerMat);
            tower.position.set(-750 + (j % 4) * 160, th / 2, 750 + Math.floor(j / 4) * 180);
            this.scene.add(tower);
        }
    }

    buildRoadNetwork() {
        const roadWidth = 20;
        const sidewalkWidth = 3.5;
        const xCoords = [-360, -180, 0, 180, 360];
        const zCoords = [-360, -180, 0, 180, 360];

        // Horizontal Avenues
        zCoords.forEach(z => {
            const roadGeo = new THREE.PlaneGeometry(1000, roadWidth);
            roadGeo.rotateX(-Math.PI / 2);
            const roadMesh = new THREE.Mesh(roadGeo, this.materials.asphalt);
            roadMesh.receiveShadow = true;
            roadMesh.position.set(0, 0.05, z);
            this.scene.add(roadMesh);

            // Sidewalks
            [-roadWidth/2 - sidewalkWidth/2, roadWidth/2 + sidewalkWidth/2].forEach(off => {
                const swGeo = new THREE.BoxGeometry(1000, 0.25, sidewalkWidth);
                const swMesh = new THREE.Mesh(swGeo, this.materials.sidewalk);
                swMesh.receiveShadow = true;
                swMesh.position.set(0, 0.12, z + off);
                this.scene.add(swMesh);
            });
        });

        // Vertical Boulevards
        xCoords.forEach(x => {
            const roadGeo = new THREE.PlaneGeometry(roadWidth, 1000);
            roadGeo.rotateX(-Math.PI / 2);
            const roadMesh = new THREE.Mesh(roadGeo, this.materials.asphalt);
            roadMesh.receiveShadow = true;
            roadMesh.position.set(x, 0.05, 0);
            this.scene.add(roadMesh);

            // Sidewalks
            [-roadWidth/2 - sidewalkWidth/2, roadWidth/2 + sidewalkWidth/2].forEach(off => {
                const swGeo = new THREE.BoxGeometry(sidewalkWidth, 0.25, 1000);
                const swMesh = new THREE.Mesh(swGeo, this.materials.sidewalk);
                swMesh.receiveShadow = true;
                swMesh.position.set(x + off, 0.12, 0);
                this.scene.add(swMesh);
            });
        });

        // Street lamps on sidewalk corners
        xCoords.forEach(x => {
            zCoords.forEach(z => {
                this.intersections.push({ x, z });
                this.buildStreetLamp(x + 13, z - 13);
                this.buildStreetLamp(x - 13, z + 13);
            });
        });

        // Generate Road Navigation Waypoints
        xCoords.forEach(x => {
            for (let z = -450; z <= 450; z += 45) {
                this.roadNodes.push({ x: x - 5, z: z, dirX: 0, dirZ: 1 });
                this.roadNodes.push({ x: x + 5, z: z, dirX: 0, dirZ: -1 });
            }
        });
        zCoords.forEach(z => {
            for (let x = -450; x <= 350; x += 45) {
                this.roadNodes.push({ x: x, z: z + 5, dirX: 1, dirZ: 0 });
                this.roadNodes.push({ x: x, z: z - 5, dirX: -1, dirZ: 0 });
            }
        });
    }

    buildStreetLamp(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 5), this.materials.metalGrey);
        pole.position.y = 3.5;
        pole.castShadow = true;
        group.add(pole);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 1.2), this.materials.metalGrey);
        head.position.set(0, 6.8, 0.4);
        group.add(head);

        const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
        bulb.rotateX(Math.PI / 2);
        bulb.position.set(0, 6.66, 0.4);
        group.add(bulb);

        this.scene.add(group);
        this.weather.registerGlowObject(bulb);
        this.colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, height: 7, type: 'lamp' });
    }

    // ----------------------------------------------------
    // DISTRICT 1: DOWNTOWN SKYSCRAPERS & MAZE TOWER
    // ----------------------------------------------------
    buildDowntownDistrict() {
        this.buildMazeTower(-90, -90);

        const towers = [
            { x: 90, z: -90, w: 46, d: 46, h: 140, mat: this.materials.glassGold, name: "Eclipse Plaza" },
            { x: 90, z: 90, w: 45, d: 45, h: 125, mat: this.materials.concreteLight, name: "Century Center" },
            { x: -270, z: -90, w: 42, d: 42, h: 85, mat: this.materials.concreteDark, name: "Financial Tower" }
        ];

        towers.forEach(t => {
            this.buildSkyscraper(t.x, t.z, t.w, t.d, t.h, t.mat, t.name);
        });
    }

    buildMazeTower(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 24, 45, 10), this.materials.glassCyan);
        baseMesh.position.y = 22.5;
        baseMesh.castShadow = true;
        group.add(baseMesh);

        const midMesh = new THREE.Mesh(new THREE.CylinderGeometry(15, 18, 60, 10), this.materials.concreteDark);
        midMesh.position.y = 75;
        midMesh.castShadow = true;
        group.add(midMesh);

        const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 50, 10), this.materials.glassBlue);
        topMesh.position.y = 130;
        topMesh.castShadow = true;
        group.add(topMesh);

        // Helipad Deck
        const helipad = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.5, 12), this.materials.concreteDark);
        helipad.position.y = 155;
        group.add(helipad);

        const hMark = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.materials.roadMarkYellow);
        hMark.rotateX(-Math.PI / 2);
        hMark.position.set(0, 155.8, 0);
        group.add(hMark);

        // Spire & Beacon
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 20, 5), this.materials.metalGrey);
        ant.position.y = 165;
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 5, 5), this.materials.neonRed);
        beacon.position.y = 175;
        group.add(ant, beacon);

        this.scene.add(group);
        this.colliders.push({ minX: x - 22, maxX: x + 22, minZ: z - 22, maxZ: z + 22, height: 160, type: 'building', name: 'Maze Tower' });
    }

    buildSkyscraper(x, z, w, d, h, material, name) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 2.5, 0.6), this.materials.neonPink);
        sign.position.set(0, h - 3, d / 2 + 0.4);
        group.add(sign);
        this.weather.registerGlowObject(sign);

        this.scene.add(group);
        this.colliders.push({ minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'building', name });
    }

    // ----------------------------------------------------
    // ENTERABLE BUILDING 1: DOWNTOWN PENTHOUSE SAFEHOUSE
    // ----------------------------------------------------
    buildEnterablePenthouseSafehouse() {
        const x = -90;
        const z = 90;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Outer Building Shell with Open Glass Doors
        const w = 44, d = 40, h = 35;
        
        // Floor & Ceiling
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.interiorFloor);
        floor.position.y = 0.25;
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.concreteLight);
        ceiling.position.y = 8.5;
        group.add(floor, ceiling);

        // Back Wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, 1), this.materials.concreteDark);
        backWall.position.set(0, 4.5, -d/2 + 0.5);
        // Left Wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 8, d), this.materials.concreteDark);
        leftWall.position.set(-w/2 + 0.5, 4.5, 0);
        // Right Wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 8, d), this.materials.concreteDark);
        rightWall.position.set(w/2 - 0.5, 4.5, 0);

        // Front Wall with Wide Open Entry Doorway
        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 1), this.materials.concreteDark);
        frontLeft.position.set(-13, 4.5, d/2 - 0.5);
        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 1), this.materials.concreteDark);
        frontRight.position.set(13, 4.5, d/2 - 0.5);
        const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(12, 2.5, 1), this.materials.concreteDark);
        doorHeader.position.set(0, 7.25, d/2 - 0.5);

        group.add(backWall, leftWall, rightWall, frontLeft, frontRight, doorHeader);

        // Tower Upper Structure
        const towerTop = new THREE.Mesh(new THREE.BoxGeometry(w, 65, d), this.materials.glassCyan);
        towerTop.position.set(0, 41, 0);
        towerTop.castShadow = true;
        group.add(towerTop);

        // Interior Furniture: Sofa, Coffee Table, Widescreen TV, Bed
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 2.2), new THREE.MeshLambertMaterial({ color: 0xd63031 }));
        sofa.position.set(-8, 1.2, -4);
        const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.8), this.materials.interiorWood);
        table.position.set(-8, 0.9, -0.5);
        const tv = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 0.4), new THREE.MeshBasicMaterial({ color: 0x00d2d3 }));
        tv.position.set(-8, 4.5, 6);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 7), new THREE.MeshLambertMaterial({ color: 0x2e86de }));
        bed.position.set(12, 1.3, -8);

        // Neon Sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 0.6), this.materials.neonCyan);
        sign.position.set(0, 10.5, d/2 + 0.3);
        group.add(sofa, table, tv, bed, sign);
        this.weather.registerGlowObject(sign);

        this.scene.add(group);

        // Colliders around interior walls
        this.colliders.push(
            { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z - d/2 + 1, height: 8, type: 'wall' },
            { minX: x - w/2, maxX: x - w/2 + 1, minZ: z - d/2, maxZ: z + d/2, height: 8, type: 'wall' },
            { minX: x + w/2 - 1, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: 8, type: 'wall' },
            { minX: x - 22, maxX: x - 5, minZ: z + d/2 - 1, maxZ: z + d/2, height: 8, type: 'wall' },
            { minX: x + 5, maxX: x + 22, minZ: z + d/2 - 1, maxZ: z + d/2, height: 8, type: 'wall' }
        );

        this.interiorTriggers.push({
            x: x, z: z, radius: 12, name: "Downtown Penthouse Safehouse", type: "safehouse"
        });
    }

    // ----------------------------------------------------
    // ENTERABLE BUILDING 2: AMMU-NATION GUN DEPOT
    // ----------------------------------------------------
    buildEnterableAmmuNation() {
        const x = 0;
        const z = -270;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const w = 34, d = 26, h = 8;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.interiorFloor);
        floor.position.y = 0.25;
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.brick);
        ceiling.position.y = h + 0.25;
        group.add(floor, ceiling);

        // Walls with open front double doorway
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), this.materials.brick);
        backWall.position.set(0, h/2, -d/2 + 0.5);
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), this.materials.brick);
        leftWall.position.set(-w/2 + 0.5, h/2, 0);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), this.materials.brick);
        rightWall.position.set(w/2 - 0.5, h/2, 0);

        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(12, h, 1), this.materials.brick);
        frontLeft.position.set(-10, h/2, d/2 - 0.5);
        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(12, h, 1), this.materials.brick);
        frontRight.position.set(10, h/2, d/2 - 0.5);
        const header = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 1), this.materials.brick);
        header.position.set(0, h - 1.25, d/2 - 0.5);

        group.add(backWall, leftWall, rightWall, frontLeft, frontRight, header);

        // Gun Store Counter & Glass Cases
        const counter = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 2), this.materials.interiorWood);
        counter.position.set(0, 1.1, -2);
        const gunRack = new THREE.Mesh(new THREE.BoxGeometry(18, 4.5, 0.6), this.materials.metalGrey);
        gunRack.position.set(0, 4.5, -d/2 + 1.2);
        const gunClerk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.8), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
        gunClerk.position.set(0, 1.5, -4.5);

        // Glowing Neon "AMMU-NATION" Sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(18, 2.8, 0.6), this.materials.neonRed);
        sign.position.set(0, h + 1.5, d/2 + 0.4);
        group.add(counter, gunRack, gunClerk, sign);
        this.weather.registerGlowObject(sign);

        this.scene.add(group);

        this.colliders.push(
            { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z - d/2 + 1, height: h, type: 'wall' },
            { minX: x - w/2, maxX: x - w/2 + 1, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x + w/2 - 1, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x - 17, maxX: x - 4, minZ: z + d/2 - 1, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x + 4, maxX: x + 17, minZ: z + d/2 - 1, maxZ: z + d/2, height: h, type: 'wall' }
        );

        this.interiorTriggers.push({
            x: x, z: z, radius: 9, name: "Ammu-Nation Gun Depot", type: "gunstore"
        });
    }

    // ----------------------------------------------------
    // ENTERABLE BUILDING 3: OCEAN PALMS HOTEL & LOUNGE
    // ----------------------------------------------------
    buildEnterableOceanPalmsHotel() {
        const x = 270;
        const z = -90;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const w = 48, d = 42, h = 32;

        // Ground Floor Interior
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), new THREE.MeshLambertMaterial({ color: 0xecf0f1 }));
        floor.position.y = 0.25;
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.concreteLight);
        ceiling.position.y = 8.5;
        group.add(floor, ceiling);

        // Outer walls with open entrance facing west (towards road)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(1, 8, d), this.materials.concreteLight);
        backWall.position.set(w/2 - 0.5, 4.5, 0);
        const northWall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, 1), this.materials.concreteLight);
        northWall.position.set(0, 4.5, -d/2 + 0.5);
        const southWall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, 1), this.materials.concreteLight);
        southWall.position.set(0, 4.5, d/2 - 0.5);

        // West Wall with wide entrance
        const westNorth = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 14), this.materials.concreteLight);
        westNorth.position.set(-w/2 + 0.5, 4.5, -14);
        const westSouth = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 14), this.materials.concreteLight);
        westSouth.position.set(-w/2 + 0.5, 4.5, 14);
        const westHeader = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 14), this.materials.concreteLight);
        westHeader.position.set(-w/2 + 0.5, 7.25, 0);

        group.add(backWall, northWall, southWall, westNorth, westSouth, westHeader);

        // Hotel Upper Floors
        const upper = new THREE.Mesh(new THREE.BoxGeometry(w, 24, d), new THREE.MeshLambertMaterial({ color: 0xff7675 }));
        upper.position.set(0, 20.5, 0);
        upper.castShadow = true;
        group.add(upper);

        // Reception Desk & Cocktail Bar
        const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 16), this.materials.interiorWood);
        bar.position.set(14, 1.2, 0);
        const reception = new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 2.2), this.materials.interiorWood);
        reception.position.set(0, 1.2, 12);

        // Neon Sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 22), this.materials.neonPink);
        sign.position.set(-w/2 - 0.4, 12, 0);
        group.add(bar, reception, sign);
        this.weather.registerGlowObject(sign);

        this.scene.add(group);

        this.colliders.push(
            { minX: x + w/2 - 1, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: 8, type: 'wall' },
            { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z - d/2 + 1, height: 8, type: 'wall' },
            { minX: x - w/2, maxX: x + w/2, minZ: z + d/2 - 1, maxZ: z + d/2, height: 8, type: 'wall' },
            { minX: x - w/2, maxX: x - w/2 + 1, minZ: z - 21, maxZ: z - 7, height: 8, type: 'wall' },
            { minX: x - w/2, maxX: x - w/2 + 1, minZ: z + 7, maxZ: z + 21, height: 8, type: 'wall' }
        );

        this.interiorTriggers.push({
            x: x, z: z, radius: 14, name: "Ocean Palms Resort Lounge", type: "hotel"
        });
    }

    // ----------------------------------------------------
    // ENTERABLE BUILDING 4: PAY 'N' SPRAY CUSTOM GARAGE
    // ----------------------------------------------------
    buildEnterablePayNSpray() {
        const x = -270;
        const z = 0;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const w = 28, d = 26, h = 10;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.interiorFloor);
        floor.position.y = 0.25;
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.concreteDark);
        ceiling.position.y = h + 0.25;
        group.add(floor, ceiling);

        // Drive-in bay with wide open garage door
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), this.materials.concreteDark);
        backWall.position.set(0, h/2, -d/2 + 0.5);
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), this.materials.concreteDark);
        leftWall.position.set(-w/2 + 0.5, h/2, 0);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), this.materials.concreteDark);
        rightWall.position.set(w/2 - 0.5, h/2, 0);

        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(8, h, 1), this.materials.concreteDark);
        frontLeft.position.set(-10, h/2, d/2 - 0.5);
        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(8, h, 1), this.materials.concreteDark);
        frontRight.position.set(10, h/2, d/2 - 0.5);
        const header = new THREE.Mesh(new THREE.BoxGeometry(12, 2.5, 1), this.materials.concreteDark);
        header.position.set(0, h - 1.25, d/2 - 0.5);

        group.add(backWall, leftWall, rightWall, frontLeft, frontRight, header);

        // Hydraulic Car Lift inside
        const lift = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 14), this.materials.metalYellow);
        lift.position.set(0, 0.6, 0);

        // Glowing Neon "PAY 'N' SPRAY" Sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(18, 3.2, 0.6), this.materials.neonGreen);
        sign.position.set(0, h + 1.8, d/2 + 0.4);
        group.add(lift, sign);
        this.weather.registerGlowObject(sign);

        this.scene.add(group);

        this.colliders.push(
            { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z - d/2 + 1, height: h, type: 'wall' },
            { minX: x - w/2, maxX: x - w/2 + 1, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x + w/2 - 1, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x - 14, maxX: x - 6, minZ: z + d/2 - 1, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x + 6, maxX: x + 14, minZ: z + d/2 - 1, maxZ: z + d/2, height: h, type: 'wall' }
        );

        this.payNSprayTrigger = { x: x, z: z, radius: 10 };
    }

    // ----------------------------------------------------
    // ENTERABLE BUILDING 5: DOCKS CARTEL WAREHOUSE
    // ----------------------------------------------------
    buildEnterableCartelWarehouse() {
        const x = 90;
        const z = 270;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const w = 55, d = 65, h = 16;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), this.materials.interiorFloor);
        floor.position.y = 0.25;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), this.materials.brick);
        roof.position.y = h + 0.4;
        group.add(floor, roof);

        // Walls with open warehouse cargo doors
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), this.materials.brick);
        backWall.position.set(0, h/2, -d/2 + 0.5);
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), this.materials.brick);
        leftWall.position.set(-w/2 + 0.5, h/2, 0);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), this.materials.brick);
        rightWall.position.set(w/2 - 0.5, h/2, 0);

        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(18, h, 1), this.materials.brick);
        frontLeft.position.set(-18.5, h/2, d/2 - 0.5);
        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(18, h, 1), this.materials.brick);
        frontRight.position.set(18.5, h/2, d/2 - 0.5);
        const header = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 1), this.materials.brick);
        header.position.set(0, h - 2, d/2 - 0.5);

        group.add(backWall, leftWall, rightWall, frontLeft, frontRight, header);

        // Stacked Wooden Contraband Crates inside
        const crateMat = new THREE.MeshLambertMaterial({ color: 0xcd6133 });
        for (let i = 0; i < 6; i++) {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 3.5), crateMat);
            crate.position.set(-12 + (i % 3) * 6, 1.75, -14 + Math.floor(i / 3) * 8);
            group.add(crate);
        }

        this.scene.add(group);

        this.colliders.push(
            { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z - d/2 + 1, height: h, type: 'wall' },
            { minX: x - w/2, maxX: x - w/2 + 1, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x + w/2 - 1, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x - 27.5, maxX: x - 9.5, minZ: z + d/2 - 1, maxZ: z + d/2, height: h, type: 'wall' },
            { minX: x + 9.5, maxX: x + 27.5, minZ: z + d/2 - 1, maxZ: z + d/2, height: h, type: 'wall' }
        );

        this.interiorTriggers.push({
            x: x, z: z, radius: 18, name: "Cartel Docks Warehouse", type: "warehouse"
        });
    }

    buildSuburbsDistrict() {
        const houses = [
            { x: -270, z: -270 }, { x: -270, z: -350 }
        ];

        houses.forEach(h => {
            const group = new THREE.Group();
            group.position.set(h.x, 0, h.z);

            const body = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 18), this.materials.concreteLight);
            body.position.y = 3.5;
            body.castShadow = true;
            group.add(body);

            const roof = new THREE.Mesh(new THREE.ConeGeometry(16, 4.5, 4), this.materials.brick);
            roof.rotateY(Math.PI / 4);
            roof.position.y = 9.2;
            group.add(roof);

            this.scene.add(group);
            this.colliders.push({ minX: h.x - 11, maxX: h.x + 11, minZ: h.z - 9, maxZ: h.z + 9, height: 11, type: 'house' });
        });
    }

    buildMilitaryBase() {
        const baseX = -270;
        const baseZ = 270;

        const runway = new THREE.Mesh(new THREE.PlaneGeometry(26, 200), this.materials.asphalt);
        runway.rotateX(-Math.PI / 2);
        runway.position.set(baseX, 0.07, baseZ);
        this.scene.add(runway);

        const hangar = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 32, 8, 1, false, 0, Math.PI), this.materials.metalGrey);
        hangar.rotateZ(Math.PI / 2);
        hangar.position.set(baseX - 35, 0, baseZ - 35);
        hangar.castShadow = true;
        this.scene.add(hangar);
        this.colliders.push({ minX: baseX - 50, maxX: baseX - 20, minZ: baseZ - 52, maxZ: baseZ - 18, height: 14, type: 'hangar', name: 'Military Hangar' });
    }

    buildDestructibleProps() {
        const hydrantCoords = [
            { x: -168, z: -168 }, { x: 168, z: -168 }, { x: -168, z: 168 }, { x: 168, z: 168 }
        ];

        hydrantCoords.forEach(h => {
            const group = new THREE.Group();
            group.position.set(h.x, 0, h.z);

            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.1, 5), this.materials.metalRed);
            body.position.y = 0.55;
            body.castShadow = true;
            group.add(body);

            this.scene.add(group);
            this.destructibleProps.push({
                type: 'hydrant',
                mesh: group,
                x: h.x,
                z: h.z,
                radius: 0.45,
                isDestroyed: false
            });
        });

        // Gas Station
        this.buildGasStation(-180, 0);
    }

    buildGasStation(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 1.0, 14), this.materials.concreteLight);
        roof.position.y = 5.5;
        roof.castShadow = true;
        group.add(roof);

        [-8, 8].forEach(px => {
            const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.5, 6), this.materials.metalGrey);
            pil.position.set(px, 2.75, 0);
            group.add(pil);
        });

        [-5, 5].forEach(gx => {
            const pump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.0), this.materials.metalRed);
            pump.position.set(gx, 1.2, 0);
            pump.castShadow = true;
            group.add(pump);

            this.gasPumps.push({
                x: x + gx,
                z: z,
                mesh: pump,
                exploded: false
            });
        });

        this.scene.add(group);
        this.colliders.push({ minX: x - 11, maxX: x + 11, minZ: z - 7, maxZ: z + 7, height: 6, type: 'gasstation' });
    }

    buildStuntRamps() {
        const rampLocations = [
            { x: -14, z: 70, rotY: 0 },
            { x: 70, z: -14, rotY: Math.PI / 2 }
        ];

        rampLocations.forEach(r => {
            const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 6), this.materials.metalYellow);
            ramp.position.set(r.x, 1.1, r.z);
            ramp.rotation.y = r.rotY;
            ramp.rotation.x = -0.28;
            ramp.receiveShadow = true;
            this.scene.add(ramp);
            this.stuntRamps.push({ x: r.x, z: r.z, rotY: r.rotY });
        });
    }

    triggerHydrantBlast(hydrant) {
        if (hydrant.isDestroyed) return;
        hydrant.isDestroyed = true;
        hydrant.mesh.rotation.z = Math.PI / 3;
        soundEngine.playNoiseCrack(0.4, 1200, 0.35);
    }

    triggerGasPumpExplosion(pump, triggerExplosionCallback) {
        if (pump.exploded) return;
        pump.exploded = true;
        pump.mesh.visible = false;
        if (triggerExplosionCallback) {
            triggerExplosionCallback(pump.x, 1.5, pump.z, 14, 180);
        }
    }

    update(delta) {}

    checkCollision(x, z, radius = 0.8) {
        for (let c of this.colliders) {
            if (x + radius > c.minX && x - radius < c.maxX &&
                z + radius > c.minZ && z - radius < c.maxZ) {
                return c;
            }
        }
        return null;
    }
}
