import * as THREE from 'three';

export class TacticalControls {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.moveVector = new THREE.Vector2();
        this.velocity = new THREE.Vector3();
        this.isGrounded = true;
        this.adsMode = false;
        
        // Autorun State Machine Profiles
        this.autorun = false;
        this.crouch = false;
        
        this.touchJoyId = null;
        this.touchLookId = null;
        this.joyStart = new THREE.Vector2();
        this.lookStart = new THREE.Vector2();
        this.audio = null;
        this.enemyManager = null;
        this.hp = 100;

        // Custom Competitive Weapon Profiles
        this.weapons = [
            { name: 'MP5', type: 'SMG', damage: 20, hasScope: true, fireRate: 100, clipSize: 30, maxAmmo: 120, currentClip: 30, reserve: 120 },
            { name: 'M1887', type: 'Shotgun', damage: 90, hasScope: false, fireRate: 750, clipSize: 2, maxAmmo: 8, currentClip: 2, reserve: 8 }
        ];
        this.activeWeaponIdx = 0;
        this.lastFireTime = 0;
        this.isReloading = false;

        this.glooWallsLeft = 3;
        this.glooMode = false;
        this.glooPreview = null;

        this.medkitsLeft = 2;
        this.isHealing = false;

        // Weapon Position & Transform Node Assemblies
        this.gunContainer = new THREE.Group();
        this.camera.add(this.gunContainer);
        this.scene.add(this.camera);

