import { soundEngine } from './audio.js';
import { CHEAT_CODES } from './cheats.js';
import { WEAPON_TYPES } from './weapons.js';

export class UIManager {
    constructor(game) {
        this.game = game;

        // DOM Elements
        this.moneyEl = document.getElementById('money-display');
        this.healthBar = document.getElementById('health-bar');
        this.armorBar = document.getElementById('armor-bar');
        this.staminaBar = document.getElementById('stamina-bar');
        this.wantedStars = document.querySelectorAll('.wanted-star');

        // Weapon HUD
        this.weaponIcon = document.getElementById('weapon-icon');
        this.ammoCurrent = document.getElementById('ammo-current');
        this.ammoReserve = document.getElementById('ammo-reserve');

        // Vehicle HUD
        this.vehicleHud = document.getElementById('vehicle-hud');
        this.vehicleName = document.getElementById('vehicle-name');
        this.speedoVal = document.getElementById('speedo-val');
        this.nitroBar = document.getElementById('nitro-bar');

        // Radio HUD
        this.radioHud = document.getElementById('radio-hud');
        this.radioStationName = this.radioHud ? this.radioHud.querySelector('.station-name') : null;
        this.radioStationGenre = this.radioHud ? this.radioHud.querySelector('.station-genre') : null;
        this.radioHudTimer = null;

        // Banners & Notifications
        this.missionBanner = document.getElementById('mission-banner');
        this.missionTitle = document.getElementById('mission-title');
        this.missionObjective = document.getElementById('mission-objective');
        this.notificationBox = document.getElementById('notification-box');
        this.notifTimer = null;

        // Overlays & Modals
        this.missionPassedOverlay = document.getElementById('mission-passed-overlay');
        this.wastedScreen = document.getElementById('wasted-screen');
        this.bustedScreen = document.getElementById('busted-screen');
        this.weaponWheelOverlay = document.getElementById('weapon-wheel-overlay');
        this.cheatsModal = document.getElementById('cheats-modal');
        this.settingsModal = document.getElementById('settings-modal');
        this.mapModal = document.getElementById('map-modal');

        // Minimap Radar Canvas (Corner)
        this.radarCanvas = document.getElementById('radarCanvas');
        this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
        this.radarSize = 140;
        if (this.radarCanvas) {
            this.radarCanvas.width = this.radarSize;
            this.radarCanvas.height = this.radarSize;
        }

        // Full Interactive Map Canvas (Modal)
        this.fullMapCanvas = document.getElementById('fullMapCanvas');
        this.fullMapCtx = this.fullMapCanvas ? this.fullMapCanvas.getContext('2d') : null;
        if (this.fullMapCanvas) {
            this.fullMapCanvas.width = 600;
            this.fullMapCanvas.height = 380;
        }

        this.displayedMoney = 0;
        this.graphicsQuality = this.detectInitialQuality();

        this.initWeaponWheel();
        this.initCheatsModal();
        this.initSettingsModal();
        this.initMapModal();
        this.initModalBackdrops();
        this.initTouchControls();
        this.initNotificationDismissals();
    }

    detectInitialQuality() {
        const saved = localStorage.getItem('gta_graphics_quality');
        if (saved && ['low', 'medium', 'high', 'ultra'].includes(saved)) {
            return saved;
        }
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Pixel/i.test(navigator.userAgent) || ('ontouchstart' in window);
        return isMobile ? 'medium' : 'ultra';
    }

    initNotificationDismissals() {
        if (this.notificationBox) {
            this.notificationBox.addEventListener('click', () => {
                this.notificationBox.style.display = 'none';
            });
        }
        if (this.missionBanner) {
            this.missionBanner.addEventListener('click', () => {
                this.missionBanner.style.display = 'none';
            });
        }
    }

