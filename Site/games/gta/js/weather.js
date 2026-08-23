import * as THREE from './three.module.js';

export class WeatherSystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        // Time of day (0.0 to 24.0, starting at 14:00 afternoon)
        this.timeOfDay = 14.0;
        this.timeSpeed = 0.06;

        // Weather presets: 'sunny', 'sunset', 'night', 'rain', 'fog'
        this.currentWeather = 'sunny';

        // Lighting
        this.ambientLight = null;
        this.sunLight = null;
        this.moonLight = null;
        this.skyDome = null;
        this.starsMesh = null;
        this.cloudMesh = null;

        // Rain particles
        this.rainParticles = null;
        this.rainCount = 600;
        this.isRaining = false;
        this.thunderTimer = 0;

        // Night emissive objects list
        this.nightGlowObjects = [];

        this.initLights();
        this.initAtmosphere();
        this.initRain();
    }

    initLights() {
        this.ambientLight = new THREE.AmbientLight(0xdce7f5, 0.65);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.1);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 600;
        const d = 220;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0004;
        this.scene.add(this.sunLight);

        this.moonLight = new THREE.DirectionalLight(0x4a69bd, 0.25);
        this.scene.add(this.moonLight);
    }

    initAtmosphere() {
        // Deep, rich sky background & extended view distance fog
        this.scene.background = new THREE.Color(0x3498db);
        this.scene.fog = new THREE.Fog(0x3498db, 250, 1800);

        // Procedural Star Field for Night
        const starGeo = new THREE.BufferGeometry();
        const starCount = 600;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const r = 900 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.45;
            starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPos[i * 3 + 1] = r * Math.cos(phi);
            starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0 });
        this.starsMesh = new THREE.Points(starGeo, starMat);
        this.scene.add(this.starsMesh);

        // Procedural Low-Poly Floating Clouds
        const cloudGroup = new THREE.Group();
        const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
        for (let i = 0; i < 14; i++) {
            const cg = new THREE.Group();
            const cx = (Math.random() - 0.5) * 1200;
            const cz = (Math.random() - 0.5) * 1200;
            const cy = 260 + Math.random() * 60;
            cg.position.set(cx, cy, cz);

            for (let j = 0; j < 4; j++) {
                const puff = new THREE.Mesh(new THREE.BoxGeometry(60 + Math.random() * 40, 15, 45 + Math.random() * 30), cloudMat);
                puff.position.set((j - 1.5) * 28, Math.random() * 6, (Math.random() - 0.5) * 20);
                cg.add(puff);
            }
            cloudGroup.add(cg);
        }
        this.cloudMesh = cloudGroup;
        this.scene.add(cloudGroup);
    }

    initRain() {
        const rainGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(this.rainCount * 3);
        const velocities = new Float32Array(this.rainCount);

        for (let i = 0; i < this.rainCount; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * 160;
            positions[i * 3 + 1] = Math.random() * 70 + 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
            velocities[i] = Math.random() * 35 + 65;
        }

        rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.rainVelocities = velocities;

        const rainMat = new THREE.PointsMaterial({
            color: 0x95a5a6,
            size: 0.4,
            transparent: true,
            opacity: 0.65
        });

        this.rainParticles = new THREE.Points(rainGeo, rainMat);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }

    setWeather(type) {
        this.currentWeather = type;
        if (type === 'sunny') {
            this.timeOfDay = 13.0;
            this.isRaining = false;
        } else if (type === 'sunset') {
            this.timeOfDay = 18.2;
            this.isRaining = false;
        } else if (type === 'night') {
            this.timeOfDay = 23.0;
            this.isRaining = false;
        } else if (type === 'rain') {
            this.isRaining = true;
        } else if (type === 'fog') {
            this.isRaining = false;
        }
    }

    setGraphicsQuality(quality) {
        if (!this.sunLight) return;

        if (quality === 'low') {
            this.sunLight.castShadow = false;
            if (this.rainParticles) this.rainParticles.visible = false;
            this.scene.fog.near = 200;
            this.scene.fog.far = 900;
        } else if (quality === 'medium') {
            this.sunLight.castShadow = true;
            this.sunLight.shadow.mapSize.width = 512;
            this.sunLight.shadow.mapSize.height = 512;
            if (this.rainParticles) this.rainParticles.visible = this.isRaining;
            this.scene.fog.near = 250;
            this.scene.fog.far = 1400;
        } else if (quality === 'high') {
            this.sunLight.castShadow = true;
            this.sunLight.shadow.mapSize.width = 1024;
            this.sunLight.shadow.mapSize.height = 1024;
            if (this.rainParticles) this.rainParticles.visible = this.isRaining;
            this.scene.fog.near = 300;
            this.scene.fog.far = 1800;
        } else if (quality === 'ultra') {
            this.sunLight.castShadow = true;
            this.sunLight.shadow.mapSize.width = 2048;
            this.sunLight.shadow.mapSize.height = 2048;
            if (this.rainParticles) this.rainParticles.visible = this.isRaining;
            this.scene.fog.near = 350;
            this.scene.fog.far = 2400;
        }
    }

    registerGlowObject(mesh) {
        this.nightGlowObjects.push(mesh);
    }

    update(delta, playerPos) {
        this.timeOfDay = (this.timeOfDay + delta * this.timeSpeed) % 24;

        const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
        const px = playerPos ? playerPos.x : 0;
        const pz = playerPos ? playerPos.z : 0;
        const sunX = Math.cos(sunAngle) * 350 + px;
        const sunY = Math.sin(sunAngle) * 350;
        const sunZ = Math.sin(sunAngle * 0.5) * 180 + pz;

        this.sunLight.position.set(sunX, Math.max(sunY, -30), sunZ);
        this.sunLight.target.position.set(px, 0, pz);
        this.sunLight.target.updateMatrixWorld();

        this.moonLight.position.set(-sunX, -sunY, -sunZ);

        const isSunset = Math.abs(sunY) < 70 && sunY > -20;
        const isNight = sunY <= 0;

        // Smooth clouds drifting
        if (this.cloudMesh) {
            this.cloudMesh.position.x = (this.cloudMesh.position.x + delta * 4) % 400;
            this.cloudMesh.position.z = pz;
        }

        // Star visibility
        if (this.starsMesh) {
            this.starsMesh.position.set(px, 0, pz);
            this.starsMesh.material.opacity = isNight ? 0.9 : (isSunset ? 0.2 : 0.0);
        }

        // Sky & Fog dynamic atmospheric coloring
        if (this.currentWeather === 'rain') {
            this.scene.background.setHex(0x2c3e50);
            this.scene.fog.color.setHex(0x2c3e50);
            this.ambientLight.color.setHex(0x7f8c8d);
            this.ambientLight.intensity = 0.5;
            this.sunLight.intensity = 0.35;
        } else if (this.currentWeather === 'fog') {
            this.scene.background.setHex(0x57606f);
            this.scene.fog.color.setHex(0x57606f);
            this.ambientLight.intensity = 0.55;
            this.sunLight.intensity = 0.35;
        } else if (isSunset) {
            this.scene.background.setHex(0xd35400);
            this.scene.fog.color.setHex(0xe67e22);
            this.sunLight.color.setHex(0xf39c12);
            this.sunLight.intensity = 1.15;
            this.ambientLight.color.setHex(0xe17055);
            this.ambientLight.intensity = 0.55;
        } else if (isNight) {
            this.scene.background.setHex(0x0c101c);
            this.scene.fog.color.setHex(0x0c101c);
            this.sunLight.intensity = 0.0;
            this.ambientLight.color.setHex(0x192a56);
            this.ambientLight.intensity = 0.35;
        } else {
            // Bright clear sky
            this.scene.background.setHex(0x3498db);
            this.scene.fog.color.setHex(0x3498db);
            this.sunLight.color.setHex(0xfffaed);
            this.sunLight.intensity = 1.1;
            this.ambientLight.color.setHex(0xdce7f5);
            this.ambientLight.intensity = 0.65;
        }

        const glow = isNight ? 1.0 : (isSunset ? 0.5 : 0.0);
        for (let obj of this.nightGlowObjects) {
            if (obj.material && obj.material.emissive) {
                obj.material.emissiveIntensity = glow;
            }
        }

        // Rain particles
        if (this.isRaining && this.rainParticles && playerPos) {
            this.rainParticles.visible = true;
            this.rainParticles.position.set(px, 0, pz);
            const posAttr = this.rainParticles.geometry.attributes.position;

            for (let i = 0; i < this.rainCount; i++) {
                let y = posAttr.getY(i) - this.rainVelocities[i] * delta;
                if (y < 0) {
                    y = 65 + Math.random() * 15;
                    posAttr.setX(i, (Math.random() - 0.5) * 160);
                    posAttr.setZ(i, (Math.random() - 0.5) * 160);
                }
                posAttr.setY(i, y);
            }
            posAttr.needsUpdate = true;

            // Occasional lightning flash
            this.thunderTimer -= delta;
            if (this.thunderTimer <= 0) {
                if (Math.random() < 0.25) {
                    this.ambientLight.intensity = 2.2;
                    setTimeout(() => {
                        this.ambientLight.intensity = 0.5;
                    }, 70);
                }
                this.thunderTimer = 6 + Math.random() * 10;
            }
        } else if (this.rainParticles) {
            this.rainParticles.visible = false;
        }
    }
}