        this.initWeapons();
        this.initGlooPreview();
        this.bindHUD();
        this.setupInput();
    }

    initWeapons() {
        this.gunMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.08, 0.55), 
            new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 })
        );
        this.gunMesh.position.set(0.18, -0.22, -0.45);
        this.gunContainer.add(this.gunMesh);
    }

    initGlooPreview() {
        this.glooPreview = new THREE.Mesh(
            new THREE.BoxGeometry(7, 4.5, 0.4),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 })
        );
        this.glooPreview.visible = false;
        this.scene.add(this.glooPreview);
    }

    switchWeapon(index) {
        if (this.isHealing || this.isReloading || index === this.activeWeaponIdx) return;
        this.activeWeaponIdx = index;
        const current = this.weapons[index];

        document.getElementById('weap-mp5').classList.toggle('active', index === 0);
        document.getElementById('weap-m1887').classList.toggle('active', index === 1);

        // UI Scope Button Visibility Toggle
        const scopeBtn = document.getElementById('btn-scope');
        if (current.hasScope) {
            scopeBtn.style.opacity = "1";
            scopeBtn.style.pointerEvents = "auto";
        } else {
            this.adsMode = false;
            document.getElementById('sniper-scope').classList.remove('active');
            document.getElementById('reticle').style.opacity = '1';
            scopeBtn.style.opacity = "0.15";
            scopeBtn.style.pointerEvents = "none";
        }
        
        // Draw Down Animation Switch
        this.gunMesh.position.y = -0.6;
    }

    reloadWeapon() {
        const weapon = this.weapons[this.activeWeaponIdx];
        if (this.isReloading || weapon.currentClip === weapon.clipSize || weapon.reserve <= 0) return;

        this.isReloading = true;
        this.adsMode = false;
        document.getElementById('sniper-scope').classList.remove('active');
        document.getElementById('reticle').style.opacity = '1';

        if (this.audio) this.audio.play('reload');

        // Tactile Tilt Down Animation Matrix
        let t = 0;
        const reloadAnim = setInterval(() => {
            t += 0.05;
            if (t < 0.5) {
                this.gunMesh.position.y -= 0.03;
                this.gunMesh.rotation.x -= 0.04;
            } else if (t >= 1.2) {
                this.gunMesh.position.y += 0.03;
                this.gunMesh.rotation.x += 0.04;
            }

            if (t >= 1.5) {
                clearInterval(reloadAnim);
                this.gunMesh.position.set(0.18, -0.22, -0.45);
                this.gunMesh.rotation.set(0, 0, 0);

                const needed = weapon.clipSize - weapon.currentClip;
                const transfer = Math.min(needed, weapon.reserve);
                weapon.currentClip += transfer;
                weapon.reserve -= transfer;

                const elId = weapon.name === 'MP5' ? 'ammo-mp5' : 'ammo-m1887';
                document.getElementById(elId).innerText = `${weapon.currentClip} / ${weapon.reserve}`;
                this.isReloading = false;
            }
        }, 32);
    }

    toggleGlooMode() {
        if (this.glooWallsLeft <= 0 || this.isHealing) return;
        this.glooMode = !this.glooMode;
        this.glooPreview.visible = this.glooMode;
    }

    deployGlooWall() {
        if (this.glooWallsLeft <= 0) return;
        this.glooWallsLeft--;
        document.getElementById('count-gloo').innerText = this.glooWallsLeft;

        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(7, 4.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, transparent: true, opacity: 0.85 })
        );
        wall.position.copy(this.glooPreview.position);
        wall.rotation.copy(this.glooPreview.rotation);
        this.scene.add(wall);

        // Immediate scaling frame animation step pop
        wall.scale.set(0.05, 0.05, 0.05);
        let frames = 0;
        const pop = setInterval(() => {
            if (frames++ >= 6) clearInterval(pop);
            else wall.scale.addScalar(0.16);
        }, 16);

        this.glooMode = false;
        this.glooPreview.visible = false;
    }

    useMedkit() {
        if (this.medkitsLeft <= 0 || this.isHealing || this.hp >= 100) return;
        this.isHealing = true;
        this.autorun = false; // Break forward running movement during interaction
        document.getElementById('action-run').classList.remove('active');
        this.moveVector.set(0, 0);

        const frame = document.getElementById('medkit-loader');
        const fill = document.getElementById('medkit-progress');
        frame.style.display = 'block';
        fill.style.width = '0%';

        let start = null;
        const duration = 3000; // Rigid 3-Second UI Lock

        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const pct = Math.min((progress / duration) * 100, 100);
            fill.style.width = `${pct}%`;

            if (progress < duration) {
                requestAnimationFrame(step);
            } else {
                this.hp = 100;
                document.getElementById('hp-fill-bar').style.width = '100%';
                this.medkitsLeft--;
                document.getElementById('count-medkit').innerText = this.medkitsLeft;
                frame.style.display = 'none';
                this.isHealing = false;
            }
        };
        requestAnimationFrame(step);
    }

    fire() {
        if (this.isHealing || this.isReloading) return;
        if (this.glooMode) { this.deployGlooWall(); return; }

        const now = performance.now();
        const weapon = this.weapons[this.activeWeaponIdx];
        if (now - this.lastFireTime < weapon.fireRate) return;

        if (weapon.currentClip <= 0) {
            this.reloadWeapon();
            return;
        }

        this.lastFireTime = now;
        weapon.currentClip--;
        const elId = weapon.name === 'MP5' ? 'ammo-mp5' : 'ammo-m1887';
        document.getElementById(elId).innerText = `${weapon.currentClip} / ${weapon.reserve}`;

        if (this.audio) this.audio.play(weapon.type === 'SMG' ? 'shoot' : 'laser');
        this.gunContainer.position.z = 0.12; // Dynamic Recoil Step Back

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0,0), this.camera);
        const hits = ray.intersectObjects(this.scene.children, true);
        
        for (let i = 0; i < hits.length; i++) {
            let obj = hits[i].object;
            while (obj != null) {
                if (obj.userData && obj.userData.enemyId) {
                    this.enemyManager.damage(obj.userData.enemyId, weapon.damage);
                    return;
                }
                obj = obj.parent;
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        document.getElementById('hp-fill-bar').style.width = `${this.hp}%`;
        if (this.audio) this.audio.play('damage');
        
        const vig = document.getElementById('damage-vignette');
        vig.style.opacity = '1';
        setTimeout(() => vig.style.opacity = '0', 100);

        if (this.hp <= 0) window.location.reload();
    }

    bindHUD() {
        document.getElementById('btn-fire').addEventListener('touchstart', (e) => { e.stopPropagation(); this.fire(); });
        document.getElementById('btn-scope').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (!this.weapons[this.activeWeaponIdx].hasScope) return;
            this.adsMode = !this.adsMode;
            if (this.glooMode) { this.glooMode = false; this.glooPreview.visible = false; }
            document.getElementById('sniper-scope').classList.toggle('active', this.adsMode);
            document.getElementById('reticle').style.opacity = this.adsMode ? '0' : '1';
        });

        document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (this.isGrounded && !this.isHealing) { this.velocity.y = 8.5; this.isGrounded = false; }
        });
        document.getElementById('btn-crouch').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.crouch = !this.crouch;
            e.target.classList.toggle('active', this.crouch);
        });

        // Toggling Autorun Lock System Configuration
        document.getElementById('action-run').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (this.isHealing) return;
            this.autorun = !this.autorun;
            e.target.classList.toggle('active', this.autorun);
        });

        document.getElementById('slot-medkit').addEventListener('touchstart', (e) => { e.stopPropagation(); this.useMedkit(); });
        document.getElementById('slot-gloo').addEventListener('touchstart', (e) => { e.stopPropagation(); this.toggleGlooMode(); });

        document.getElementById('weap-mp5').addEventListener('touchstart', (e) => { e.stopPropagation(); this.switchWeapon(0); });
        document.getElementById('weap-m1887').addEventListener('touchstart', (e) => { e.stopPropagation(); this.switchWeapon(1); });
    }

    setupInput() {
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-handle');
        
        window.addEventListener('touchstart', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.clientX < window.innerWidth / 2 && this.touchJoyId === null) {
                    this.touchJoyId = t.identifier;
                    this.joyStart.set(t.clientX, t.clientY);
                    zone.style.left = `${t.clientX - 65}px`;
                    zone.style.top = `${t.clientY - 65}px`;
                    zone.style.opacity = "0.9";
                    
                    // Breaking Autorun lock upon touching joystick again
                    if (this.autorun) {
                        this.autorun = false;
                        document.getElementById('action-run').classList.remove('active');
                    }
                } else if (t.clientX >= window.innerWidth / 2 && this.touchLookId === null) {
                    if (e.target.classList.contains('hud-element') || e.target.closest('.weapon-box')) continue;
                    this.touchLookId = t.identifier;
                    this.lookStart.set(t.clientX, t.clientY);
                }
            }
        });

        window.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                if (t.identifier === this.touchJoyId) {
                    const dx = t.clientX - this.joyStart.x;
                    const dy = t.clientY - this.joyStart.y;
                    const d = Math.min(Math.sqrt(dx * dx + dy * dy), 50);
                    const angle = Math.atan2(dy, dx);
                    const kx = Math.cos(angle) * d;
                    const ky = Math.sin(angle) * d;
                    
                    knob.style.transform = `translate(${kx}px, ${ky}px)`;
                    this.moveVector.set(kx / 50, -ky / 50);
                } else if (t.identifier === this.touchLookId) {
                    const rx = t.clientX - this.lookStart.x;
                    const ry = t.clientY - this.lookStart.y;
                    
                    const baseSens = this.adsMode ? 0.0035 : 0.0085;
                    const signX = rx < 0 ? -1 : 1;
                    const signY = ry < 0 ? -1 : 1;
                    
                    // Exponential Swipe Velocity Vector Processing
                    this.camera.rotation.y -= signX * Math.pow(Math.abs(rx), 1.25) * baseSens;
                    this.camera.rotation.x -= signY * Math.pow(Math.abs(ry), 1.25) * baseSens;
                    
                    // Strict Upper/Lower Pitch Matrix Constraints
                    this.camera.rotation.x = Math.max(-1.35, Math.min(1.35, this.camera.rotation.x));
                    this.lookStart.set(t.clientX, t.clientY);
                }
            }
        });

        const endTouches = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === this.touchJoyId) {
                    this.touchJoyId = null;
                    this.moveVector.set(0, 0);
                    knob.style.transform = 'translate(0px,0px)';
                    zone.style.opacity = "0.45";
                } else if (t.identifier === this.touchLookId) {
                    this.touchLookId = null;
                }
            }
        };
        window.addEventListener('touchend', endTouches);
        window.addEventListener('touchcancel', endTouches);
    }

    update(delta, time) {
        // High-Performance CODM Movement Speeds
        let currentSpeed = this.autorun ? 11.0 : 6.0;
        if (this.crouch) currentSpeed = 2.8;
        if (this.adsMode) currentSpeed = 1.8;
        if (this.isHealing) currentSpeed = 0;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0; right.normalize();

        const wishMove = new THREE.Vector3();
        if (this.autorun) {
            wishMove.addScaledVector(forward, currentSpeed); // Automatic Forward Sprint Lock
        } else {
            wishMove.addScaledVector(forward, this.moveVector.y * currentSpeed)
                    .addScaledVector(right, this.moveVector.x * currentSpeed);
        }
            
        this.camera.position.addScaledVector(wishMove, delta);

        // Core Physics Falling/Jumping Vector Calculation Loops
        if (!this.isGrounded) {
            this.velocity.y -= 24 * delta;
            this.camera.position.y += this.velocity.y * delta;
            const floor = this.crouch ? 0.85 : 1.75;
            if (this.camera.position.y <= floor) {
                this.camera.position.y = floor;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        } else {
            const targetHeight = this.crouch ? 0.85 : 1.75;
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetHeight, 0.2);
        }

        // Weapon Spring Recoil Recovery Loop
        this.gunContainer.position.z = THREE.MathUtils.lerp(this.gunContainer.position.z, 0, 0.15);
        this.gunMesh.position.y = THREE.MathUtils.lerp(this.gunMesh.position.y, -0.22, 0.12);

        // Deploy Wall Targeting Projections
        if (this.glooMode && this.glooPreview) {
            const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const wallTarget = new THREE.Vector3().copy(this.camera.position).addScaledVector(lookDir, 4.5);
            wallTarget.y = 2.25;
            this.glooPreview.position.copy(wallTarget);
            this.glooPreview.rotation.set(0, this.camera.rotation.y, 0);
        }

        // --- Core Aim Assist Engine Lock ---
        if (this.enemyManager && this.enemyManager.pool.length > 0) {
            let closestEnemy = null;
            let closestAngle = Infinity;
            
            const playerLook = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

            this.enemyManager.pool.forEach(enemy => {
                if (enemy.state === 'dead') return;
                const toEnemy = new THREE.Vector3().copy(enemy.mesh.position).sub(this.camera.position);
                toEnemy.y = 0; // Lock strictly to torso height vector
                const dist = toEnemy.length();
                toEnemy.normalize();

                if (dist < 32) {
                    const angle = playerLook.angleTo(toEnemy);
                    if (angle < closestAngle) {
                        closestAngle = angle;
                        closestEnemy = enemy;
                    }
                }
            });

            const ret = document.getElementById('reticle');
            // Check if within magnetic lock range (approx 6 degrees)
            if (closestEnemy && closestAngle < 0.11) {
                ret.classList.add('lock-on');
                // Inject subtle aim-assist alignment correction
                this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, this.camera.rotation.y + (playerLook.x - playerLook.x), 0.05);
            } else {
                ret.classList.remove('lock-on');
            }
        }
    }
        }
            
