// PART 1 OF 3
// start.js

// ==========================================================
// IMPORTS
// ==========================================================

const canvas = document.getElementById("canvas");

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
});

renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050810);
scene.fog = new THREE.FogExp2(0x050810,0.018);

// ==========================================================
// CAMERA
// ==========================================================

const camera = new THREE.PerspectiveCamera(
    70,
    innerWidth / innerHeight,
    0.1,
    500
);

camera.rotation.order = "YXZ";

// ==========================================================
// PLAYER
// ==========================================================

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.35;

const player = new THREE.Group();
scene.add(player);

player.position.set(0,0,0);

player.add(camera);

camera.position.set(
    0,
    PLAYER_HEIGHT,
    0
);

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let onGround = false;

// ==========================================================
// SETTINGS
// ==========================================================

const WALK_SPEED = 5;
const RUN_SPEED = 9;
const JUMP_FORCE = 9;
const GRAVITY = 30;

const LOOK_SPEED_X = 0.006;
const LOOK_SPEED_Y = 0.005;

const MAP_ROT_X = -Math.PI/2;
const MAP_OFFSET_X = -53.82;
const MAP_OFFSET_Z = 42.38;

// ==========================================================
// LIGHTING
// ==========================================================

scene.add(
    new THREE.AmbientLight(
        0xffffff,
        0.35
    )
);

const sun = new THREE.DirectionalLight(
    0xfff2dd,
    1.2
);

