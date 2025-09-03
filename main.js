import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// --------------------- Scene & Camera ---------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(250, 20, 0);
camera.lookAt(0, 0, 0);

// --------------------- Renderer ---------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Tone mapping for nicer lighting
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --------------------- Controls ---------------------
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.target.set(0, 1, 0);
orbitControls.update();

const fpsControls = new PointerLockControls(camera, renderer.domElement);
fpsControls.enabled = false;

// --------------------- Movement ---------------------
const move = { forward: false, backward: false, left: false, right: false };
let baseSpeed = 4, runSpeed = 8, isRunning = false;
let velocity = new THREE.Vector3(), direction = new THREE.Vector3();

// Jump / Gravity
let canJump = true, verticalVelocity = 0, gravity = -20, jumpStrength = 5;

// Bunny hop
let bunnyHopMultiplier = 1, maxBunnyHop = 5;

// Crouch
let isCrouching = false, crouchOffset = -0.7, crouchSpeed = 1, normalSpeed = baseSpeed;
let groundHeight = -19;

// --------------------- Collision ---------------------
const collidableObjects = [];
const colliderBoxes = [];
const cameraBox = new THREE.Box3();
const cameraBoxSize = new THREE.Vector3(1, 2, 1); // width, height, depth

function checkCollisionBox(position) {
    cameraBox.setFromCenterAndSize(
        new THREE.Vector3(position.x, position.y + cameraBoxSize.y / 2, position.z),
        cameraBoxSize
    );
    for (let i = 0; i < colliderBoxes.length; i++) {
        if (cameraBox.intersectsBox(colliderBoxes[i])) return true;
    }
    return false;
}

// --------------------- Keyboard ---------------------
document.addEventListener('keydown', (e) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(e.code)) e.preventDefault();
    switch (e.code) {
        case 'KeyW': move.forward = true; break;
        case 'KeyS': move.backward = true; break;
        case 'KeyA': move.left = true; break;
        case 'KeyD': move.right = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': isRunning = true; break;
        case 'Space':
            if (canJump && !isCrouching) {
                verticalVelocity = jumpStrength; canJump = false;
                if (isRunning) bunnyHopMultiplier = Math.min(bunnyHopMultiplier * 1.1, maxBunnyHop);
            }
            break;
        case 'ControlLeft':
        case 'ControlRight':
            if (!isCrouching) { isCrouching = true; camera.position.y += crouchOffset; normalSpeed = baseSpeed; baseSpeed = crouchSpeed; }
            break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': move.forward = false; break;
        case 'KeyS': move.backward = false; break;
        case 'KeyA': move.left = false; break;
        case 'KeyD': move.right = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': isRunning = false; break;
        case 'ControlLeft':
        case 'ControlRight':
            if (isCrouching) { isCrouching = false; camera.position.y -= crouchOffset; baseSpeed = normalSpeed; }
            break;
    }
});

// --------------------- Pointer Lock ---------------------
document.addEventListener('click', () => { if (activeControls === fpsControls) fpsControls.lock(); });

// --------------------- Camera Mode ---------------------
let activeControls = orbitControls;

// Multiple camera view presets
const cameraViews = [
    { name: 'Orbit (Default)', pos: [250, 20, 0], target: [0, 1, 0] },
    { name: 'Aerial View', pos: [0, 150, 0], target: [0, 0, 0] },
    { name: 'Front Entrance', pos: [0, 30, 200], target: [0, 0, 0] },
    { name: 'Side View', pos: [300, 40, 0], target: [0, 0, 0] },
    { name: 'Close-up', pos: [50, 15, 50], target: [0, 0, 0] },
    { name: 'Back View', pos: [0, 30, -200], target: [0, 0, 0] }
];

let currentViewIndex = 0;

