// start.js — Map explorer: load the GLB, walk around, look around.
// No enemies or weapons yet — those come next.

// ─── Map constants (from GLB analysis) ────────────────────────────────────────
// The GLB is a Sketchfab FBX export with Z-up orientation.
// Raw bounds: X[-9.84..117.48], Y[-5.09..89.84], Z[-0.12..4.6]
// Fix: rotate -90° on X  →  floor lands at Three.js Y≈0
// Then translate (-53.82, 0, 42.38) to centre the map at world origin.
const MAP_ROT_X    = -Math.PI / 2;
const MAP_OFFSET_X = -53.82;
const MAP_OFFSET_Z =  42.38;

const EYE_HEIGHT   = 1.6;   // camera Y when standing
const ARENA_BOUND  = 58;    // clamp player inside centred map
const GRAVITY      = 28;
const JUMP_FORCE   = 11;
const WALK_SPEED   = 5;
const RUN_SPEED    = 9.5;
const LOOK_YAW     = 0.006;
const LOOK_PITCH   = 0.005;

// ─── Three.js setup ───────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x050810);
scene.fog        = new THREE.FogExp2(0x050810, 0.018);

// Camera — YXZ order prevents the yaw/pitch coupling bug
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
camera.rotation.order = 'YXZ';
camera.position.set(0, EYE_HEIGHT, 0);

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffeedd, 1.1);
sun.position.set(30, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far  = 200;
sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
sun.shadow.camera.right= sun.shadow.camera.top    =  80;
scene.add(sun);

// Subtle fill from below (bounce light on dark map)
const fill = new THREE.HemisphereLight(0x223355, 0x080c14, 0.5);
scene.add(fill);

// ─── Load GLB map ─────────────────────────────────────────────────────────────
const bar     = document.getElementById('bar');
const loadMsg = document.getElementById('load-msg');

function setProgress(pct, msg) {
    bar.style.width = `${Math.round(pct * 100)}%`;
    if (msg) loadMsg.textContent = msg;
}

setProgress(0.05, 'LOADING MAP…');

const loader = new THREE.GLTFLoader();
loader.load(
    'assets/maps/low-poly_fps_map.glb',

    // ── onLoad ──────────────────────────────────────────────────────────────
    (gltf) => {
        setProgress(0.9, 'BUILDING SCENE…');

        const root = gltf.scene;

        // Fix Z-up orientation from FBX export
        root.rotation.x = MAP_ROT_X;

        // Centre at world origin
        root.position.set(MAP_OFFSET_X, 0, MAP_OFFSET_Z);

        root.traverse(child => {
            if (child.isMesh) {
                child.castShadow    = true;
                child.receiveShadow = true;
                // Keep original materials but make them look slightly better
                if (child.material) {
                    child.material.envMapIntensity = 0.3;
                }
            }
        });

        scene.add(root);

        setProgress(1.0, 'READY');
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 300);
    },

    // ── onProgress ──────────────────────────────────────────────────────────
    (xhr) => {
        if (xhr.total) setProgress(0.05 + (xhr.loaded / xhr.total) * 0.8, 'LOADING MAP…');
    },

    // ── onError ─────────────────────────────────────────────────────────────
    (err) => {
        console.error('Map load error:', err);
        // Fallback floor so the game still runs if the file path is wrong
        loadMsg.textContent = 'MAP NOT FOUND — using fallback floor';
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200, 20, 20),
            new THREE.MeshStandardMaterial({ color: 0x0d0f1a, roughness: 0.9 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const grid = new THREE.GridHelper(200, 40, 0x00f0ff, 0x111828);
        grid.position.y = 0.01;
        scene.add(grid);

        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 800);
    }
);

// ─── Player state ─────────────────────────────────────────────────────────────
const player = {
    velY       : 0,       // vertical velocity for jump / gravity
    grounded   : true,
    // Smooth horizontal velocity (momentum)
    velX       : 0,
    velZ       : 0,
};

// Touch input state
const joy = {
    id     : null,
    startX : 0,
    startY : 0,
    dx     : 0,   // -1..1 normalised
    dy     : 0,   // -1..1 normalised   (positive = forward)
};
const look = {
    id     : null,
    lastX  : 0,
    lastY  : 0,
};

// ─── Joystick DOM refs ────────────────────────────────────────────────────────
const joyRing = document.getElementById('joy-ring');
const joyDot  = document.getElementById('joy-dot');
const JOY_R   = 50; // max knob travel radius (px)

function updateJoyDot(dx, dy) {
    joyDot.style.transform = `translate(${dx}px, ${dy}px)`;
}

// ─── Touch events ─────────────────────────────────────────────────────────────
window.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        const isLeftHalf = t.clientX < window.innerWidth * 0.5;

        if (isLeftHalf && joy.id === null) {
            joy.id     = t.identifier;
            joy.startX = t.clientX;
            joy.startY = t.clientY;
            // Snap ring to thumb
            joyRing.style.left    = `${t.clientX - 60}px`;
            joyRing.style.top     = `${t.clientY - 60}px`;
            joyRing.style.opacity = '1';
            updateJoyDot(0, 0);
        }

        if (!isLeftHalf && look.id === null) {
            // Ignore taps on the jump button
            if (e.target.id === 'btn-jump') continue;
            look.id    = t.identifier;
            look.lastX = t.clientX;
            look.lastY = t.clientY;
        }
    }
}, { passive: false });

