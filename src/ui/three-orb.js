// Three.js 3D Holographic AI Core Orb for Blackmagic AI
let scene, camera, renderer, coreSphere, particleGroup, rings = [];
let animId = null;
let currentPulse = 1.0;
let targetPulse = 1.0;

export function initThreeOrb(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const width = container.clientWidth || 220;
  const height = container.clientHeight || 220;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 24;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // 1. Central Core Wireframe Icosahedron
  const coreGeo = new THREE.IcosahedronGeometry(5.5, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x6366f1,
    wireframe: true,
    transparent: true,
    opacity: 0.65
  });
  coreSphere = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreSphere);

  // 2. Inner Glowing Core
  const innerGeo = new THREE.SphereGeometry(3.5, 16, 16);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  coreSphere.add(innerSphere);

  // 3. Orbital Rings
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(7.5 + i * 1.5, 7.8 + i * 1.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0x8b5cf6 : i === 1 ? 0x06b6d4 : 0xec4899,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5 - i * 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / (2 + i * 0.5);
    ring.rotation.y = (Math.PI / 4) * i;
    scene.add(ring);
    rings.push(ring);
  }

  // 4. Floating Particle Cloud
  const particleGeo = new THREE.BufferGeometry();
  const count = 120;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    const r = 9 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = r * Math.cos(phi);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.35,
    transparent: true,
    opacity: 0.8
  });
  particleGroup = new THREE.Points(particleGeo, particleMat);
  scene.add(particleGroup);

  function animate() {
    animId = requestAnimationFrame(animate);

    // Smooth pulse interpolation
    currentPulse += (targetPulse - currentPulse) * 0.1;
    if (coreSphere) {
      coreSphere.scale.set(currentPulse, currentPulse, currentPulse);
      coreSphere.rotation.x += 0.006;
      coreSphere.rotation.y += 0.009;
    }

    rings.forEach((ring, idx) => {
      ring.rotation.z += 0.005 * (idx % 2 === 0 ? 1 : -1);
      ring.rotation.y += 0.003 * (idx + 1);
    });

    if (particleGroup) {
      particleGroup.rotation.y -= 0.004;
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth || 220;
    const h = container.clientHeight || 220;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

export function pulseOrb(intensity = 1.3) {
  targetPulse = intensity;
  setTimeout(() => { targetPulse = 1.0; }, 300);
}

export function setOrbMode(mode) {
  if (!coreSphere) return;
  const mat = coreSphere.material;
  const innerMat = coreSphere.children?.[0]?.material;

  switch (mode) {
    case 'amber':
    case 'heart':
      mat.color.setHex(0xf97316); // Fiery Amber / Heart Arc Reactor (Video 1)
      if (innerMat) innerMat.color.setHex(0xfacc15);
      pulseOrb(1.6);
      break;
    case 'sassy':
    case 'witty':
      mat.color.setHex(0xd946ef); // Radiant magenta / hot pink (Blackmagic Radiant)
      if (innerMat) innerMat.color.setHex(0xf43f5e);
      pulseOrb(1.5);
      break;
    case 'caring':
    case 'calm':
      mat.color.setHex(0x06b6d4); // Cyan / emerald
      if (innerMat) innerMat.color.setHex(0x10b981);
      pulseOrb(1.2);
      break;
    case 'focused':
    case 'working':
      mat.color.setHex(0x3b82f6); // Azure blue
      if (innerMat) innerMat.color.setHex(0x60a5fa);
      pulseOrb(1.3);
      break;
    case 'alert':
    case 'critical':
      mat.color.setHex(0xef4444); // Fiery red
      if (innerMat) innerMat.color.setHex(0xf97316);
      pulseOrb(2.0);
      break;
    case 'joyful':
    case 'cheerful':
      mat.color.setHex(0xfbbf24); // Golden warm
      if (innerMat) innerMat.color.setHex(0xf59e0b);
      pulseOrb(1.4);
      break;
    case 'speaking':
    case 'voice':
      mat.color.setHex(0xa855f7); // Glowing purple / violet (Blackmagic Voice active)
      if (innerMat) innerMat.color.setHex(0xec4899);
      break;
    case 'listening':
      mat.color.setHex(0x38bdf8); // Sky blue listening glow
      if (innerMat) innerMat.color.setHex(0x818cf8);
      break;
    case 'offline':
      mat.color.setHex(0x64748b);
      break;
    default:
      mat.color.setHex(0x8b5cf6); // Blackmagic default violet
      if (innerMat) innerMat.color.setHex(0x06b6d4);
  }
}