function switchToCameraView(index) {
    if (index < 0 || index >= cameraViews.length) return;
    currentViewIndex = index;
    const view = cameraViews[index];
    
    // Smooth transition to new position
    const targetPos = new THREE.Vector3(...view.pos);
    const targetTarget = new THREE.Vector3(...view.target);
    
    // Animate camera position
    const startPos = camera.position.clone();
    const startTarget = orbitControls.target.clone();
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    function animateTransition() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        
        camera.position.lerpVectors(startPos, targetPos, ease);
        orbitControls.target.lerpVectors(startTarget, targetTarget, ease);
        orbitControls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateTransition);
        }
    }
    
    animateTransition();
}

function nextCameraView() {
    switchToCameraView((currentViewIndex + 1) % cameraViews.length);
}

function previousCameraView() {
    switchToCameraView((currentViewIndex - 1 + cameraViews.length) % cameraViews.length);
}

function activateOrbitControls() {
    fpsControls.unlock && fpsControls.unlock();
    fpsControls.enabled = false;
    orbitControls.enabled = true;
    activeControls = orbitControls;
    // Reset to current view when switching back to orbit
    switchToCameraView(currentViewIndex);
    console.log('Orbit Controls Activated');
    document.getElementById("cameraView").value = "orbit";
}

function activateFPSControls() {
    orbitControls.enabled = false;
    fpsControls.enabled = true;
    activeControls = fpsControls;
    camera.position.set(150, -19, 0);
    console.log('FPS Controls Activated');
    document.getElementById("cameraView").value = "fps";
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyO') activateOrbitControls();
    if (e.code === 'KeyP') activateFPSControls();
    // Camera view navigation
    if (e.code === 'ArrowRight') nextCameraView();
    if (e.code === 'ArrowLeft') previousCameraView();
    // Quick number keys for specific views
    if (e.code >= 'Digit1' && e.code <= 'Digit6') {
        const viewIndex = parseInt(e.code.slice(-1)) - 1;
        if (viewIndex < cameraViews.length) switchToCameraView(viewIndex);
    }
});
document.getElementById("cameraView").addEventListener("change", (e) => {
    if (e.target.value === "orbit") activateOrbitControls();
    if (e.target.value === "fps") activateFPSControls();
});

// --------------------- Loading Overlay ---------------------
const loadingOverlay = document.getElementById('loading');
const loadingProgressEl = document.getElementById('loadingProgress');
const progressBarEl = document.getElementById('progressBar');
const assetCountEl = document.getElementById('assetCount');
const loadingTipEl = document.getElementById('loadingTip');

const tips = [
    'Use ← → arrows to cycle camera views.',
    'Press O for Orbit and P for FPS mode.',
    'Try Night mode to see campus lights.',
    'Hold Shift to run faster in FPS.',
    'Use numbers 1–6 for quick presets.'
];
let tipIndex = 0;
setInterval(() => {
    if (!loadingTipEl) return;
    tipIndex = (tipIndex + 1) % tips.length;
    loadingTipEl.textContent = `Tip: ${tips[tipIndex]}`;
}, 3000);

// Loading manager to track all assets
const loadingManager = new THREE.LoadingManager();
let totalItems = 0;
let loadedItems = 0;
loadingManager.onStart = () => {
    totalItems = 0;
    loadedItems = 0;
    if (loadingOverlay) loadingOverlay.style.opacity = '1';
    if (progressBarEl) progressBarEl.style.width = '0%';
    if (assetCountEl) assetCountEl.textContent = '0/0';
};
loadingManager.onProgress = () => {
    loadedItems += 1;
    totalItems = Math.max(totalItems, loadedItems);
    const pct = Math.round((loadedItems / Math.max(totalItems, 1)) * 100);
    if (loadingProgressEl) loadingProgressEl.textContent = `${pct}%`;
    if (progressBarEl) progressBarEl.style.width = `${pct}%`;
    if (assetCountEl) assetCountEl.textContent = `${loadedItems}/${totalItems}`;
};
loadingManager.onLoad = () => {
    // Smooth finish animation
    if (progressBarEl) progressBarEl.style.width = '100%';
    if (loadingProgressEl) loadingProgressEl.textContent = '100%';
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 450);
        }
    }, 250);
    startIntroFlyIn();
};

// --------------------- Sky & Sun (Time of Day) ---------------------
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
sunLight.position.set(0, 1, 0);
sunLight.castShadow = false;
scene.add(sunLight);

