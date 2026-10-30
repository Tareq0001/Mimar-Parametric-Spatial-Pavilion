import * as THREE from 'three';
import { KineticMode, KineticParams } from '../types';

interface KineticPanel {
  frame: THREE.Mesh;
  blade: THREE.Mesh;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  normal: THREE.Vector3;
  currentTilt: number; // in radians
  targetTilt: number;
}

export class KineticFacadeSystem {
  public group: THREE.Group;
  private panels: KineticPanel[] = [];
  private panelCount: number = 0;
  private frameMaterial: THREE.MeshStandardMaterial;
  private bladeMaterial: THREE.MeshStandardMaterial;
  private cursorCoords: THREE.Vector2 = new THREE.Vector2(0, 0);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'KineticFacade';

    // Premium architectural bronze / titanium facade frames
    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.35
    });

    // Kinetic gold/brass reflective blades
    this.bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.22,
      side: THREE.DoubleSide
    });

    this.initFacadeLattice();
  }

  /**
   * Generates a curved hyperbolic facade matrix of 216 kinetic modules
   */
  private initFacadeLattice(): void {
    // 12 columns x 18 rows = 216 kinetic louvers
    const cols = 12;
    const rows = 18;
    this.panelCount = cols * rows;

    const frameGeom = new THREE.BoxGeometry(0.85, 0.55, 0.05);
    const bladeGeom = new THREE.BoxGeometry(0.80, 0.48, 0.02);

    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1) - 0.5) * 1.5; // arc angle around facade
      const radius = 22.0;
      const angle = u * Math.PI * 0.45 + Math.PI * 0.5;

      for (let r = 0; r < rows; r++) {
        const v = r / (rows - 1); // 0 to 1 along height
        const height = 1.0 + v * 12.0;

        // Position on a curved facade wall flanking the pavilion
        const x = Math.cos(angle) * (radius + Math.sin(v * Math.PI) * 2.5);
        const z = Math.sin(angle) * (radius + Math.sin(v * Math.PI) * 2.5);
        const y = height;

        const panelGroup = new THREE.Group();
        panelGroup.position.set(x, y, z);

        // Orient panel outward from center
        panelGroup.lookAt(x * 2.0, y, z * 2.0);

        const frame = new THREE.Mesh(frameGeom, this.frameMaterial);
        frame.castShadow = true;
        panelGroup.add(frame);

        const blade = new THREE.Mesh(bladeGeom, this.bladeMaterial);
        blade.castShadow = true;
        blade.receiveShadow = true;
        panelGroup.add(blade);

        this.group.add(panelGroup);

        const normal = new THREE.Vector3(x, 0, z).normalize();

        this.panels.push({
          frame,
          blade,
          basePosition: new THREE.Vector3(x, y, z),
          baseRotation: panelGroup.rotation.clone(),
          normal,
          currentTilt: 0,
          targetTilt: 0
        });
      }
    }
  }

  public updateCursor(normX: number, normY: number): void {
    this.cursorCoords.set(normX, normY);
  }

  public update(
    timeSec: number,
    kineticParams: KineticParams,
    sunDirection: THREE.Vector3
  ): void {
    const { mode, manualAperture, waveSpeed } = kineticParams;

    for (let i = 0; i < this.panels.length; i++) {
      const p = this.panels[i];
      let desiredAngle = 0; // 0 is closed (parallel to frame), PI/2 is full open

      switch (mode) {
        case 'solar_tracking': {
          // Dot product between sun direction and louver outward normal
          const dot = Math.max(-1, Math.min(1, p.normal.dot(sunDirection)));
          // When sun hits normal directly (dot ~ 1), close to provide maximum shading
          // When sun is glancing or behind, open up for daylight
          desiredAngle = (1.0 - Math.max(0, dot)) * (Math.PI * 0.48);
          break;
        }

        case 'harmonic_wave': {
          const spatialIndex = (p.basePosition.x * 0.3) + (p.basePosition.y * 0.4);
          const wave = Math.sin(timeSec * waveSpeed * 2.5 + spatialIndex);
          desiredAngle = ((wave + 1.0) / 2.0) * (Math.PI * 0.45);
          break;
        }

        case 'cursor_interactive': {
          // Screen projection proximity effect
          const distToCursor = Math.hypot(
            (p.basePosition.x / 25.0) - this.cursorCoords.x,
            (p.basePosition.y / 15.0) - (this.cursorCoords.y * -1)
          );
          const prox = Math.max(0, 1.0 - Math.min(1.0, distToCursor * 1.5));
          desiredAngle = prox * (Math.PI * 0.5);
          break;
        }

        case 'storm_seal': {
          // Closed tight
          desiredAngle = 0.02; // slight seal overlap
          break;
        }

        case 'max_aperture': {
          // Fully perpendicular
          desiredAngle = Math.PI * 0.48;
          break;
        }

        default: {
          desiredAngle = THREE.MathUtils.degToRad(manualAperture);
          break;
        }
      }

      p.targetTilt = desiredAngle;

      // Smooth mechanical damper interpolation
      p.currentTilt += (p.targetTilt - p.currentTilt) * 0.08;
      p.blade.rotation.x = p.currentTilt;
    }
  }

  public getPanelCount(): number {
    return this.panelCount;
  }

  public setMaterialBlade(mat: THREE.Material): void {
    for (const p of this.panels) {
      p.blade.material = mat;
    }
  }
}
