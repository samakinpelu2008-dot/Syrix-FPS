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
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

        // 1. Build Robot Mesh Rigid Geometry
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.8), bodyMat);
        torso.position.y = 1.6;
        torso.castShadow = true;
        eGroup.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), bodyMat);
        head.position.y = 1.05;
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.2), eyeMat);
        visor.position.set(0, 0, 0.3);
        
        head.add(visor);
        torso.add(head);

        // 2. Build 3D Billboarded Floating Health Bar
        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 2.5, 0);
        hpGroup.userData = { isBillboard: true };
        
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.12), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
        const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.08), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
        fg.position.z = 0.01;
        
        hpGroup.add(bg);
        hpGroup.add(fg);
        eGroup.add(hpGroup);

        // 3. Position Logic Outside Safe Area Bounds
        let x = (Math.random() - 0.5) * 180;
        let z = (Math.random() - 0.5) * 180;
        if (Math.abs(x) < 30) x += 40;
        if (Math.abs(z) < 30) z += 40;
        eGroup.position.set(x, 0, z);

        // Tag all inner geometries with ID for core raycast tracking
        eGroup.traverse(child => {
            if (child.isMesh) child.userData.enemyId = this.idCounter;
        });

        this.scene.add(eGroup);

        this.pool.push({
            id: this.idCounter,
            mesh: eGroup,
            fill: fg,
            hp: 100,
            lastShot: 0,
            state: 'patrol'
        });
    }

    damage(id, amount) {
        const enemy = this.pool.find(item => item.id === id);
        if (!enemy || enemy.state === 'dead') return;

        enemy.hp -= amount;
        if (enemy.hp < 0) enemy.hp = 0;
        
        // Scale down green/red fill bar width matrix
        enemy.fill.scale.x = Math.max(0.001, enemy.hp / 100);
        enemy.state = 'chase'; // Instantly agro toward threat vectors

        if (enemy.hp <= 0) {
            enemy.state = 'dead';
            this.scene.remove(enemy.mesh);
            this.pool = this.pool.filter(item => item.id !== id);
        }
    }

    update(delta, playerPos, attackCallback, audio) {
        const now = performance.now();
        
        // Limit total live entities and check spacing clocks
        if (this.pool.length < 5 && now - this.lastSpawn > 4000) {
            this.spawn(playerPos);
            this.lastSpawn = now;
        }

        // Enemy tracking matrices update loop
        this.pool.forEach(enemy => {
            if (enemy.state === 'dead') return;
            
            const dist = enemy.mesh.position.distanceTo(playerPos);
            enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);

            if (dist < 40) enemy.state = 'chase';

            if (enemy.state === 'chase' && dist > 10) {
                enemy.mesh.translateZ(3.5 * delta);
            }

            // Enemy Attack Thread Logic
            if (enemy.state === 'chase' && dist < 30 && now - enemy.lastShot > 2000) {
                enemy.lastShot = now;
                audio.play('shoot');

                // Build individual plasma ball projectile matrix
                const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 4, 4), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
                pMesh.position.copy(enemy.mesh.position).y += 1.5;
                
                const dir = new THREE.Vector3().copy(playerPos).sub(pMesh.position).normalize();
                this.scene.add(pMesh);
                
                this.projectiles.push({ mesh: pMesh, dir: dir, born: now });
            }
        });

        // Track Projectiles movement translation frame vectors
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.addScaledVector(p.dir, 20 * delta);
            
            if (p.mesh.position.distanceTo(playerPos) < 1.5) {
                attackCallback(15); // Hit player directly
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            if (now - p.born > 3000) { // Timeout cleanup thread
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }
                                                          }
                        
