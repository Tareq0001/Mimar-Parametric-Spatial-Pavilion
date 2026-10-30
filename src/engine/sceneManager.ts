import * as THREE from 'three';
import gsap from 'gsap';
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

  private isAutoRotating: boolean = false;
  private autoRotateSpeed: number = 0.003;
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, 6, 0);

  // Mouse orbit dragging state
  private isMouseDown: boolean = false;
  private mousePrevX: number = 0;
  private mousePrevY: number = 0;
  private spherical: THREE.Spherical = new THREE.Spherical(55, Math.PI / 3, Math.PI / 4);

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030712);
    this.scene.fog = new THREE.FogExp2(0x030712, 0.008);

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
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // Directional Sunlight
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 180;
    const shadowDist = 38;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Ambient & Hemisphere Lighting
    this.ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.8);
    this.scene.add(this.hemiLight);

    // Visual Sun Sphere in the sky
    const sunGeom = new THREE.SphereGeometry(2.5, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.scene.add(this.sunMesh);

    // Ground Plane & Architectural Coordinate Grid
    const groundGeom = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050b14,
      roughness: 0.95,
      metalness: 0.1
    });
    this.groundPlane = new THREE.Mesh(groundGeom, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.05;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    this.gridHelper = new THREE.GridHelper(100, 50, 0xd97706, 0x1e293b);
    this.gridHelper.position.y = 0.0;
    this.scene.add(this.gridHelper);

    // Radial distance architectural circles
    this.addRadialMarkers();

    this.bindEvents(container);
  }

  private addRadialMarkers(): void {
    const radii = [10, 20, 30, 40];
    const circleMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25
    });

    for (const r of radii) {
      const pts: THREE.Vector3[] = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * r, 0.02, Math.sin(theta) * r));
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

      this.spherical.theta -= deltaX * 0.008;
      this.spherical.phi -= deltaY * 0.008;
      // Clamp phi to avoid flipping
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.spherical.phi));

      this.updateCameraFromSpherical();
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius += e.deltaY * 0.04;
      this.spherical.radius = Math.max(15, Math.min(140, this.spherical.radius));
      this.updateCameraFromSpherical();
    }, { passive: false });
  }

  private updateCameraFromSpherical(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.targetLookAt);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.targetLookAt);
  }

  public setCameraPreset(preset: CameraPreset): void {
    let targetRadius = 55;
    let targetPhi = Math.PI / 3;
    let targetTheta = Math.PI / 4;

    switch (preset) {
      case 'isometric':
        targetRadius = 60;
        targetPhi = Math.PI / 3.2;
        targetTheta = Math.PI / 4;
        break;
      case 'perspective':
        targetRadius = 45;
        targetPhi = Math.PI / 2.6;
        targetTheta = Math.PI / 3;
        break;
      case 'elevation_front':
        targetRadius = 50;
        targetPhi = Math.PI / 2.1;
        targetTheta = 0;
        break;
      case 'elevation_side':
        targetRadius = 50;
        targetPhi = Math.PI / 2.1;
        targetTheta = Math.PI / 2;
        break;
      case 'plan_top':
        targetRadius = 70;
        targetPhi = 0.05;
        targetTheta = 0;
        break;
    }

    gsap.to(this.spherical, {
      radius: targetRadius,
      phi: targetPhi,
      theta: targetTheta,
      duration: 1.2,
      ease: 'power3.inOut',
      onUpdate: () => this.updateCameraFromSpherical()
    });
  }

  public updateSolarLighting(solar: SolarState): void {
    this.sunLight.position.copy(solar.sunPositionVector);
    this.sunMesh.position.copy(solar.sunPositionVector);
    this.sunLight.color.copy(solar.sunColor);
    this.sunMesh.material = new THREE.MeshBasicMaterial({ color: solar.sunColor });
    this.sunLight.intensity = solar.sunIntensity;

    this.hemiLight.color.copy(solar.skyTopColor);
    this.hemiLight.groundColor.copy(solar.skyBottomColor);

    // Update scene fog and background slightly
    this.scene.background = solar.skyTopColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = solar.skyTopColor;
    }
  }

  public toggleAutoRotate(): boolean {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  public render(): void {
    if (this.isAutoRotating) {
      this.spherical.theta += this.autoRotateSpeed;
      this.updateCameraFromSpherical();
    }
    this.renderer.render(this.scene, this.camera);
  }
}
