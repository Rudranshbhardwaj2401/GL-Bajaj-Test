import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

// Scene and Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(2, 2, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit Controls (default)
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.target.set(0, 1, 0);
orbitControls.update();

// Fly Controls
const flyControls = new FlyControls(camera, renderer.domElement);
flyControls.movementSpeed = 30;
flyControls.rollSpeed = Math.PI / 12;
flyControls.autoForward = false;
flyControls.dragToLook = false;
flyControls.enabled = true;
flyControls.rollSpeed = 0.8;
const originalUpdate = flyControls.update.bind(flyControls);
flyControls.update = function (delta) {
    originalUpdate(delta);
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    euler.z = 0; // lock roll
    camera.quaternion.setFromEuler(euler);
};

let activeControls = orbitControls; // Default

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ✅ Draco loader setup
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
// Option 1: Use Google’s hosted decoder (no need to upload files)
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
// Option 2: If you downloaded draco folder → put it in /public/draco/ and use:
// dracoLoader.setDecoderPath('/draco/');
loader.setDRACOLoader(dracoLoader);

// Load GLB Model
loader.load('/model.glb', (gltf) => {
    scene.add(gltf.scene);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    gltf.scene.position.sub(center);
    camera.position.set(0, 0, size * 1.5);

    orbitControls.target.copy(center);
    orbitControls.update();
}, undefined, (err) => console.error('Model error:', err));

// Load HDRI (.exr)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new EXRLoader()
    .setPath('/')
    .load('sky.exr', (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        scene.background = envMap;
        texture.dispose();
        pmremGenerator.dispose();
    });

// Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (activeControls === flyControls) {
        flyControls.update(delta);
    } else {
        orbitControls.update();
    }

    renderer.render(scene, camera);
}
animate();

// ⌨️ Key Toggle Between Controls
window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF') {
        orbitControls.enabled = false;
        flyControls.enabled = true;
        activeControls = flyControls;
        console.log('🔧 Switched to Fly Controls');
    }
    if (event.code === 'KeyO') {
        flyControls.enabled = false;
        orbitControls.enabled = true;
        activeControls = orbitControls;
        console.log('🔄 Switched to Orbit Controls');
    }
});
