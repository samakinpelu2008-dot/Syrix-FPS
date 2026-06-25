import * as THREE from 'three';

export class TacticalControls {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.moveVector = new THREE.Vector2();
        this.velocity = new THREE.Vector3();
        this.isGrounded = true;
        this.adsMode = false;
        this.running = false;
        this.crouch = false;
        
        this.touchJoyId = null;
        this.touchLookId = null;
        this.joyStart = new THREE.Vector2();
        this.lookStart = new THREE.Vector2();
        this.audio = null;
        this.enemyManager = null;
        this.hp = 100;

        // Gloo Wall System Mechanics Profiles
        this.glooWallsLeft = 5;
        this.glooMode = false;
        this.glooPreview = null;

        this.gunContainer = new THREE.Group();
        this.camera.add(this.gunContainer);
        this.scene.add(this.camera);

        this.initWeapons();
        this.initGlooPreview();
        this.bindHUD();
        this.setupInput();
    }

    initWeapons() {
        const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        gun.position.set(0.15, -0.2, -0.4);
        this.gunContainer.add(gun);
    }

    initGlooPreview() {
        this.glooPreview = new THREE.Mesh(
            new THREE.BoxGeometry(6.5, 4.2, 0.6),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4 })
        );
        this.glooPreview.visible = false;
        this.scene.add(this.glooPreview);
    }

    toggleGlooMode() {
        if (this.glooWallsLeft <= 0) return;
        this.glooMode = !this.glooMode;
        this.glooPreview.visible = this.glooMode;
        
        // Reset weapon scopes on wall toggle
        this.adsMode = false;
        document.getElementById('sniper-scope').classList.remove('active');
        document.getElementById('reticle').style.opacity = '1';
        
        document.getElementById('ammo-txt-0').innerText = this.glooMode ? `GLOO: ${this.glooWallsLeft}` : "30/120";
    }

    deployGlooWall() {
        if (this.glooWallsLeft <= 0) return;
        this.glooWallsLeft--;
        this.audio.play('reload');

        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(6.5, 4.2, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x003c5a, transparent: true, opacity: 0.85, roughness: 0.2 })
        );
        wall.position.copy(this.glooPreview.position);
        wall.rotation.copy(this.glooPreview.rotation);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);

        // Immediate scaling frame animation step pop
        wall.scale.set(0.1, 0.1, 0.1);
        let count = 0;
        const anim = setInterval(() => {
            if (count++ >= 8) clearInterval(anim);
            else wall.scale.addScalar(0.12);
        }, 16);

        this.glooMode = false;
        this.glooPreview.visible = false;
        document.getElementById('ammo-txt-0').innerText = "30/120";
    }

    fire() {
        if (this.glooMode) { this.deployGlooWall(); return; }
        this.audio.play(this.adsMode ? 'laser' : 'shoot');
        this.gunContainer.position.z = 0.06; // Recoil shock

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0,0), this.camera);
        const hits = ray.intersectObjects(this.scene.children, true);
        
        for (let i = 0; i < hits.length; i++) {
            let obj = hits[i].object;
            while (obj != null) {
                if (obj.userData && obj.userData.enemyId) {
                    this.enemyManager.damage(obj.userData.enemyId, 25);
                    const marker = document.getElementById('hit-marker');
                    marker.style.opacity = '1';
                    setTimeout(() => marker.style.opacity = '0', 50);
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
        this.audio.play('damage');
        
        const vignette = document.getElementById('damage-vignette');
        vignette.style.opacity = '1';
        setTimeout(() => vignette.style.opacity = '0', 100);
        
        if (this.hp <= 0) {
            window.location.reload(); // Clean auto recovery frame loop
        }
    }

    bindHUD() {
        document.getElementById('btn-fire').addEventListener('touchstart', (e) => { e.stopPropagation(); this.fire(); });
        document.getElementById('btn-scope').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.adsMode = !this.adsMode;
            if (this.glooMode) { this.glooMode = false; this.glooPreview.visible = false; document.getElementById('ammo-txt-0').innerText = "30/120"; }
            document.getElementById('sniper-scope').classList.toggle('active', this.adsMode);
            document.getElementById('reticle').style.opacity = this.adsMode ? '0' : '1';
        });
        document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (this.isGrounded) { this.velocity.y = 6.8; this.isGrounded = false; }
        });
        document.getElementById('btn-crouch').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.crouch = !this.crouch;
            e.target.classList.toggle('active', this.crouch);
        });
        document.getElementById('action-run').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.running = !this.running;
            e.target.classList.toggle('active', this.running);
        });

        // Double tap weapon bar interface container to select Gloo shield
        let lastTap = 0;
        document.querySelector('.weapon-box').addEventListener('touchstart', (e) => {
            e.stopPropagation();
            const now = Date.now();
            if (now - lastTap < 300) this.toggleGlooMode();
            lastTap = now;
        });
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
                    zone.style.left = `${t.clientX - 55}px`;
                    zone.style.top = `${t.clientY - 55}px`;
                    zone.style.opacity = "1";
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
                    const d = Math.min(Math.sqrt(dx * dx + dy * dy), 45);
                    const angle = Math.atan2(dy, dx);
                    const kx = Math.cos(angle) * d;
                    const ky = Math.sin(angle) * d;
                    
                    knob.style.transform = `translate(${kx}px, ${ky}px)`;
                    this.moveVector.set(kx / 45, -ky / 45);
                } else if (t.identifier === this.touchLookId) {
                    const rx = t.clientX - this.lookStart.x;
                    const ry = t.clientY - this.lookStart.y;
                    const sens = this.adsMode ? 0.0015 : 0.004;
                    
                    this.camera.rotation.y -= rx * sens;
                    this.camera.rotation.x -= ry * sens;
                    this.camera.rotation.x = Math.max(-1.3, Math.min(1.3, this.camera.rotation.x));
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
                    zone.style.opacity = "0.4";
                } else if (t.identifier === this.touchLookId) {
                    this.touchLookId = null;
                }
            }
        };
        window.addEventListener('touchend', endTouches);
        window.addEventListener('touchcancel', endTouches);
    }

    update(delta, time) {
        let speed = this.running ? 8.0 : 4.5;
        if (this.crouch) speed = 2.0;
        if (this.adsMode) speed = 1.5;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0; right.normalize();

        const wishMove = new THREE.Vector3()
            .addScaledVector(forward, this.moveVector.y * speed)
            .addScaledVector(right, this.moveVector.x * speed);
            
        this.camera.position.addScaledVector(wishMove, delta);

        // Core Physics Falling/Jumping Vector Calculation Loops
        if (!this.isGrounded) {
            this.velocity.y -= 20 * delta;
            this.camera.position.y += this.velocity.y * delta;
            const floor = this.crouch ? 0.9 : 1.75;
            if (this.camera.position.y <= floor) {
                this.camera.position.y = floor;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        } else {
            const targetH = this.crouch ? 0.9 : 1.75;
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetH, 0.2);
        }

        this.gunContainer.position.z = THREE.MathUtils.lerp(this.gunContainer.position.z, 0, 0.1);

        // Track Wall Vector Target Projections
        if (this.glooMode && this.glooPreview) {
            const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const targetPos = new THREE.Vector3().copy(this.camera.position).addScaledVector(lookDir, 4.5);
            targetPos.y = 2.1; // Sits nicely grounded on surface plane
            this.glooPreview.position.copy(targetPos);
            this.glooPreview.rotation.set(0, this.camera.rotation.y, 0);
        }
    }
}
