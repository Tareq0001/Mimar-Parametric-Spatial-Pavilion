import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CameraPreset } from '../types';
import { SolarState } from './solarSimulator';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public sunMesh: THREE.Mesh;
  public gridHelper: THREE.GridHelper;
  public groundPlane: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public waterBasinCoping: THREE.Mesh;
  public sunbeamMesh: THREE.Mesh;

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private isAutoRotating: boolean = false;
  private autoRotateSpeed: number = 0.0025;
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, 7, 0);

  // Mouse orbit dragging state
  private isMouseDown: boolean = false;
  private mousePrevX: number = 0;
  private mousePrevY: number = 0;
  private spherical: THREE.Spherical = new THREE.Spherical(58, Math.PI / 2.7, Math.PI / 4.2);

  private clock: THREE.Clock = new THREE.Clock();
  private waterPositionsBase: Float32Array | null = null;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a12);
    this.scene.fog = new THREE.FogExp2(0x060a12, 0.007);

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
    this.updateCameraFromSpherical();

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Directional Sunlight with High Definition Soft Shadows
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 3.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 200;
    const shadowDist = 42;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Ambient & Hemisphere Lighting
    this.ambientLight = new THREE.AmbientLight(0x0b1120, 1.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    this.scene.add(this.hemiLight);

    // Visual Sun Sphere in sky
    const sunGeom = new THREE.SphereGeometry(2.8, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.scene.add(this.sunMesh);

    // Architectural Ground Obsidian Platform
    const groundGeom = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x040810,
      roughness: 0.95,
      metalness: 0.08
    });
    this.groundPlane = new THREE.Mesh(groundGeom, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.08;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // 1. Reflecting Water Basin (بركة ماء عاكسة هادئة تحت وحول المبنى)
    const basinSize = 64;
    const waterGeom = new THREE.PlaneGeometry(basinSize, basinSize, 48, 48);
    // Cache original vertex positions for ripple waves
    this.waterPositionsBase = new Float32Array(waterGeom.attributes.position.array);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x081726,
      roughness: 0.04,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.333,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 0.95,
      transparent: true,
      opacity: 0.92
    });
    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = 0.02;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // Marble / Bronze Coping Rim around Water Basin
    const copingGeom = new THREE.BoxGeometry(basinSize + 1.2, 0.22, basinSize + 1.2);
    const copingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.6
    });
    this.waterBasinCoping = new THREE.Mesh(copingGeom, copingMat);
    this.waterBasinCoping.position.y = 0.05;
    this.waterBasinCoping.receiveShadow = true;
    this.waterBasinCoping.castShadow = true;
    this.scene.add(this.waterBasinCoping);

    // 2. Volumetric Sunbeam / Oculus Light Shaft (حزمة نور سماوية هابطة من العين المركزية)
    const beamGeom = new THREE.CylinderGeometry(4.5, 14.0, 24, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sunbeamMesh = new THREE.Mesh(beamGeom, beamMat);
    this.sunbeamMesh.position.set(0, 10, 0);
    this.scene.add(this.sunbeamMesh);

    // Subtle Islamic Architectural Distance Grid & Radii
    this.gridHelper = new THREE.GridHelper(120, 60, 0xd97706, 0x131f33);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);
    this.addRadialMarkers();

    // 3. Postprocessing (Unreal Bloom for Soft Glow on highlights)
    this.initPostProcessing(container);

    this.bindEvents(container);
  }

  private initPostProcessing(container: HTMLElement): void {
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const res = new THREE.Vector2(container.clientWidth, container.clientHeight);
      this.bloomPass = new UnrealBloomPass(res, 0.45, 0.45, 0.88);
      this.composer.addPass(this.bloomPass);
    } catch (e) {
      console.warn('EffectComposer or BloomPass fallback to default WebGL rendering', e);
      this.composer = null;
    }
  }

  private addRadialMarkers(): void {
    const radii = [12, 24, 36, 48];
    const circleMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22
    });

    for (const r of radii) {
      const pts: THREE.Vector3[] = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * r, 0.03, Math.sin(theta) * r));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const circle = new THREE.Line(geom, circleMat);
      this.scene.add(circle);
    }
  }

  private bindEvents(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      if (this.composer) {
        this.composer.setSize(width, height);
      }
    });

    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    dom.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;

      const deltaX = e.clientX - this.mousePrevX;
      const deltaY = e.clientY - this.mousePrevY;
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;

      this.spherical.theta -= deltaX * 0.007;
      this.spherical.phi -= deltaY * 0.007;
      this.spherical.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.04, this.spherical.phi));

      this.updateCameraFromSpherical();
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius += e.deltaY * 0.04;
      this.spherical.radius = Math.max(16, Math.min(135, this.spherical.radius));
      this.updateCameraFromSpherical();
    }, { passive: false });
  }

  private updateCameraFromSpherical(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.targetLookAt);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.targetLookAt);
  }

  public setCameraPreset(preset: CameraPreset): void {
    let targetRadius = 56;
    let targetPhi = Math.PI / 3;
    let targetTheta = Math.PI / 4;

    switch (preset) {
      case 'isometric':
        targetRadius = 62;
        targetPhi = Math.PI / 3.2;
        targetTheta = Math.PI / 4;
        break;
      case 'perspective':
        targetRadius = 48;
        targetPhi = Math.PI / 2.7;
        targetTheta = Math.PI / 3.4;
        break;
      case 'elevation_front':
        targetRadius = 52;
        targetPhi = Math.PI / 2.1;
        targetTheta = 0;
        break;
      case 'elevation_side':
        targetRadius = 52;
        targetPhi = Math.PI / 2.1;
        targetTheta = Math.PI / 2;
        break;
      case 'plan_top':
        targetRadius = 68;
        targetPhi = 0.08;
        targetTheta = 0;
        break;
    }

    gsap.to(this.spherical, {
      radius: targetRadius,
      phi: targetPhi,
      theta: targetTheta,
      duration: 1.25,
      ease: 'power3.inOut',
      onUpdate: () => this.updateCameraFromSpherical()
    });
  }

  public updateSolarLighting(solar: SolarState): void {
    this.sunLight.position.copy(solar.sunPositionVector);
    this.sunMesh.position.copy(solar.sunPositionVector);
    this.sunLight.color.copy(solar.sunColor);
    this.sunMesh.material = new THREE.MeshBasicMaterial({ color: solar.sunColor });
    this.sunLight.intensity = Math.max(0.6, solar.sunIntensity * 1.15);

    this.hemiLight.color.copy(solar.skyTopColor);
    this.hemiLight.groundColor.copy(solar.skyBottomColor);

    this.scene.background = solar.skyTopColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = solar.skyTopColor;
    }

    // Align sunbeam with solar direction
    if (this.sunbeamMesh) {
      this.sunbeamMesh.visible = solar.solarAltitudeDeg > 15;
      const beamMat = this.sunbeamMesh.material as THREE.MeshBasicMaterial;
      beamMat.color.copy(solar.sunColor);
      beamMat.opacity = Math.min(0.12, (solar.solarAltitudeDeg / 90) * 0.12);
    }
  }

  public toggleAutoRotate(): boolean {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  public render(): void {
    const time = this.clock.getElapsedTime();

    if (this.isAutoRotating) {
      this.spherical.theta += this.autoRotateSpeed;
      this.updateCameraFromSpherical();
    }

    // Water Surface Gentle Ripple Perturbation
    if (this.waterMesh && this.waterPositionsBase) {
      const posAttr = this.waterMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const base = this.waterPositionsBase;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const u = base[i * 3];
        const v = base[i * 3 + 1];
        // Gentle dual sine ripples
        const wave = Math.sin(u * 0.35 + time * 1.8) * Math.cos(v * 0.35 + time * 1.5) * 0.045;
        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