// Additional lighting for night mode
const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
scene.add(ambientLight);

// Cool sky glow for night
const hemiLight = new THREE.HemisphereLight(0x6fa3ff, 0x0b0f19, 0.0);
scene.add(hemiLight);

const nightPointLights = [];
const nightLightPositions = [
    { pos: [0, 15, 0], color: 0xffaa00, intensity: 0.8 },      // Central campus light
    { pos: [50, 12, 50], color: 0xffffff, intensity: 0.6 },    // Corner light 1
    { pos: [-50, 12, -50], color: 0xffffff, intensity: 0.6 },  // Corner light 2
    { pos: [50, 12, -50], color: 0xffffff, intensity: 0.6 },   // Corner light 3
    { pos: [-50, 12, 50], color: 0xffffff, intensity: 0.6 },   // Corner light 4
    { pos: [0, 8, 100], color: 0xffcc66, intensity: 0.4 },     // Front entrance
    { pos: [0, 8, -100], color: 0xffcc66, intensity: 0.4 }     // Back entrance
];

nightLightPositions.forEach(({ pos, color, intensity }) => {
    const light = new THREE.PointLight(color, intensity, 50, 2);
    light.position.set(...pos);
    light.castShadow = false;
    scene.add(light);
    nightPointLights.push(light);
});

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const skyUniforms = sky.material.uniforms;
skyUniforms[ 'turbidity' ].value = 8;
skyUniforms[ 'rayleigh' ].value = 1.2;
skyUniforms[ 'mieCoefficient' ].value = 0.02;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;

const sunPosition = new THREE.Vector3();

let timeMode = 'auto'; // 'auto' | 'day' | 'sunset' | 'night'
let timeParam = 0; // 0..1 mapped through modes when auto

function updateSkyFromParams(elevationDeg, azimuthDeg, intensity, exposure) {
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    sunPosition.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms[ 'sunPosition' ].value.copy(sunPosition);
    sunLight.position.copy(sunPosition.clone().multiplyScalar(1000));
    sunLight.intensity = intensity;
    renderer.toneMappingExposure = exposure;
    const envRT = pmremGenerator.fromScene(sky);
    scene.environment = envRT.texture;
    scene.background = envRT.texture;
}

// Rain system setup
let rainGroup = null;
let rainMaterial = null;
let isRaining = false;

function createRain() {
    if (rainGroup) return;
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 4000;
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
        positions[i*3 + 0] = (Math.random() - 0.5) * 800;
        positions[i*3 + 1] = Math.random() * 400 + 50;
        positions[i*3 + 2] = (Math.random() - 0.5) * 800;
        velocities[i] = 200 + Math.random() * 200;
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    rainMaterial = new THREE.PointsMaterial({ color: 0xaec6ff, size: 0.8, transparent: true, opacity: 0.8 });
    rainGroup = new THREE.Points(rainGeometry, rainMaterial);
    rainGroup.visible = false;
    scene.add(rainGroup);
}

function toggleRain(active) {
    isRaining = active;
    if (!rainGroup) createRain();
    if (rainGroup) rainGroup.visible = active;
}

function animateRain(delta) {
    if (!isRaining || !rainGroup) return;
    const positions = rainGroup.geometry.getAttribute('position');
    const velocities = rainGroup.geometry.getAttribute('velocity');
    for (let i = 0; i < velocities.count; i++) {
        let y = positions.getY(i) - velocities.getX(i) * delta;
        if (y < -10) {
            y = Math.random() * 400 + 50;
            positions.setX(i, (Math.random() - 0.5) * 800);
            positions.setZ(i, (Math.random() - 0.5) * 800);
        }
        positions.setY(i, y);
    }
    positions.needsUpdate = true;
}

