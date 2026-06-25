import * as THREE from 'three';

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
        this.projectiles = [];
        this.idCounter = 0;
        this.lastSpawn = 0;
    }

    spawn(playerPos) {
        this.idCounter++;
        const eGroup = new THREE.Group();
        
        // Minecraft Aesthetic Palette
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.7 }); // Green zombie tint
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 }); // Red active combat shirt
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 }); // Blue combat pants
        const weaponMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.4 });

        // 1. Build Segmented Box Mechanics (Minecraft Rigging)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.45), shirtMat);
        torso.position.y = 1.35;
        torso.castShadow = true;
        eGroup.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skinMat);
        head.position.y = 0.88; 
        torso.add(head);

        // Arms Pivot Points
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.1, 0.24), shirtMat);
        leftArm.position.set(-0.58, 0, 0);
        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.1, 0.24), shirtMat);
        rightArm.position.set(0.58, 0, 0);
        torso.add(leftArm);
        torso.add(rightArm);

        // Legs Segment Rigging
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), pantsMat);
        leftLeg.position.set(-0.25, 0.4, 0);
        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), pantsMat);
        rightLeg.position.set(0.25, 0.4, 0);
        eGroup.add(leftLeg);
        eGroup.add(rightLeg);

        // Enemy Gun Model Assembly
        const enemyGun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), weaponMat);
        enemyGun.position.set(0, -0.3, -0.25);
        rightArm.add(enemyGun);

        // 2. Build 3D Billboard Floating Health bar
        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 2.3, 0);
        hpGroup.userData = { isBillboard: true };
        
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
        const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
        fg.position.z = 0.01;
        
        hpGroup.add(bg);
        hpGroup.add(fg);
        eGroup.add(hpGroup);

        // 3. Position Map Spawning Coordinates
        let x = (Math.random() - 0.5) * 160;
        let z = (Math.random() - 0.5) * 160;
        if (Math.abs(x) < 25) x += 35;
        if (Math.abs(z) < 25) z += 35;
        eGroup.position.set(x, 0, z);

        // Tag mesh nodes with central tracking ID for aim assist and crosshairs
        eGroup.traverse(node => {
            if (node.isMesh) node.userData.enemyId = this.idCounter;
        });

        this.scene.add(eGroup);

        this.pool.push({
            id: this.idCounter,
            mesh: eGroup,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            leftArm: leftArm,
            rightArm: rightArm,
            fill: fg,
            hp: 100,
            lastShot: 0,
            state: 'patrol',
            velocity: new THREE.Vector3(),
            isGrounded: true
        });
    }

    damage(id, amount) {
        const bot = this.pool.find(item => item.id === id);
        if (!bot || bot.state === 'dead') return;

        bot.hp -= amount;
        bot.state = 'chase'; // Instantly lock focus onto player coordinates
        if (bot.hp < 0) bot.hp = 0;
        
        bot.fill.scale.x = Math.max(0.001, bot.hp / 100);

        if (bot.hp <= 0) {
            bot.state = 'dead';
            this.scene.remove(bot.mesh);
            this.pool = this.pool.filter(item => item.id !== id);
        }
    }

    update(delta, playerPos, attackCallback, audio, combat) {
        const now = performance.now();
        
        // Spawn throttling logic clock
        if (this.pool.length < 4 && now - this.lastSpawn > 4500) {
            this.spawn(playerPos);
            this.lastSpawn = now;
        }

        this.pool.forEach(bot => {
            if (bot.state === 'dead') return;
            
            const dist = bot.mesh.position.distanceTo(playerPos);
            bot.mesh.lookAt(playerPos.x, bot.mesh.position.y, playerPos.z);

            let speed = 0;

            if (dist < 45) bot.state = 'chase';

            if (bot.state === 'chase' && dist > 8) {
                speed = 6.2; // Aggressive running pace speed variable
                bot.mesh.translateZ(speed * delta);

                // Minecraft Physical Leg Oscillation Swing Walk Matrix
                const runCycle = Math.sin(now * 0.012) * 0.65;
                bot.leftLeg.rotation.x = runCycle;
                bot.rightLeg.rotation.x = -runCycle;
                
                // Keep arms lifted up forward to point gun line
                bot.rightArm.rotation.x = -Math.PI / 2.2;
                bot.leftArm.rotation.x = -Math.PI / 2.5;
            } else {
                // Reset to idle stance frames
                bot.leftLeg.rotation.x = 0;
                bot.rightLeg.rotation.x = 0;
                bot.rightArm.rotation.x = 0;
                bot.leftArm.rotation.x = 0;
            }

            // Tactical Jumping Logic for Bots jumping over low block barriers
            if (bot.state === 'chase' && Math.random() < 0.01 && bot.isGrounded) {
                bot.velocity.y = 7.0;
                bot.isGrounded = false;
            }

            // Apply Bot Physics Gravity Math
            if (!bot.isGrounded) {
                bot.velocity.y -= 22 * delta;
                bot.mesh.position.y += bot.velocity.y * delta;
                if (bot.mesh.position.y <= 0) {
                    bot.mesh.position.y = 0;
                    bot.velocity.y = 0;
                    bot.isGrounded = true;
                }
            }

            // Custom Enemy Weapon Projectile Loop Cycles
            if (bot.state === 'chase' && dist < 35 && now - bot.lastShot > 1600) {
                bot.lastShot = now;
                if (audio) audio.play('shoot');

                const projectile = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.18, 0.35), 
                    new THREE.MeshBasicMaterial({ color: 0xef4444 }) // Red enemy tracers
                );
                
                // Project bullet line forward outward from hand gun vector alignment
                projectile.position.copy(bot.mesh.position);
                projectile.position.y += 1.35;
                
                const dir = new THREE.Vector3().copy(playerPos).sub(projectile.position).normalize();
                this.scene.add(projectile);
                
                this.projectiles.push({ mesh: projectile, dir: dir, born: now });
            }
        });

        // Frame updates processing for fly physics tracking vectors
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.addScaledVector(p.dir, 24.0 * delta);
            
            // Checking direct player impact collisions
            if (p.mesh.position.distanceTo(playerPos) < 1.6) {
                attackCallback(12); // Inflict physical balance damage profile points
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            if (now - p.born > 2500) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }
}