    initModalBackdrops() {
        const modals = [
            { overlay: this.settingsModal, closeFn: () => this.closeSettingsModal() },
            { overlay: this.cheatsModal, closeFn: () => this.closeCheatsModal() },
            { overlay: this.mapModal, closeFn: () => this.closeMapModal() },
            { overlay: this.weaponWheelOverlay, closeFn: () => this.hideWeaponWheel() }
        ];

        modals.forEach(({ overlay, closeFn }) => {
            if (!overlay) return;
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeFn();
                }
            });
        });

        // Global escape key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.closeSettingsModal();
                this.closeCheatsModal();
                this.closeMapModal();
                this.hideWeaponWheel();
            }
            if (e.code === 'KeyM') {
                this.toggleMapModal();
            }
        });
    }

    initWeaponWheel() {
        const wheel = document.getElementById('weapon-wheel');
        if (!wheel) return;
        wheel.innerHTML = '';

        WEAPON_TYPES.forEach((w, idx) => {
            const angle = (idx / WEAPON_TYPES.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 115;
            const x = 150 + Math.cos(angle) * radius;
            const y = 150 + Math.sin(angle) * radius;

            const slot = document.createElement('div');
            slot.className = 'wheel-slot';
            slot.style.left = `${x}px`;
            slot.style.top = `${y}px`;
            slot.dataset.index = idx;
            slot.innerHTML = `
                <div class="w-icon">${w.icon}</div>
                <div class="w-name">${w.name}</div>
            `;

            const selectSlot = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.game.weapons.selectWeapon(idx);
                this.hideWeaponWheel();
            };

            slot.addEventListener('click', selectSlot);
            slot.addEventListener('touchend', selectSlot);

            wheel.appendChild(slot);
        });
    }

    showWeaponWheel() {
        if (!this.weaponWheelOverlay) return;
        this.weaponWheelOverlay.style.display = 'flex';
        const cur = this.game.weapons.getCurrentWeapon();
        const slots = document.querySelectorAll('.wheel-slot');
        slots.forEach((s, i) => {
            const unlocked = this.game.weapons.inventory[i].unlocked;
            s.style.opacity = unlocked ? '1' : '0.35';
            s.classList.toggle('selected', cur && cur.id === i);
        });
    }

    hideWeaponWheel() {
        if (this.weaponWheelOverlay) {
            this.weaponWheelOverlay.style.display = 'none';
        }
    }

    initCheatsModal() {
        const grid = document.getElementById('cheat-grid');
        if (!grid) return;
        grid.innerHTML = '';

        CHEAT_CODES.forEach(c => {
            const card = document.createElement('div');
            card.className = 'cheat-card';
            card.innerHTML = `
                <div>
                    <div class="cheat-desc" style="font-weight: 700;">${c.name}</div>
                    <div class="cheat-desc">${c.desc}</div>
                </div>
                <div class="cheat-code">${c.code}</div>
            `;
            const act = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.game.cheats.activateCheat(c.code);
            };
            card.addEventListener('click', act);
            card.addEventListener('touchend', act);
            grid.appendChild(card);
        });
    }

    initSettingsModal() {
        const introSelect = document.getElementById('intro-gfx-select');
        if (introSelect) {
            introSelect.value = this.graphicsQuality;
            introSelect.addEventListener('change', (e) => {
                this.setGraphicsQuality(e.target.value);
            });
        }

        const gfxBtns = document.querySelectorAll('.gfx-btn');
        gfxBtns.forEach(btn => {
            const q = btn.dataset.quality;
            btn.classList.toggle('active', q === this.graphicsQuality);

            const selectGfx = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.setGraphicsQuality(q);
                gfxBtns.forEach(b => b.classList.toggle('active', b.dataset.quality === q));
            };

            btn.addEventListener('click', selectGfx);
            btn.addEventListener('touchend', selectGfx);
        });

        // Audio Sliders
        const masterSlider = document.getElementById('slider-master-vol');
        if (masterSlider) {
            masterSlider.addEventListener('input', (e) => {
                soundEngine.setMasterVolume(parseFloat(e.target.value));
            });
        }
        const sfxSlider = document.getElementById('slider-sfx-vol');
        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                soundEngine.setSfxVolume(parseFloat(e.target.value));
            });
        }
        const musicSlider = document.getElementById('slider-music-vol');
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                soundEngine.setMusicVolume(parseFloat(e.target.value));
            });
        }

        // Camera FOV & Distance Sliders
        const fovSlider = document.getElementById('slider-fov');
        if (fovSlider) {
            fovSlider.addEventListener('input', (e) => {
                const fov = parseFloat(e.target.value);
                this.game.camera.fov = fov;
                this.game.camera.updateProjectionMatrix();
            });
        }
        const camDistSlider = document.getElementById('slider-cam-dist');
        if (camDistSlider) {
            camDistSlider.addEventListener('input', (e) => {
                this.game.cameraDist = parseFloat(e.target.value);
            });
        }
    }

    setGraphicsQuality(quality) {
        this.graphicsQuality = quality;
        localStorage.setItem('gta_graphics_quality', quality);
        this.game.applyGraphicsSettings(quality);
        this.showNotification(`GRAPHICS SET TO: ${quality.toUpperCase()}`);

        const introSelect = document.getElementById('intro-gfx-select');
        if (introSelect) introSelect.value = quality;

        const gfxBtns = document.querySelectorAll('.gfx-btn');
        gfxBtns.forEach(b => b.classList.toggle('active', b.dataset.quality === quality));
    }

    openSettingsModal() {
        if (this.settingsModal) this.settingsModal.style.display = 'flex';
    }

    closeSettingsModal() {
        if (this.settingsModal) this.settingsModal.style.display = 'none';
    }

    openCheatsModal() {
        if (this.cheatsModal) this.cheatsModal.style.display = 'flex';
    }

    closeCheatsModal() {
        if (this.cheatsModal) this.cheatsModal.style.display = 'none';
    }

    initMapModal() {
        // Map modal setup
    }

    toggleMapModal() {
        if (this.mapModal && this.mapModal.style.display === 'flex') {
            this.closeMapModal();
        } else {
            this.openMapModal();
        }
    }

    openMapModal() {
        if (this.mapModal) {
            this.mapModal.style.display = 'flex';
            this.drawFullMap();
        }
    }

    closeMapModal() {
        if (this.mapModal) {
            this.mapModal.style.display = 'none';
        }
    }

    initTouchControls() {
        const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        const touchUI = document.getElementById('touch-controls');
        const touchAimZone = document.getElementById('touch-aim-zone');

        if (isTouchDevice || window.innerWidth < 1024) {
            if (touchUI) touchUI.style.display = 'block';
            if (touchAimZone) touchAimZone.style.display = 'block';
        }

        // Left Virtual Joystick with True 360 Analog Input
        const base = document.getElementById('touch-joystick-base');
        const thumb = document.getElementById('touch-joystick-thumb');
        let joystickTouchId = null;
        let joyStartX = 0;
        let joyStartY = 0;

        if (base && thumb) {
            base.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const t = e.changedTouches[0];
                joystickTouchId = t.identifier;
                const rect = base.getBoundingClientRect();
                joyStartX = rect.left + rect.width / 2;
                joyStartY = rect.top + rect.height / 2;
            }, { passive: false });

            base.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === joystickTouchId) {
                        const dx = t.clientX - joyStartX;
                        const dy = t.clientY - joyStartY;
                        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 36);
                        const angle = Math.atan2(dy, dx);

                        thumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;

                        const maxDist = 36;
                        if (dist > 4) {
                            this.game.input.moveX = dx / maxDist;
                            this.game.input.moveZ = dy / maxDist;
                            this.game.input.forward = dy < -10;
                            this.game.input.backward = dy > 10;
                            this.game.input.left = dx < -10;
                            this.game.input.right = dx > 10;
                        } else {
                            this.game.input.moveX = 0;
                            this.game.input.moveZ = 0;
                            this.game.input.forward = false;
                            this.game.input.backward = false;
                            this.game.input.left = false;
                            this.game.input.right = false;
                        }
                    }
                }
            }, { passive: false });

            const endJoystick = (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickTouchId) {
                        joystickTouchId = null;
                        thumb.style.transform = `translate(0px, 0px)`;
                        this.game.input.moveX = 0;
                        this.game.input.moveZ = 0;
                        this.game.input.forward = false;
                        this.game.input.backward = false;
                        this.game.input.left = false;
                        this.game.input.right = false;
                    }
                }
            };

            base.addEventListener('touchend', endJoystick, { passive: false });
            base.addEventListener('touchcancel', endJoystick, { passive: false });
        }

        // Right Swipe for Camera Look
        if (touchAimZone) {
            let aimTouchId = null;
            let lastAimX = 0;
            let lastAimY = 0;

            touchAimZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const t = e.changedTouches[0];
                aimTouchId = t.identifier;
                lastAimX = t.clientX;
                lastAimY = t.clientY;
            }, { passive: false });

            touchAimZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === aimTouchId) {
                        const dx = t.clientX - lastAimX;
                        const dy = t.clientY - lastAimY;
                        lastAimX = t.clientX;
                        lastAimY = t.clientY;

                        const sens = 0.0055;
                        this.game.cameraYaw -= dx * sens;
                        this.game.cameraPitch = Math.min(Math.max(this.game.cameraPitch + dy * sens, -0.25), 1.2);
                    }
                }
            }, { passive: false });

            const endAim = (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === aimTouchId) {
                        aimTouchId = null;
                    }
                }
            };
            touchAimZone.addEventListener('touchend', endAim, { passive: false });
            touchAimZone.addEventListener('touchcancel', endAim, { passive: false });
        }

        const bindTouchBtn = (id, onDown, onUp) => {
            const el = document.getElementById(id);
            if (!el) return;

            const handleDown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onDown) onDown();
            };

            const handleUp = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onUp) onUp();
            };

            el.addEventListener('touchstart', handleDown, { passive: false });
            el.addEventListener('touchend', handleUp, { passive: false });
            el.addEventListener('touchcancel', handleUp, { passive: false });
            el.addEventListener('mousedown', handleDown);
            el.addEventListener('mouseup', handleUp);
        };

        bindTouchBtn('touch-btn-shoot', () => { this.game.input.shoot = true; }, () => { this.game.input.shoot = false; });
        bindTouchBtn('touch-btn-aim', () => { this.game.input.aim = !this.game.input.aim; });
        bindTouchBtn('touch-btn-enter', () => {
            if (!this.game.player.inVehicle) {
                this.game.vehicles.jackNearestVehicle(this.game.player.position, (npc) => {
                    this.game.pedestrians.damagePedestrian(npc, 10, this.game.player.position);
                });
            }
            this.game.player.toggleVehicle();
        });
        bindTouchBtn('touch-btn-jump', () => { this.game.input.jump = true; this.game.input.handbrake = true; }, () => { this.game.input.jump = false; this.game.input.handbrake = false; });
        bindTouchBtn('touch-btn-sprint', () => { this.game.input.sprint = true; }, () => { this.game.input.sprint = false; });
        bindTouchBtn('touch-btn-weapon', () => { this.showWeaponWheel(); });
        bindTouchBtn('touch-btn-cam', () => { this.game.cycleCamera(); });
        bindTouchBtn('touch-btn-radio', () => { const st = soundEngine.nextRadioStation(); this.showRadioHUD(st); });
    }

    showNotification(text) {
        if (!this.notificationBox) return;
        this.notificationBox.textContent = text;
        this.notificationBox.style.display = 'block';
        if (this.notifTimer) clearTimeout(this.notifTimer);
        this.notifTimer = setTimeout(() => {
            this.notificationBox.style.display = 'none';
        }, 3000);
    }

    showMissionBanner(title, objective) {
        if (!this.missionBanner) return;
        this.missionTitle.textContent = title;
        this.missionObjective.textContent = objective;
        this.missionBanner.style.display = 'flex';
        setTimeout(() => {
            if (this.missionBanner) this.missionBanner.style.display = 'none';
        }, 6000);
    }

    hideMissionBanner() {
        if (this.missionBanner) this.missionBanner.style.display = 'none';
    }

    showRadioHUD(station) {
        if (!this.radioHud || !this.radioStationName) return;
        this.radioStationName.textContent = station.name;
        if (this.radioStationGenre) this.radioStationGenre.textContent = station.genre;
        this.radioHud.style.display = 'flex';
        if (this.radioHudTimer) clearTimeout(this.radioHudTimer);
        this.radioHudTimer = setTimeout(() => {
            this.radioHud.style.display = 'none';
        }, 3000);
    }

    showMissionPassedOverlay(title, rewardText) {
        const titleEl = document.getElementById('passed-mission-title');
        const rewEl = document.getElementById('passed-rewards');
        if (titleEl) titleEl.textContent = title;
        if (rewEl) rewEl.textContent = rewardText;
        if (this.missionPassedOverlay) this.missionPassedOverlay.style.display = 'flex';

        setTimeout(() => {
            if (this.missionPassedOverlay) this.missionPassedOverlay.style.display = 'none';
        }, 4000);
    }

    triggerHitMarker() {
        const hm = document.getElementById('hitmarker');
        if (!hm) return;
        hm.style.transform = 'translate(-50%, -50%) scale(1.3)';
        setTimeout(() => {
            hm.style.transform = 'translate(-50%, -50%) scale(0)';
        }, 90);
    }

    update(delta) {
        const p = this.game.player;
        const v = this.game.vehicles.activeVehicle;
        const pol = this.game.police;
        const wp = this.game.weapons;

        if (this.displayedMoney !== p.money) {
            const diff = p.money - this.displayedMoney;
            this.displayedMoney += Math.ceil(diff * Math.min(delta * 12, 1));
            if (this.moneyEl) this.moneyEl.textContent = `$${this.displayedMoney.toLocaleString()}`;
        }

        if (this.healthBar) this.healthBar.style.width = `${Math.max(0, (p.health / p.maxHealth) * 100)}%`;
        if (this.armorBar) this.armorBar.style.width = `${Math.max(0, (p.armor / p.maxArmor) * 100)}%`;
        if (this.staminaBar) this.staminaBar.style.width = `${Math.max(0, (p.stamina / p.maxStamina) * 100)}%`;

        if (this.wantedStars) {
            this.wantedStars.forEach((star, idx) => {
                const starNum = idx + 1;
                star.classList.toggle('active', starNum <= pol.wantedLevel);
                star.classList.toggle('flashing', starNum <= pol.wantedLevel && pol.isFlashing);
            });
        }

        const curW = wp ? wp.getCurrentWeapon() : null;
        if (curW) {
            if (this.weaponIcon) this.weaponIcon.textContent = curW.icon;
            if (this.ammoCurrent) {
                this.ammoCurrent.textContent = (curW.type === 'melee') ? "∞" : curW.ammoInMag;
            }
            if (this.ammoReserve) {
                this.ammoReserve.textContent = (curW.type === 'melee') ? "" : curW.reserveAmmo;
            }
        }

        if (this.vehicleHud) {
            if (v) {
                this.vehicleHud.style.display = 'flex';
                if (this.vehicleName) this.vehicleName.textContent = v.name;
                const speedMph = Math.round(Math.abs(v.speed) * 2.236);
                if (this.speedoVal) this.speedoVal.textContent = speedMph;
                if (this.nitroBar) this.nitroBar.style.width = `${v.nitro}%`;
            } else {
                this.vehicleHud.style.display = 'none';
            }
        }

        if (this.wastedScreen) {
            this.wastedScreen.style.display = p.isWasted ? 'flex' : 'none';
        }

        const sniperScope = document.getElementById('sniper-scope');
        if (sniperScope) {
            sniperScope.style.display = (curW && curW.type === 'sniper' && this.game.input.aim) ? 'block' : 'none';
        }

        this.drawRadar();

        if (this.mapModal && this.mapModal.style.display === 'flex') {
            this.drawFullMap();
        }
    }

    drawRadar() {
        if (!this.radarCtx) return;
        const ctx = this.radarCtx;
        const size = this.radarSize;
        const center = size / 2;
        const zoom = 0.45;

        const p = this.game.player;
        const playerX = p.position.x;
        const playerZ = p.position.z;
        const heading = p.facingAngle;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#1e272e';
        ctx.fillRect(0, 0, size, size);

        ctx.translate(center, center);
        ctx.rotate(-heading);

        ctx.strokeStyle = '#485460';
        ctx.lineWidth = 12 * zoom;
        ctx.lineCap = 'round';

        [-360, -180, 0, 180, 360].forEach(rz => {
            ctx.beginPath();
            ctx.moveTo((-500 - playerX) * zoom, (rz - playerZ) * zoom);
            ctx.lineTo((500 - playerX) * zoom, (rz - playerZ) * zoom);
            ctx.stroke();
        });

        [-360, -180, 0, 180, 360].forEach(rx => {
            ctx.beginPath();
            ctx.moveTo((rx - playerX) * zoom, (-500 - playerZ) * zoom);
            ctx.lineTo((rx - playerX) * zoom, (500 - playerZ) * zoom);
            ctx.stroke();
        });

        ctx.fillStyle = '#0f141d';
        for (let b of this.game.city.colliders) {
            if (b.type === 'building' || b.type === 'house' || b.type === 'hangar') {
                const bx = (b.minX - playerX) * zoom;
                const bz = (b.minZ - playerZ) * zoom;
                const bw = (b.maxX - b.minX) * zoom;
                const bd = (b.maxZ - b.minZ) * zoom;
                ctx.fillRect(bx, bz, bw, bd);
            }
        }

        const cp = this.game.missions.getCurrentCheckpoint();
        if (cp) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3.0;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo((cp.x - playerX) * zoom, (cp.z - playerZ) * zoom);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc((cp.x - playerX) * zoom, (cp.z - playerZ) * zoom, 5.5, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let v of this.game.vehicles.vehicles) {
            if (v.isDestroyed || v === this.game.vehicles.activeVehicle) continue;
            const vx = (v.group.position.x - playerX) * zoom;
            const vz = (v.group.position.z - playerZ) * zoom;
            ctx.fillStyle = (v.type === 'police' || v.type === 'swat') ? '#ff3838' : '#ffffff';
            ctx.beginPath();
            ctx.arc(vx, vz, 2.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(center, center - 6);
        ctx.lineTo(center - 4, center + 5);
        ctx.lineTo(center + 4, center + 5);
        ctx.closePath();
        ctx.fill();
    }

    drawFullMap() {
        if (!this.fullMapCtx) return;
        const ctx = this.fullMapCtx;
        const w = this.fullMapCanvas.width;
        const h = this.fullMapCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 0.38;

        ctx.clearRect(0, 0, w, h);

        // Map Background & Grid
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, w, h);

        // Ocean on East
        ctx.fillStyle = '#0984e3';
        ctx.fillRect(cx + 380 * scale, 0, w - (cx + 380 * scale), h);

        // Roads
        ctx.strokeStyle = '#3d4852';
        ctx.lineWidth = 14 * scale;
        ctx.lineCap = 'round';

        [-360, -180, 0, 180, 360].forEach(z => {
            ctx.beginPath();
            ctx.moveTo(cx - 450 * scale, cy + z * scale);
            ctx.lineTo(cx + 380 * scale, cy + z * scale);
            ctx.stroke();
        });

        [-360, -180, 0, 180, 360].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(cx + x * scale, cy - 450 * scale);
            ctx.lineTo(cx + x * scale, cy + 450 * scale);
            ctx.stroke();
        });

        // Buildings
        ctx.fillStyle = '#1e272e';
        for (let b of this.game.city.colliders) {
            const bx = cx + b.minX * scale;
            const bz = cy + b.minZ * scale;
            const bw = (b.maxX - b.minX) * scale;
            const bd = (b.maxZ - b.minZ) * scale;
            ctx.fillRect(bx, bz, bw, bd);
        }

        // District Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 10px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DOWNTOWN PLAZA', cx, cy - 40 * scale);
        ctx.fillText('OCEAN DRIVE', cx + 300 * scale, cy);
        ctx.fillText('DOCKS & PORT', cx + 100 * scale, cy + 300 * scale);
        ctx.fillText('MILITARY AIRBASE', cx - 270 * scale, cy + 270 * scale);

        // Points of Interest Blips
        // Ammu-Nation (0, -270)
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(cx + 0 * scale, cy - 270 * scale, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('AMMU-NATION', cx + 0 * scale, cy - 280 * scale);

        // Pay 'n' Spray (-270, 0)
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(cx - 270 * scale, cy + 0 * scale, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText("PAY 'N' SPRAY", cx - 270 * scale, cy - 10 * scale);

        // Mission Checkpoint
        const cp = this.game.missions.getCurrentCheckpoint();
        if (cp) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(cx + cp.x * scale, cy + cp.z * scale, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.fillText('MISSION OBJECTIVE', cx + cp.x * scale, cy + cp.z * scale - 12);
        }

        // Player Blip
        const p = this.game.player;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(cx + p.position.x * scale, cy + p.position.z * scale, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('YOU', cx + p.position.x * scale, cy + p.position.z * scale + 14);
    }
}