function setTimeOfDay(mode, t) {
    // t in 0..1 for auto cycle
    if (mode === 'day') {
        sunLight.intensity = 3.0;
        ambientLight.intensity = 0.12;
        hemiLight.intensity = 0.0;
        nightPointLights.forEach(light => light.intensity = 0);
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = 8;
        skyUniforms[ 'rayleigh' ].value = 1.2;
        skyUniforms[ 'mieCoefficient' ].value = 0.02;
        skyUniforms[ 'mieDirectionalG' ].value = 0.8;
        updateSkyFromParams(60, 180, 3.0, 1.0);
    } else if (mode === 'sunset' || mode === 'evening') {
        const exp = 0.9;
        sunLight.intensity = 1.2;
        ambientLight.intensity = 0.28;
        hemiLight.intensity = 0.18;
        hemiLight.color.setHex(0xffb27a);
        hemiLight.groundColor.setHex(0x1a0d05);
        nightPointLights.forEach(light => light.intensity = 0.15);
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = 10;
        skyUniforms[ 'rayleigh' ].value = 1.5;
        skyUniforms[ 'mieCoefficient' ].value = 0.03;
        skyUniforms[ 'mieDirectionalG' ].value = 0.9;
        updateSkyFromParams(10, 200, 1.2, exp);
    } else if (mode === 'dawn') {
        sunLight.intensity = 0.8;
        ambientLight.intensity = 0.25;
        hemiLight.intensity = 0.25;
        hemiLight.color.setHex(0xffd1a6);
        hemiLight.groundColor.setHex(0x0e0b08);
        nightPointLights.forEach(light => light.intensity = 0.2);
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = 9;
        skyUniforms[ 'rayleigh' ].value = 1.6;
        skyUniforms[ 'mieCoefficient' ].value = 0.025;
        skyUniforms[ 'mieDirectionalG' ].value = 0.85;
        updateSkyFromParams(6, 160, 0.8, 0.92);
    } else if (mode === 'morning') {
        sunLight.intensity = 2.2;
        ambientLight.intensity = 0.16;
        hemiLight.intensity = 0.08;
        hemiLight.color.setHex(0xfff3cc);
        hemiLight.groundColor.setHex(0x0b0f19);
        nightPointLights.forEach(light => light.intensity = 0);
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = 7;
        skyUniforms[ 'rayleigh' ].value = 1.3;
        skyUniforms[ 'mieCoefficient' ].value = 0.02;
        skyUniforms[ 'mieDirectionalG' ].value = 0.82;
        updateSkyFromParams(35, 170, 2.2, 1.0);
    } else if (mode === 'noon') {
        sunLight.intensity = 3.2;
        ambientLight.intensity = 0.12;
        hemiLight.intensity = 0.02;
        hemiLight.color.setHex(0xffffff);
        hemiLight.groundColor.setHex(0x0b0f19);
        nightPointLights.forEach(light => light.intensity = 0);
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = 4.5;
        skyUniforms[ 'rayleigh' ].value = 1.0;
        skyUniforms[ 'mieCoefficient' ].value = 0.015;
        skyUniforms[ 'mieDirectionalG' ].value = 0.78;
        updateSkyFromParams(70, 180, 3.2, 1.05);
    } else if (mode === 'night') {
        sunLight.intensity = 0;
        ambientLight.intensity = 0.55;
        hemiLight.intensity = 0.45;
        hemiLight.color.setHex(0x6fa3ff);
        hemiLight.groundColor.setHex(0x0b0f19);
        nightPointLights.forEach((light, i) => { light.intensity = nightLightPositions[i].intensity; });
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = 2;
        skyUniforms[ 'rayleigh' ].value = 0.25;
        skyUniforms[ 'mieCoefficient' ].value = 0.006;
        skyUniforms[ 'mieDirectionalG' ].value = 0.65;
        updateSkyFromParams(-8, 180, 0.1, 0.5);
    } else if (mode === 'rain') {
        // Overcast lighting and fog
        sunLight.intensity = 0.6;
        ambientLight.intensity = 0.5;
        hemiLight.intensity = 0.35;
        hemiLight.color.setHex(0xbfd3ff);
        hemiLight.groundColor.setHex(0x0a0e16);
        nightPointLights.forEach(light => light.intensity = 0.15);
        toggleRain(true);
        // Softer, grey sky feel
        skyUniforms[ 'turbidity' ].value = 14;
        skyUniforms[ 'rayleigh' ].value = 0.8;
        skyUniforms[ 'mieCoefficient' ].value = 0.06;
        skyUniforms[ 'mieDirectionalG' ].value = 0.9;
        updateSkyFromParams(20, 180, 0.6, 0.85);
        // Light fog for rain mood
        scene.fog = new THREE.Fog(0x0b0f19, 120, 700);
    } else {
        // Auto: animate elevation across the day
        const elevation = Math.sin(t * Math.PI * 2) * 35 + 35; // 0..70 deg
        const azimuth = 180 + Math.cos(t * Math.PI * 2) * 30; // swing around
        const daylight = Math.max(0, Math.sin(t * Math.PI * 2));
        const exposure = THREE.MathUtils.lerp(0.45, 1.05, daylight);
        const intensity = THREE.MathUtils.lerp(0.1, 3.2, daylight);
        sunLight.intensity = intensity;
        ambientLight.intensity = THREE.MathUtils.lerp(0.55, 0.12, daylight);
        hemiLight.intensity = THREE.MathUtils.lerp(0.45, 0.02, daylight);
        nightPointLights.forEach((light, i) => { light.intensity = THREE.MathUtils.lerp(nightLightPositions[i].intensity, 0, daylight); });
        toggleRain(false);
        scene.fog = null;
        skyUniforms[ 'turbidity' ].value = THREE.MathUtils.lerp(2, 7.5, daylight);
        skyUniforms[ 'rayleigh' ].value = THREE.MathUtils.lerp(0.25, 1.2, daylight);
        skyUniforms[ 'mieCoefficient' ].value = THREE.MathUtils.lerp(0.006, 0.02, daylight);
        skyUniforms[ 'mieDirectionalG' ].value = THREE.MathUtils.lerp(0.65, 0.8, daylight);
        updateSkyFromParams(elevation, azimuth, intensity, exposure);
    }
}