sun.position.set(
    30,
    60,
    20
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

scene.add(sun);

scene.add(
    new THREE.HemisphereLight(
        0x223355,
        0x080c14,
        0.5
    )
);

// ==========================================================
// COLLISION DATA
// ==========================================================

const worldMeshes = [];
let worldRoot = null;

const floorRay = new THREE.Raycaster();
const wallRay = new THREE.Raycaster();

const DOWN = new THREE.Vector3(
    0,
    -1,
    0
);

// ==========================================================
// LOADER
// ==========================================================

const loader = new THREE.GLTFLoader();

loader.load(

"assets/maps/low-poly_fps_map.glb",

(gltf)=>{

worldRoot = gltf.scene;

worldRoot.rotation.x = MAP_ROT_X;

worldRoot.position.set(
MAP_OFFSET_X,
0,
MAP_OFFSET_Z
);

worldRoot.updateMatrixWorld(true);

worldRoot.traverse(mesh=>{

if(!mesh.isMesh) return;

mesh.castShadow=true;
mesh.receiveShadow=true;

worldMeshes.push(mesh);

});

scene.add(worldRoot);

// Spawn player on map

spawnPlayer();

document.getElementById("loading").style.display="none";

},

(xhr)=>{

if(xhr.total){

const p=Math.round(xhr.loaded/xhr.total*100);

document.getElementById("bar").style.width=p+"%";

}

},

(err)=>{

console.error(err);

}

);

// ==========================================================
// SPAWN
// ==========================================================

function spawnPlayer(){

const start=new THREE.Vector3(
0,
50,
0
);

floorRay.set(
start,
DOWN
);

const hit=floorRay.intersectObjects(
worldMeshes,
true
);

if(hit.length){

player.position.copy(hit[0].point);

}

else{

player.position.set(
0,
0,
0
);

}

}

// ==========================================================
// INPUT
// ==========================================================

const keys={};

addEventListener("keydown",e=>{

keys[e.code]=true;

});

addEventListener("keyup",e=>{

keys[e.code]=false;

});

window.addEventListener("mousemove",e=>{

if(e.buttons!==1) return;

player.rotation.y-=e.movementX*0.003;

camera.rotation.x-=e.movementY*0.003;

camera.rotation.x=Math.max(

-1.4,

Math.min(

1.4,

camera.rotation.x

)

);

});

// ===== END OF PART 1 =====
// ==========================================================
// PART 2 OF 3
// CONTINUE BELOW PART 1
// ==========================================================

// -----------------------------
// MOBILE TOUCH
// -----------------------------

const joy = {
    id: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0
};

const look = {
    id: null,
    lastX: 0,
    lastY: 0
};

const joyRing = document.getElementById("joy-ring");
const joyDot = document.getElementById("joy-dot");

const JOY_RADIUS = 50;

function moveDot(x,y){

    joyDot.style.transform =
        `translate(${x}px,${y}px)`;

}

window.addEventListener("touchstart",e=>{

e.preventDefault();

for(const t of e.changedTouches){

const left=t.clientX<innerWidth*0.5;

if(left && joy.id===null){

joy.id=t.identifier;

joy.startX=t.clientX;
joy.startY=t.clientY;

joyRing.style.left=(t.clientX-60)+"px";
joyRing.style.top=(t.clientY-60)+"px";
joyRing.style.opacity="1";

moveDot(0,0);

}

if(!left && look.id===null){

if(e.target.id==="btn-jump") continue;

look.id=t.identifier;

look.lastX=t.clientX;
look.lastY=t.clientY;

}

}

},{passive:false});

window.addEventListener("touchmove",e=>{

e.preventDefault();

for(const t of e.touches){

if(t.identifier===joy.id){

let dx=t.clientX-joy.startX;
let dy=t.clientY-joy.startY;

const dist=Math.min(
Math.hypot(dx,dy),
JOY_RADIUS
);

const ang=Math.atan2(dy,dx);

dx=Math.cos(ang)*dist;
dy=Math.sin(ang)*dist;

moveDot(dx,dy);

joy.dx=dx/JOY_RADIUS;
joy.dy=-dy/JOY_RADIUS;

}

if(t.identifier===look.id){

const mx=t.clientX-look.lastX;
const my=t.clientY-look.lastY;

player.rotation.y-=mx*LOOK_SPEED_X;

camera.rotation.x-=my*LOOK_SPEED_Y;

camera.rotation.x=Math.max(
-1.4,
Math.min(
1.4,
camera.rotation.x
)
);

look.lastX=t.clientX;
look.lastY=t.clientY;

}

}

},{passive:false});

function endTouch(e){

for(const t of e.changedTouches){

if(t.identifier===joy.id){

joy.id=null;

joy.dx=0;
joy.dy=0;

moveDot(0,0);

joyRing.style.opacity="0";

}

if(t.identifier===look.id){

look.id=null;

}

}

}

window.addEventListener(
"touchend",
endTouch,
{passive:false}
);

window.addEventListener(
"touchcancel",
endTouch,
{passive:false}
);

// -----------------------------
// JUMP
// -----------------------------

document
.getElementById("btn-jump")
.addEventListener(
"touchstart",
e=>{

e.preventDefault();

if(onGround){

velocity.y=JUMP_FORCE;
onGround=false;

}

},
{passive:false}
);

// -----------------------------
// RESIZE
// -----------------------------

addEventListener("resize",()=>{

camera.aspect=
innerWidth/
innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(
innerWidth,
innerHeight
);

});

// -----------------------------
// FPS
// -----------------------------

const info=document.getElementById("info");

let fps=0;
let frames=0;
let last=0;

const clock=new THREE.Clock();

// -----------------------------
// MOVEMENT
// -----------------------------

function updateMovement(delta){

let x=joy.dx;
let z=joy.dy;

if(keys["KeyW"]) z=1;
if(keys["KeyS"]) z=-1;
if(keys["KeyA"]) x=-1;
if(keys["KeyD"]) x=1;

const len=Math.hypot(x,z);

if(len>1){

x/=len;
z/=len;

}

const speed=
keys["ShiftLeft"]?
RUN_SPEED:
WALK_SPEED;

const forward=new THREE.Vector3(
-Math.sin(player.rotation.y),
0,
-Math.cos(player.rotation.y)
);

const right=new THREE.Vector3(
Math.cos(player.rotation.y),
0,
-Math.sin(player.rotation.y)
);

direction.set(0,0,0);

direction.addScaledVector(
forward,
z
);

direction.addScaledVector(
right,
x
);

if(direction.lengthSq()>0){

direction.normalize();

}

velocity.x=
direction.x*
speed;

velocity.z=
direction.z*
speed;

player.position.x+=
velocity.x*
delta;

player.position.z+=
velocity.z*
delta;

velocity.y-=
GRAVITY*
delta;

player.position.y+=
velocity.y*
delta;

}
// ==========================================================
// PART 3 OF 3
// CONTINUE BELOW PART 2
// ==========================================================

// -----------------------------
// FLOOR COLLISION
// -----------------------------

function updateGround(){

    floorRay.set(
        player.position.clone().add(
            new THREE.Vector3(0,2,0)
        ),
        DOWN
    );

    const hit = floorRay.intersectObjects(
        worldMeshes,
        true
    );

    if(hit.length){

        const floorY = hit[0].point.y;

        if(player.position.y <= floorY){

            player.position.y = floorY;

            velocity.y = 0;

            onGround = true;

        }

    }

}

// -----------------------------
// WALL COLLISION
// -----------------------------

function updateWalls(){

    const dirs = [

        new THREE.Vector3(1,0,0),
        new THREE.Vector3(-1,0,0),
        new THREE.Vector3(0,0,1),
        new THREE.Vector3(0,0,-1)

    ];

    for(const dir of dirs){

        wallRay.set(

            player.position.clone().add(
                new THREE.Vector3(
                    0,
                    PLAYER_HEIGHT*0.5,
                    0
                )
            ),

            dir

        );

        const hit = wallRay.intersectObjects(
            worldMeshes,
            true
        );

        if(hit.length && hit[0].distance < PLAYER_RADIUS){

            player.position.addScaledVector(

                dir,

                -(PLAYER_RADIUS-hit[0].distance)

            );

        }

    }

}

// -----------------------------
// MAP LIMIT
// -----------------------------

const MAP_LIMIT = 60;

function clampPlayer(){

    player.position.x = Math.max(
        -MAP_LIMIT,
        Math.min(
            MAP_LIMIT,
            player.position.x
        )
    );

    player.position.z = Math.max(
        -MAP_LIMIT,
        Math.min(
            MAP_LIMIT,
            player.position.z
        )
    );

}

// -----------------------------
// MAIN LOOP
// -----------------------------

function animate(){

    requestAnimationFrame(animate);

    const delta = Math.min(
        clock.getDelta(),
        0.05
    );

    updateMovement(delta);

    updateGround();

    updateWalls();

    clampPlayer();

    renderer.render(
        scene,
        camera
    );

    frames++;

    const now = performance.now();

    if(now-last>=1000){

        fps = frames;

        frames = 0;

        last = now;

        info.textContent =
`FPS ${fps}
X ${player.position.x.toFixed(1)}
Y ${player.position.y.toFixed(1)}
Z ${player.position.z.toFixed(1)}`;

    }

}

animate();