window.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.touches) {
        // ── Joystick ──────────────────────────────────────────────────────
        if (t.identifier === joy.id) {
            let dx = t.clientX - joy.startX;
            let dy = t.clientY - joy.startY;
            const dist  = Math.min(Math.hypot(dx, dy), JOY_R);
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * dist;
            dy = Math.sin(angle) * dist;
            updateJoyDot(dx, dy);
            joy.dx =  dx / JOY_R;
            joy.dy = -dy / JOY_R;   // positive Y = forward (joystick up = move forward)
        }

        // ── Look ──────────────────────────────────────────────────────────
        if (t.identifier === look.id) {
            const mx = t.clientX - look.lastX;
            const my = t.clientY - look.lastY;

            // Yaw: drag right → turn right
            camera.rotation.y -= mx * LOOK_YAW;

            // Pitch: swipe UP (negative my) → look UP ✓
            camera.rotation.x -= my * LOOK_PITCH;
            camera.rotation.x  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camera.rotation.x));

            look.lastX = t.clientX;
            look.lastY = t.clientY;
        }
    }
}, { passive: false });

const endTouch = e => {
    for (const t of e.changedTouches) {
        if (t.identifier === joy.id) {
            joy.id = null; joy.dx = 0; joy.dy = 0;
            updateJoyDot(0, 0);
            joyRing.style.opacity = '0';
        }
        if (t.identifier === look.id) look.id = null;
    }
};
window.addEventListener('touchend',    endTouch, { passive: false });
window.addEventListener('touchcancel', endTouch, { passive: false });

// ─── Jump button ──────────────────────────────────────────────────────────────
document.getElementById('btn-jump').addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    if (player.grounded) {
        player.velY    = JUMP_FORCE;
        player.grounded = false;
    }
}, { passive: false });

// ─── Desktop mouse look (for testing on PC) ───────────────────────────────────
window.addEventListener('mousemove', e => {
    if (e.buttons !== 1) return;
    camera.rotation.y -= e.movementX * 0.003;
    camera.rotation.x -= e.movementY * 0.003;
    camera.rotation.x  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camera.rotation.x));
});

// Desktop WASD
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });
window.addEventListener('keydown', e => {
    if (e.code === 'Space' && player.grounded) {
        player.velY    = JUMP_FORCE;
        player.grounded = false;
    }
});

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Info overlay ─────────────────────────────────────────────────────────────
const info = document.getElementById('info');
let frameCount = 0, lastFPSTime = 0, fps = 0;

// ─── Main loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function loop() {
    requestAnimationFrame(loop);
    const delta = Math.min(clock.getDelta(), 0.05); // cap so big pauses don't launch the player

    // ── Horizontal movement ──────────────────────────────────────────────────
    // Combine touch joystick + keyboard
    let inputX = joy.dx;
    let inputZ = joy.dy;
    if (keys['KeyW'] || keys['ArrowUp'])    inputZ =  1;
    if (keys['KeyS'] || keys['ArrowDown'])  inputZ = -1;
    if (keys['KeyA'] || keys['ArrowLeft'])  inputX = -1;
    if (keys['KeyD'] || keys['ArrowRight']) inputX =  1;
    const running = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed   = running ? RUN_SPEED : WALK_SPEED;

    // Project input onto camera-facing XZ directions
    const fwd   = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    const targetVelX = (fwd.x * inputZ + right.x * inputX) * speed;
    const targetVelZ = (fwd.z * inputZ + right.z * inputX) * speed;

    // Exponential smoothing → momentum feel
    const accel = 30, decel = 40;
    const moving = (Math.abs(inputX) + Math.abs(inputZ)) > 0.01;
    const blend  = 1 - Math.exp(-(moving ? accel : decel) * delta);
    player.velX += (targetVelX - player.velX) * blend;
    player.velZ += (targetVelZ - player.velZ) * blend;

    camera.position.x += player.velX * delta;
    camera.position.z += player.velZ * delta;

    // Arena boundary clamp
    camera.position.x = Math.max(-ARENA_BOUND, Math.min(ARENA_BOUND, camera.position.x));
    camera.position.z = Math.max(-ARENA_BOUND, Math.min(ARENA_BOUND, camera.position.z));

    // ── Vertical (gravity + jump) ────────────────────────────────────────────
    player.velY          -= GRAVITY * delta;
    camera.position.y    += player.velY * delta;

    // Simple floor: camera Y never goes below EYE_HEIGHT (no mesh raycasting yet)
    if (camera.position.y <= EYE_HEIGHT) {
        camera.position.y = EYE_HEIGHT;
        player.velY       = 0;
        player.grounded   = true;
    }

    // ── Render ──────────────────────────────────────────────────────────────
    renderer.render(scene, camera);

    // ── FPS counter ─────────────────────────────────────────────────────────
    frameCount++;
    const now = performance.now();
    if (now - lastFPSTime >= 1000) {
        fps = frameCount;
        frameCount  = 0;
        lastFPSTime = now;
        const p = camera.position;
        info.textContent =
            `FPS ${fps}\nX ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)}  Z ${p.z.toFixed(1)}`;
    }
}

loop();
        