// --------------------- GLTF Loader ---------------------
const loader = new GLTFLoader(loadingManager);
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
loader.setDRACOLoader(dracoLoader);

loader.load('/model.glb', (gltf) => {
    scene.add(gltf.scene);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center);
    orbitControls.target.copy(center);
    orbitControls.update();

    gltf.scene.traverse((child) => {
        if (child.name && child.name.includes("COLLIDER")) {
            collidableObjects.push(child);
            child.visible = false;
            const bBox = new THREE.Box3().setFromObject(child);
            colliderBoxes.push(bBox);
        }
    });
    // Count as one tracked item
    totalItems += 1;
}, undefined, (err) => console.error('Model error:', err));

// --------------------- HDRI (Optional fallback reflection) ---------------------
new EXRLoader(loadingManager).setPath('/').load('sky.exr', (texture) => {
    // Keep for subtle reflections at start; Sky will replace environment shortly.
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
});

// Initialize sky to a pleasant day by default
setTimeOfDay('day', 0);

// --------------------- Resize ---------------------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --------------------- Animate ---------------------
const clock = new THREE.Clock();
let autoTime = 0; // 0..1

// Intro camera fly-in
let isIntro = true;
let introStart = null;
const introDuration = 4000; // ms
const introFrom = new THREE.Vector3(450, 160, 450);
const introTo = new THREE.Vector3(250, 20, 0);

