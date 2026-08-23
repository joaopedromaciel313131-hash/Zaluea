/**
 * APEX CITY: OVERDRIVE - High-Performance Procedural Audio Engine
 * Pure Web Audio synthesizer: Dynamic Engines, Gunfire, Sirens, Radio Stations, Footsteps & SFX
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.engineGain = null;
        this.limiter = null;
        this.initialized = false;

        // Volumes (0.0 to 1.0)
        this.masterVolume = 0.8;
        this.sfxVolume = 0.85;
        this.musicVolume = 0.55;

        // Vehicle Engine Audio Nodes
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;
        this.engineNoise = null;
        this.engineNoiseGain = null;
        this.isEngineRunning = false;

        // Drift Skid Nodes
        this.skidSource = null;
        this.skidGain = null;
        this.skidFilter = null;

        // Radio Stations
        this.radioStations = [
            { id: 0, name: "Flash FM", genre: "80s Synthwave & Retro Pop", bpm: 120 },
            { id: 1, name: "Radio Los Santos", genre: "West Coast Hip-Hop & Beats", bpm: 94 },
            { id: 2, name: "K-DST Rock", genre: "Classic Heavy Rock & Riffs", bpm: 128 },
            { id: 3, name: "Electro Choc", genre: "Cyberpunk Techno & EDM", bpm: 130 },
            { id: 4, name: "Jazz Lounge FM", genre: "Late Night Noir Jazz", bpm: 85 },
            { id: 5, name: "San Andreas Talk", genre: "Satirical Talk & News", bpm: 100 },
            { id: -1, name: "Radio OFF", genre: "Muted", bpm: 0 }
        ];
        this.currentStationIndex = 0;
        this.radioTimer = null;
        this.radioActive = false;
        this.radioStep = 0;

        // Footstep throttle
        this.lastFootstepTime = 0;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            // Soft Limiter / Compressor to avoid clipping
            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.setValueAtTime(-3, this.ctx.currentTime);
            this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
            this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
            this.limiter.release.setValueAtTime(0.2, this.ctx.currentTime);
            this.limiter.connect(this.ctx.destination);

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
            this.masterGain.connect(this.limiter);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
            this.engineGain.connect(this.masterGain);

            this.initSkidSound();
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API unavailable:", e);
        }
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
        }
    }

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
        }
    }

    setMusicVolume(val) {
        this.musicVolume = Math.max(0, Math.min(1, val));
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
        }
    }

    createNoiseBuffer(seconds = 1.5) {
        if (!this.ctx) return null;
        const size = Math.floor(this.ctx.sampleRate * seconds);
        const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buf;
    }

    // ----------------------------------------------------
    // VEHICLE ENGINE PROCEDURAL SYNTHESIS
    // ----------------------------------------------------
    startEngineSound() {
        if (!this.initialized || this.isEngineRunning) return;
        this.resume();
        if (!this.ctx) return;

        try {
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc2.type = 'triangle';
            this.engineOsc1.frequency.setValueAtTime(40, this.ctx.currentTime);
            this.engineOsc2.frequency.setValueAtTime(80, this.ctx.currentTime);

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
            this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

            const noiseBuf = this.createNoiseBuffer(1.5);
            if (noiseBuf) {
                this.engineNoise = this.ctx.createBufferSource();
                this.engineNoise.buffer = noiseBuf;
                this.engineNoise.loop = true;

                const nFilter = this.ctx.createBiquadFilter();
                nFilter.type = 'bandpass';
                nFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

                this.engineNoiseGain = this.ctx.createGain();
                this.engineNoiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

                this.engineNoise.connect(nFilter);
                nFilter.connect(this.engineNoiseGain);
                this.engineNoiseGain.connect(this.engineGain);
                this.engineNoise.start();
            }

            this.engineOsc1.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);

            this.engineGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

            this.engineOsc1.start();
            this.engineOsc2.start();
            this.isEngineRunning = true;
        } catch (e) {}
    }

    updateEngineSound(speedRatio, throttle, isBoosting) {
        if (!this.isEngineRunning || !this.ctx) return;
        const now = this.ctx.currentTime;

        const baseFreq = 38 + speedRatio * 95 + (throttle ? 24 : 0) + (isBoosting ? 45 : 0);
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.06);

        const filterFreq = 190 + speedRatio * 800 + (throttle ? 280 : 0) + (isBoosting ? 500 : 0);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);

        const vol = 0.16 + speedRatio * 0.22 + (throttle ? 0.08 : 0) + (isBoosting ? 0.18 : 0);
        this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
    }

    stopEngineSound() {
        if (!this.isEngineRunning || !this.ctx) return;
        try {
            this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
            if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); }
            if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); }
            if (this.engineNoise) { this.engineNoise.stop(); this.engineNoise.disconnect(); }
        } catch (e) {}
        this.isEngineRunning = false;
    }

    // ----------------------------------------------------
    // TIRE DRIFT SKID SOUND
    // ----------------------------------------------------
    initSkidSound() {
        if (!this.ctx) return;
        const buf = this.createNoiseBuffer(1.5);
        if (!buf) return;

        this.skidSource = this.ctx.createBufferSource();
        this.skidSource.buffer = buf;
        this.skidSource.loop = true;

        this.skidFilter = this.ctx.createBiquadFilter();
        this.skidFilter.type = 'bandpass';
        this.skidFilter.frequency.setValueAtTime(850, this.ctx.currentTime);
        this.skidFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        this.skidGain = this.ctx.createGain();
        this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.skidSource.connect(this.skidFilter);
        this.skidFilter.connect(this.skidGain);
        this.skidGain.connect(this.sfxGain);
        this.skidSource.start();
    }

    updateSkidSound(intensity) {
        if (!this.skidGain || !this.ctx) return;
        const gain = Math.min(Math.max(intensity, 0), 1) * 0.3;
        this.skidGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
    }

    // ----------------------------------------------------
    // FOOTSTEPS AUDIO
    // ----------------------------------------------------
    playFootstep(isSprinting = false) {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastFootstepTime < (isSprinting ? 0.24 : 0.36)) return;
        this.lastFootstepTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110 + Math.random() * 30, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // ----------------------------------------------------
    // WEAPONS SOUND EFFECTS
    // ----------------------------------------------------
    playPistolShot() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);
        gain.gain.setValueAtTime(0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);

        this.playNoiseCrack(0.16, 1400, 0.55);
    }

    playSMGShot() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.07);

        this.playNoiseCrack(0.09, 1900, 0.45);
    }

    playShotgunShot() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.26);
        gain.gain.setValueAtTime(0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.26);

        this.playNoiseCrack(0.32, 750, 0.85);
    }

    playRifleShot() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.14);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.14);

        this.playNoiseCrack(0.2, 1500, 0.65);
    }

    playSniperShot() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.42);
        gain.gain.setValueAtTime(0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.42);

        this.playNoiseCrack(0.45, 950, 0.95);
    }

    playRPGLaunch() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(380, now + 0.35);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);

        this.playNoiseCrack(0.35, 650, 0.65);
    }

    playExplosion() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.85);
        gain.gain.setValueAtTime(1.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.85);

        const buf = this.createNoiseBuffer(1.0);
        if (buf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 1.0);

            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.9, now);
            nGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 1.0);
        }
    }

    playPunch() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playCarCrash(severity = 1.0) {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(125, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.32);
        gain.gain.setValueAtTime(0.75 * severity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.32);

        this.playNoiseCrack(0.32, 1100, 0.75 * severity);
    }

    playHorn() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(430, now);
        osc2.frequency.setValueAtTime(540, now);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.setValueAtTime(0.35, now + 0.3);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    }

    playSiren(type = 'wail') {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';

        if (type === 'wail') {
            osc.frequency.setValueAtTime(620, now);
            osc.frequency.linearRampToValueAtTime(1180, now + 0.75);
            osc.frequency.linearRampToValueAtTime(620, now + 1.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 1.4);
            gain.gain.linearRampToValueAtTime(0.01, now + 1.5);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 1.5);
        } else {
            osc.frequency.setValueAtTime(720, now);
            osc.frequency.linearRampToValueAtTime(1380, now + 0.24);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.24);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.24);
        }
    }

    playMoneySound() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        [880, 1175, 1568].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.065);
            gain.gain.setValueAtTime(0.28, now + i * 0.065);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.065 + 0.18);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.065);
            osc.stop(now + i * 0.065 + 0.18);
        });
    }

    playMissionPassedSound() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const notes = [
            { f: 523.25, t: 0.0, d: 0.18 },
            { f: 659.25, t: 0.14, d: 0.18 },
            { f: 783.99, t: 0.28, d: 0.22 },
            { f: 1046.5, t: 0.45, d: 0.5 },
            { f: 987.77, t: 1.0, d: 0.25 },
            { f: 1046.5, t: 1.3, d: 0.8 }
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now + n.t);
            gain.gain.setValueAtTime(0.45, now + n.t);
            gain.gain.exponentialRampToValueAtTime(0.01, now + n.t + n.d);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + n.t);
            osc.stop(now + n.t + n.d);
        });
    }

    playWastedSound() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 1.6);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 1.6);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 1.6);
    }

    playNoiseCrack(duration, filterFreq, volume) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const buf = this.createNoiseBuffer(duration);
        if (!buf) return;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + duration);
    }

    // ----------------------------------------------------
    // GTA RADIO STATIONS
    // ----------------------------------------------------
    setRadioStation(index) {
        this.currentStationIndex = index;
        if (index === -1 || index >= this.radioStations.length - 1) {
            this.stopRadio();
            return { name: "Radio OFF", genre: "Muted" };
        }
        this.startRadio();
        return this.radioStations[index];
    }

    nextRadioStation() {
        let next = (this.currentStationIndex + 1) % this.radioStations.length;
        return this.setRadioStation(next);
    }

    startRadio() {
        if (!this.initialized) this.init();
        this.resume();
        this.stopRadio();
        this.radioActive = true;
        this.radioStep = 0;
        this.tickRadio();
    }

    stopRadio() {
        this.radioActive = false;
        if (this.radioTimer) {
            clearTimeout(this.radioTimer);
            this.radioTimer = null;
        }
    }

    tickRadio() {
        if (!this.radioActive || !this.ctx) return;
        const station = this.radioStations[this.currentStationIndex];
        if (!station || station.id === -1) return;

        const now = this.ctx.currentTime;
        const step = this.radioStep % 16;
        const bpm = station.bpm;
        const stepTime = (60 / bpm) / 4;

        switch (station.id) {
            case 0: this.playSynthwaveStep(step, now); break;
            case 1: this.playHipHopStep(step, now); break;
            case 2: this.playRockStep(step, now); break;
            case 3: this.playEDMStep(step, now); break;
            case 4: this.playJazzStep(step, now); break;
            case 5: this.playTalkStep(step, now); break;
        }

        this.radioStep++;
        this.radioTimer = setTimeout(() => {
            this.tickRadio();
        }, stepTime * 1000);
    }

    playSynthwaveStep(step, now) {
        const bassNotes = [110, 110, 110, 110, 87.31, 87.31, 98, 98];
        const note = bassNotes[Math.floor(step / 2) % bassNotes.length];

        if (step % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.18);
        }

        if (step % 4 === 0) this.playKick(now);
        if (step === 4 || step === 12) this.playSnare(now);
        if (step % 2 === 1) this.playHihat(now);
    }

    playHipHopStep(step, now) {
        if (step === 0 || step === 6 || step === 10) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.32);
            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.32);
        }
        if (step === 4 || step === 12) this.playSnare(now);
        if (step % 2 === 0 || step === 7 || step === 15) this.playHihat(now, 0.08);
    }

    playRockStep(step, now) {
        if (step === 0 || step === 6 || step === 8 || step === 14) {
            [146.83, 220.00, 293.66].forEach(f => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(now);
                osc.stop(now + 0.22);
            });
        }
        if (step % 4 === 0) this.playKick(now);
        if (step === 4 || step === 12) this.playSnare(now);
    }

    playEDMStep(step, now) {
        const arp = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 523.25];
        const note = arp[step % arp.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.09);

        if (step % 4 === 0) this.playKick(now);
        if (step % 2 === 1) this.playHihat(now);
    }

    playJazzStep(step, now) {
        const bass = [98, 110, 123.47, 130.81, 146.83, 130.81, 123.47, 110];
        if (step % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(bass[Math.floor(step / 2) % bass.length], now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.28);
        }
        if (step % 3 === 0) this.playHihat(now, 0.06);
    }

    playTalkStep(step, now) {
        if (step % 3 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            const speechFreq = 160 + (step * 37) % 240;
            osc.frequency.setValueAtTime(speechFreq, now);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.08);
        }
    }

    playKick(now) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.14);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    playSnare(now) {
        this.playNoiseCrack(0.11, 1000, 0.22);
    }

    playHihat(now, vol = 0.08) {
        this.playNoiseCrack(0.035, 5000, vol);
    }
}

export const soundEngine = new SoundEngine();
