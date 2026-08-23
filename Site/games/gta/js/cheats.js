import { soundEngine } from './audio.js';

export const CHEAT_CODES = [
    { code: "HESOYAM", name: "Health, Armor & $250k", desc: "Max Health, Armor, and +$250,000 Cash" },
    { code: "PANZER", name: "Spawn Rhino Tank", desc: "Spawns a heavy military combat tank" },
    { code: "BUZZOFF", name: "Spawn Attack Chopper", desc: "Spawns an armed military helicopter" },
    { code: "FASTCAR", name: "Spawn Supercar", desc: "Spawns an Infernus sports car" },
    { code: "GUNSGUNSGUNS", name: "All Weapons & Ammo", desc: "Unlocks all 8 weapons with maximum ammo" },
    { code: "TURBO", name: "Nitro Boost", desc: "Refills Nitro and boosts current vehicle" },
    { code: "LAWYERUP", name: "Clear Wanted Level", desc: "Removes all police wanted stars" },
    { code: "FUGITIVE", name: "5-Star Wanted Level", desc: "Instantly triggers maximum military alert" },
    { code: "SLOWMO", name: "Bullet Time", desc: "Toggles Matrix slow-motion mode" },
    { code: "SUNNY", name: "Sunny Noon", desc: "Sets clear blue sunny weather" },
    { code: "RAIN", name: "Thunderstorm", desc: "Triggers heavy rain and lightning storm" },
    { code: "NIGHT", name: "Midnight Neon", desc: "Sets night time with illuminated neon signs" }
];

export class CheatSystem {
    constructor(game) {
        this.game = game;
        this.buffer = "";
        this.isSlowMo = false;

        this.initKeyBuffer();
    }

    initKeyBuffer() {
        window.addEventListener('keydown', (e) => {
            if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                this.buffer += e.key.toUpperCase();
                if (this.buffer.length > 20) {
                    this.buffer = this.buffer.slice(-20);
                }
                this.checkBuffer();
            }
        });
    }

    checkBuffer() {
        for (let c of CHEAT_CODES) {
            if (this.buffer.endsWith(c.code)) {
                this.activateCheat(c.code);
                this.buffer = "";
                break;
            }
        }
    }

    activateCheat(code) {
        soundEngine.playMoneySound();
        const p = this.game.player;
        const v = this.game.vehicles;
        const pol = this.game.police;
        const w = this.game.weather;
        const wp = this.game.weapons;

        let cheatName = code;

        switch (code) {
            case "HESOYAM":
                p.health = p.maxHealth;
                p.armor = p.maxArmor;
                p.addMoney(250000);
                cheatName = "HEALTH, ARMOR & $250,000";
                break;

            case "PANZER":
                v.createVehicle('tank', p.position.x + 8, 0.5, p.position.z + 8, 0, 0x4b6584, "Cheat Rhino Tank");
                cheatName = "RHINO TANK SPAWNED";
                break;

            case "BUZZOFF":
                v.createVehicle('helicopter', p.position.x + 10, 0.5, p.position.z + 10, 0, 0x222f3e, "Cheat Attack Chopper");
                cheatName = "ATTACK CHOPPER SPAWNED";
                break;

            case "FASTCAR":
                v.createVehicle('supercar', p.position.x + 6, 0.5, p.position.z + 6, 0, 0xff4757, "Cheat Supercar");
                cheatName = "INFERNUS SUPERCAR SPAWNED";
                break;

            case "GUNSGUNSGUNS":
                wp.unlockAllWeapons();
                cheatName = "ALL WEAPONS & MAX AMMO";
                break;

            case "TURBO":
                if (p.inVehicle) {
                    p.inVehicle.nitro = 100;
                    p.inVehicle.speed = p.inVehicle.maxSpeed * 1.5;
                }
                cheatName = "SUPER NITRO ACTIVATED";
                break;

            case "LAWYERUP":
                pol.clearWantedLevel();
                cheatName = "WANTED LEVEL CLEARED";
                break;

            case "FUGITIVE":
                pol.setWantedLevel(5);
                pol.evadeTimer = 40;
                cheatName = "5-STAR WANTED LEVEL TRIGGERED";
                break;

            case "SLOWMO":
                this.isSlowMo = !this.isSlowMo;
                this.game.timeScale = this.isSlowMo ? 0.35 : 1.0;
                cheatName = this.isSlowMo ? "MATRIX BULLET TIME ON" : "BULLET TIME OFF";
                break;

            case "SUNNY":
                w.setWeather('sunny');
                cheatName = "WEATHER: SUNNY NOON";
                break;

            case "RAIN":
                w.setWeather('rain');
                cheatName = "WEATHER: THUNDERSTORM";
                break;

            case "NIGHT":
                w.setWeather('night');
                cheatName = "WEATHER: MIDNIGHT";
                break;
        }

        this.game.ui.showNotification("CHEAT ACTIVATED: " + cheatName);
    }
}
