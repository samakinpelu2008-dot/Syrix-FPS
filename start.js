import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.166.1/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(light);

const loader = new GLTFLoader();

loader.load(
    "assets/maps/low-poly_fps_map.glb",

    function(gltf){
        scene.add(gltf.scene);

        document.getElementById("loading").style.display="none";

        console.log("Map Loaded");
    },

    undefined,

    function(error){
        console.error(error);
    }
);

function animate(){

    requestAnimationFrame(animate);

    renderer.render(scene,camera);

}

animate();

window.addEventListener("resize",()=>{

    camera.aspect=window.innerWidth/window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth,window.innerHeight);

});