function startIntroFlyIn() {
    isIntro = true;
    introStart = performance.now();
    orbitControls.enabled = false;
    camera.position.copy(introFrom);
    orbitControls.target.set(0, 1, 0);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const now = performance.now();

    // Time-of-day auto cycle
    if (timeMode === 'auto') {
        autoTime = (autoTime + delta * 0.02) % 1; // slow cycle
        setTimeOfDay('auto', autoTime);
    }

    // Weather
    animateRain(delta);

    // Intro camera animation
    if (isIntro && introStart !== null) {
        const t = THREE.MathUtils.clamp((now - introStart) / introDuration, 0, 1);
        const ease = t < 1 ? (1 - Math.pow(1 - t, 3)) : 1; // easeOutCubic
        camera.position.lerpVectors(introFrom, introTo, ease);
        camera.lookAt(0, 1, 0);
        if (t >= 1) {
            isIntro = false;
            orbitControls.enabled = true;
            orbitControls.autoRotate = true;
            orbitControls.autoRotateSpeed = 0.8;
        }
    }

    if (activeControls === fpsControls) {
        velocity.set(0, 0, 0); direction.set(0, 0, 0);
        if (move.forward) direction.z -= 1;
        if (move.backward) direction.z += 1;
        if (move.left) direction.x -= 1;
        if (move.right) direction.x += 1;
        direction.normalize();

        const currentSpeed = (isRunning ? runSpeed : baseSpeed) * bunnyHopMultiplier;
        const moveX = direction.x * currentSpeed * delta;
        const moveZ = direction.z * currentSpeed * delta;

        // Proposed position
        const newPos = camera.position.clone();
        newPos.x += moveX;
        newPos.z += -moveZ;

        // Collision
        if (!checkCollisionBox(newPos)) {
            fpsControls.moveRight(moveX);
            fpsControls.moveForward(-moveZ);
        }

        // Gravity / Jump
        verticalVelocity += gravity * delta;
        camera.position.y += verticalVelocity * delta;
        let currentGround = isCrouching ? groundHeight + crouchOffset : groundHeight;
        if (camera.position.y <= currentGround) {
            camera.position.y = currentGround;
            verticalVelocity = 0;
            canJump = true;
            if (!move.forward && !move.backward && !move.left && !move.right) bunnyHopMultiplier = 1;
        }
    } else orbitControls.update();

    renderer.render(scene, camera);
}
animate();

// --------------------- Mode Switcher UI ---------------------
const modeSwitcher = document.getElementById('modeSwitcher');
if (modeSwitcher) {
    modeSwitcher.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const mode = target.getAttribute('data-mode');
        if (!mode) return;
        // Update active styles
        Array.from(modeSwitcher.querySelectorAll('button')).forEach((btn) => btn.classList.remove('active'));
        target.classList.add('active');
        timeMode = mode;
        if (['day','sunset','evening','dawn','morning','noon','night','rain'].includes(timeMode)) setTimeOfDay(timeMode, 0);
        if (timeMode === 'auto') { toggleRain(false); scene.fog = null; }
    });
}

// --------------------- Camera Navigation UI ---------------------
const cameraNav = document.getElementById('cameraNav');
const currentViewNameEl = document.getElementById('currentViewName');
const prevViewBtn = document.getElementById('prevView');
const nextViewBtn = document.getElementById('nextView');

if (cameraNav) {
    prevViewBtn.addEventListener('click', previousCameraView);
    nextViewBtn.addEventListener('click', nextCameraView);
}

function updateCameraViewUI() {
    if (currentViewNameEl) {
        currentViewNameEl.textContent = cameraViews[currentViewIndex].name;
    }
}

// Update UI when switching views
const originalSwitchToCameraView = switchToCameraView;
switchToCameraView = function(index) {
    originalSwitchToCameraView(index);
    updateCameraViewUI();
};

// Initialize UI
updateCameraViewUI();

// Disable autorotate in FPS mode
const originalActivateFPS = activateFPSControls;
activateFPSControls = function() {
    originalActivateFPS();
    orbitControls.autoRotate = false;
};

const originalActivateOrbit = activateOrbitControls;
activateOrbitControls = function() {
    originalActivateOrbit();
    orbitControls.autoRotate = true;
};

// --------------------- Help Modal ---------------------
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelp = document.getElementById('closeHelp');

function openHelp() { if (helpModal) helpModal.style.display = 'flex'; }
function closeHelpModal() { if (helpModal) helpModal.style.display = 'none'; }

if (helpBtn) helpBtn.addEventListener('click', openHelp);
if (closeHelp) closeHelp.addEventListener('click', closeHelpModal);
if (helpModal) helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelpModal(); });

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeHelpModal();
    if (e.code === 'KeyH' && !helpModal?.style.display) openHelp();
});
