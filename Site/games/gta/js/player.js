import * as THREE from './three.module.js';
import { soundEngine } from './audio.js';

export class PlayerCharacter {
    constructor(scene, cityWorld, vehicleManager, weaponManager) {
        this.scene = scene;
        this.city = cityWorld;
        this.vehicles = vehicleManager;
        this.weapons = weaponManager;

        // Player Stats
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 100;
        this.maxArmor = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.money = 5000;
        this.isWasted = false;
        this.isBusted = false;

        // Movement Physics - Spawn on open central intersection
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.walkSpeed = 6.0;
        this.sprintSpeed = 11.5;
        this.jumpForce = 8.5;
        this.isGrounded = true;
        this.isSprinting = false;
        this.isCrouching = false;
        this.isRolling = false;
        this.rollTimer = 0;
        this.facingAngle = 0;

        // Vehicle State
        this.inVehicle = null;

        // Melee Combat
        this.meleeCombo = 0;
        this.meleeTimer = 0;

        // 3D Character Mesh & Limbs
        this.group = new THREE.Group();
        this.limbs = {};
        this.weaponProps = [];
        this.buildCharacterMesh();
        this.scene.add(this.group);
    }

    buildCharacterMesh() {
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
        const jacketMat = new THREE.MeshLambertMaterial({ color: 0xd63031 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x2d3436 });
        const jeansMat = new THREE.MeshLambertMaterial({ color: 0x0984e3 });
        const shoeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const glassesMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        this.group.position.copy(this.position);

        // Hips / Pelvis
        const hips = new THREE.Group();
        hips.position.y = 0.95;
        this.group.add(hips);
        this.limbs.hips = hips;

        // Torso / Jacket
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), jacketMat);
        torso.position.y = 0.32;
        torso.castShadow = true;
        hips.add(torso);
        this.limbs.torso = torso;

        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.34), shirtMat);
        shirt.position.set(0, 0.32, 0.01);
        hips.add(shirt);

        // Head & Face (Facing +Z)
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.72, 0);
        hips.add(headGroup);
        this.limbs.head = headGroup;

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
        head.castShadow = true;
        headGroup.add(head);

        // Sunglasses on front (+Z)
        const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.1), glassesMat);
        glasses.position.set(0, 0.05, 0.16);
        headGroup.add(glasses);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.36), shirtMat);
        cap.position.set(0, 0.18, 0.02);
        headGroup.add(cap);

        // Left Arm
        const leftArm = new THREE.Group();
        leftArm.position.set(-0.38, 0.58, 0);
        const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), jacketMat);
        lShoulder.position.y = -0.22;
        lShoulder.castShadow = true;
        leftArm.add(lShoulder);
        const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), skinMat);
        lHand.position.y = -0.52;
        leftArm.add(lHand);
        hips.add(leftArm);
        this.limbs.leftArm = leftArm;

        // Right Arm (Holds weapons pointing +Z)
        const rightArm = new THREE.Group();
        rightArm.position.set(0.38, 0.58, 0);
        const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), jacketMat);
        rShoulder.position.y = -0.22;
        rShoulder.castShadow = true;
        rightArm.add(rShoulder);
        const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), skinMat);
        rHand.position.y = -0.52;
        rightArm.add(rHand);
        hips.add(rightArm);
        this.limbs.rightArm = rightArm;

        this.buildWeaponProps(rHand);

        // Legs
        const leftLeg = new THREE.Group();
        leftLeg.position.set(-0.16, 0, 0);
        const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), jeansMat);
        lThigh.position.y = -0.38;
        lThigh.castShadow = true;
        leftLeg.add(lThigh);
        const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.32), shoeMat);
        lShoe.position.set(0, -0.78, 0.05);
        leftLeg.add(lShoe);
        hips.add(leftLeg);
        this.limbs.leftLeg = leftLeg;

        const rightLeg = new THREE.Group();
        rightLeg.position.set(0.16, 0, 0);
        const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), jeansMat);
        rThigh.position.y = -0.38;
        rThigh.castShadow = true;
        rightLeg.add(rThigh);
        const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.32), shoeMat);
        rShoe.position.set(0, -0.78, 0.05);
        rightLeg.add(rShoe);
        hips.add(rightLeg);
        this.limbs.rightLeg = rightLeg;
    }

    buildWeaponProps(handGroup) {
        const darkGunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const rifleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

        const pistol = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.3), darkGunMat);
        pistol.position.set(0, -0.08, 0.16);
        handGroup.add(pistol);
        this.weaponProps[1] = pistol;

        const smg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.42), darkGunMat);
        smg.position.set(0, -0.1, 0.2);
        handGroup.add(smg);
        this.weaponProps[2] = smg;

        const shotgun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.75), rifleMat);
        shotgun.position.set(0, -0.1, 0.3);
        handGroup.add(shotgun);
        this.weaponProps[3] = shotgun;

        const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.8), darkGunMat);
        rifle.position.set(0, -0.1, 0.32);
        handGroup.add(rifle);
        this.weaponProps[4] = rifle;

        const sniper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 1.1), darkGunMat);
        sniper.position.set(0, -0.1, 0.45);
        handGroup.add(sniper);
        this.weaponProps[5] = sniper;

        const rpg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), darkGunMat);
        rpg.rotateX(Math.PI / 2);
        rpg.position.set(0, 0.05, 0.3);
        handGroup.add(rpg);
        this.weaponProps[6] = rpg;

        this.updateEquippedWeaponMesh();
    }

    updateEquippedWeaponMesh() {
        const cur = this.weapons.getCurrentWeapon();
        this.weaponProps.forEach((prop, idx) => {
            if (prop) {
                prop.visible = (cur && cur.id === idx);
            }
        });
    }

    takeDamage(amount) {
        if (this.isWasted || this.isBusted) return;

        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, amount * 0.7);
            this.armor -= armorAbsorb;
            amount -= armorAbsorb;
        }

        this.health = Math.max(0, this.health - amount);
        soundEngine.playNoiseCrack(0.08, 1600, 0.3);

        if (this.health <= 0) {
            this.triggerWasted();
        }
    }

    triggerWasted() {
        if (this.isWasted) return;
        this.isWasted = true;
        soundEngine.playWastedSound();
        soundEngine.stopEngineSound();

        this.limbs.hips.rotation.x = Math.PI / 2;
        this.limbs.hips.position.y = 0.25;

        this.money = Math.max(0, this.money - 500);

        setTimeout(() => {
            this.respawnAtHospital();
        }, 4000);
    }

    triggerBusted() {
        if (this.isBusted || this.isWasted) return;
        this.isBusted = true;
        soundEngine.stopEngineSound();

        // Confiscate weapon ammo and charge bail
        this.weapons.inventory.forEach(w => {
            if (w.type !== 'melee') {
                w.ammoInMag = 0;
                w.reserveAmmo = 0;
            }
        });
        this.money = Math.max(0, this.money - 1000);

        const bustedScreen = document.getElementById('busted-screen');
        if (bustedScreen) bustedScreen.style.display = 'flex';

        setTimeout(() => {
            if (bustedScreen) bustedScreen.style.display = 'none';
            this.isBusted = false;
            this.respawnAtHospital();
        }, 4000);
    }

    respawnAtHospital() {
        this.health = this.maxHealth;
        this.armor = 50;
        this.isWasted = false;
        this.isBusted = false;
        this.position.set(0, 0, -260); // Near Ammu-Nation
        this.group.position.copy(this.position);
        this.limbs.hips.rotation.x = 0;
        this.limbs.hips.position.y = 0.95;
    }

    addMoney(amount) {
        this.money += amount;
        soundEngine.playMoneySound();
    }

    toggleVehicle() {
        if (this.inVehicle) {
            const v = this.inVehicle;
            this.inVehicle = null;
            v.driver = null;
            this.vehicles.activeVehicle = null;
            soundEngine.stopEngineSound();

            const exitOffset = new THREE.Vector3(2.2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.group.rotation.y);
            this.position.copy(v.group.position).add(exitOffset);
            this.position.y = 0;
            this.group.position.copy(this.position);
            this.group.visible = true;
            return;
        }

        const nearbyVehicle = this.vehicles.findNearestVehicle(this.position, 6.0);
        if (nearbyVehicle) {
            this.inVehicle = nearbyVehicle;
            nearbyVehicle.driver = this;
            this.vehicles.activeVehicle = nearbyVehicle;
            this.group.visible = false;
            soundEngine.startEngineSound();
        }
    }

    performMeleePunch(onHitCallback) {
        this.meleeCombo = (this.meleeCombo + 1) % 3;
        this.meleeTimer = 0.28;

        if (this.meleeCombo === 1) {
            this.limbs.rightArm.rotation.x = -Math.PI / 2;
        } else {
            this.limbs.leftArm.rotation.x = -Math.PI / 2;
        }

        // Forward attack vector in direction character is facing (+Z rotated by facingAngle)
        const forward = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
        this.weapons.shoot(this.position.clone().add(new THREE.Vector3(0, 1.4, 0)), forward, onHitCallback);
    }

    performRoll() {
        if (this.isRolling || !this.isGrounded) return;
        this.isRolling = true;
        this.rollTimer = 0.4;
        soundEngine.playNoiseCrack(0.1, 1100, 0.25);
    }

    // ----------------------------------------------------
    // PLAYER CONTROLLER: 100% ACCURATE CAMERA FORWARD MOTION
    // ----------------------------------------------------
    update(delta, input, cameraAngleY, aimWorldTarget, onHitCallback) {
        if (this.isWasted || this.isBusted) return;

        if (this.inVehicle) {
            this.position.copy(this.inVehicle.group.position);
            this.group.position.copy(this.position);
            return;
        }

        this.updateEquippedWeaponMesh();

        // Stamina logic
        const isSprintingInput = input.sprint && (input.moveX !== 0 || input.moveZ !== 0 || input.forward || input.backward || input.left || input.right);
        if (isSprintingInput && this.stamina > 0) {
            this.isSprinting = true;
            this.stamina = Math.max(0, this.stamina - delta * 18);
        } else {
            this.isSprinting = false;
            this.stamina = Math.min(this.maxStamina, this.stamina + delta * 16);
        }

        // Continuous analog or digital input
        let rawMoveX = (typeof input.moveX === 'number' && input.moveX !== 0) ? input.moveX : 0;
        let rawMoveZ = (typeof input.moveZ === 'number' && input.moveZ !== 0) ? input.moveZ : 0;

        if (rawMoveX === 0 && rawMoveZ === 0) {
            if (input.forward) rawMoveZ -= 1;
            if (input.backward) rawMoveZ += 1;
            if (input.left) rawMoveX -= 1;
            if (input.right) rawMoveX += 1;
        }

        const inputLen = Math.sqrt(rawMoveX * rawMoveX + rawMoveZ * rawMoveZ);
        const isMoving = inputLen > 0.05;

        if (isMoving) {
            const normX = rawMoveX / (inputLen > 1 ? inputLen : 1);
            const normZ = rawMoveZ / (inputLen > 1 ? inputLen : 1);

            // Camera Look Forward on XZ plane: (-sin(yaw), -cos(yaw))
            // Camera Look Right on XZ plane: (cos(yaw), -sin(yaw))
            const camFwdX = -Math.sin(cameraAngleY);
            const camFwdZ = -Math.cos(cameraAngleY);
            const camRightX = Math.cos(cameraAngleY);
            const camRightZ = -Math.sin(cameraAngleY);

            // Forward moves in direction of camFwd (-normZ is positive for forward), Right moves in direction of camRight
            const worldDirX = camFwdX * (-normZ) + camRightX * normX;
            const worldDirZ = camFwdZ * (-normZ) + camRightZ * normX;

            const targetSpeed = (this.isRolling ? this.sprintSpeed * 1.25 : (this.isSprinting ? this.sprintSpeed : this.walkSpeed)) * Math.min(inputLen, 1);

            // Smooth acceleration
            this.velocity.x += (worldDirX * targetSpeed - this.velocity.x) * Math.min(delta * 16, 1);
            this.velocity.z += (worldDirZ * targetSpeed - this.velocity.z) * Math.min(delta * 16, 1);

            // Set character rotation so front (+Z) faces direction of motion
            this.facingAngle = Math.atan2(worldDirX, worldDirZ);
            this.group.rotation.y = this.facingAngle;

            if (this.isGrounded && !this.isRolling) {
                soundEngine.playFootstep(this.isSprinting);
            }
        } else {
            // Smooth deceleration
            this.velocity.x *= (1 - Math.min(delta * 14, 1));
            this.velocity.z *= (1 - Math.min(delta * 14, 1));
        }

        // Jumping & Gravity
        if (input.jump && this.isGrounded && !this.isRolling) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        if (!this.isGrounded) {
            this.velocity.y -= 22 * delta;
        }

        // Independent X and Z collision checks for smooth wall sliding without sticking
        const proposedX = this.position.x + this.velocity.x * delta;
        const proposedZ = this.position.z + this.velocity.z * delta;
        const proposedY = this.position.y + this.velocity.y * delta;

        const hitX = this.city.checkCollision(proposedX, this.position.z, 0.42);
        if (!hitX) {
            this.position.x = proposedX;
        } else {
            this.velocity.x = 0;
        }

        const hitZ = this.city.checkCollision(this.position.x, proposedZ, 0.42);
        if (!hitZ) {
            this.position.z = proposedZ;
        } else {
            this.velocity.z = 0;
        }

        if (proposedY <= 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.position.y = proposedY;
        }

        this.group.position.copy(this.position);

        this.updateProceduralAnimation(delta, isMoving);

        // Shooting / Attack
        if (input.shoot) {
            const curWeapon = this.weapons.getCurrentWeapon();
            if (curWeapon.type === 'melee') {
                this.performMeleePunch(onHitCallback);
            } else {
                const muzzlePos = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
                let aimDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
                if (aimWorldTarget) {
                    aimDir = aimWorldTarget.clone().sub(muzzlePos).normalize();
                }
                this.weapons.shoot(muzzlePos, aimDir, onHitCallback);
            }
        }
    }

    updateProceduralAnimation(delta, isMoving) {
        const time = performance.now() * 0.008;

        if (this.isRolling) {
            this.rollTimer -= delta;
            this.limbs.hips.rotation.x += delta * 16;
            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.limbs.hips.rotation.x = 0;
            }
            return;
        }

        if (this.meleeTimer > 0) {
            this.meleeTimer -= delta;
            return;
        }

        if (isMoving && this.isGrounded) {
            const animSpeed = this.isSprinting ? 1.7 : 1.1;
            const stride = Math.sin(time * animSpeed);

            this.limbs.leftLeg.rotation.x = stride * 0.8;
            this.limbs.rightLeg.rotation.x = -stride * 0.8;
            this.limbs.leftArm.rotation.x = -stride * 0.6;
            this.limbs.rightArm.rotation.x = stride * 0.6;
            this.limbs.hips.position.y = 0.95 + Math.abs(stride) * 0.06;
        } else if (this.isGrounded) {
            const breathe = Math.sin(time * 0.35) * 0.025;
            this.limbs.leftLeg.rotation.x = 0;
            this.limbs.rightLeg.rotation.x = 0;
            this.limbs.leftArm.rotation.x = breathe;
            this.limbs.rightArm.rotation.x = breathe;
            this.limbs.hips.position.y = 0.95 + breathe;
        } else {
            this.limbs.leftLeg.rotation.x = -0.35;
            this.limbs.rightLeg.rotation.x = 0.45;
            this.limbs.leftArm.rotation.x = -0.7;
            this.limbs.rightArm.rotation.x = -0.7;
        }
    }
}
