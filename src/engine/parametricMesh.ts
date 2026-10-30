import * as THREE from 'three';
import { GeometryType, ParametricParams } from '../types';

export interface ParametricMeshOutput {
  mesh: THREE.Mesh;
  skeletonGroup: THREE.Group;
  surfaceAreaM2: number;
  volumeM3: number;
}

export class ParametricMeshGenerator {
  public generate(params: ParametricParams, material: THREE.Material): ParametricMeshOutput {
    let geometry: THREE.BufferGeometry;
    let surfaceArea = 0;
    let volume = 0;

    switch (params.formType) {
      case 'sinusoidal_canopy':
        geometry = this.buildSinusoidalCanopy(params);
        break;
      case 'twisted_torus':
        geometry = this.buildTwistedTorus(params);
        break;
      case 'catenary_vault':
        geometry = this.buildCatenaryVault(params);
        break;
      case 'geodesic_shell':
      default:
        geometry = this.buildGeodesicShell(params);
        break;
    }

    geometry.computeVertexNormals();
    this.applyFEAColors(geometry, params);

    // Approximate surface area and volume from bounding box & shape factors
    geometry.computeBoundingBox();
    const box = geometry.boundingBox || new THREE.Box3();
    const size = new THREE.Vector3();
    box.getSize(size);

    surfaceArea = Math.round((size.x * size.z * 1.35 + size.y * (size.x + size.z) * 0.8) * 10) / 10;
    volume = Math.round((size.x * size.z * size.y * 0.42) * 10) / 10;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const skeletonGroup = this.buildSkeleton(params);

    return {
      mesh,
      skeletonGroup,
      surfaceAreaM2: Math.max(120, surfaceArea),
      volumeM3: Math.max(350, volume)
    };
  }

  /**
   * 1. Sinusoidal Canopy (Wavy Rib Vault)
   */
  private buildSinusoidalCanopy(params: ParametricParams): THREE.BufferGeometry {
    const { ribCount, twistAngle, spanRadius, heightAmplitude, rippleFreq } = params;
    const uSegments = ribCount;
    const vSegments = 48;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const twistRad = THREE.MathUtils.degToRad(twistAngle);

    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments; // 0 to 1
      const angleU = (u - 0.5) * Math.PI * 1.4; // arch angle span

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments; // 0 to 1 along length
        const z = (v - 0.5) * spanRadius * 2.0;

        // Wave modulation
        const wave = Math.sin(v * Math.PI * rippleFreq) * Math.cos(u * Math.PI * 2.0);
        const currentTwist = (v - 0.5) * twistRad;

        // Parametric arch coordinates
        let x = Math.sin(angleU + currentTwist) * (spanRadius * (0.8 + 0.2 * wave));
        let y = Math.cos(angleU) * heightAmplitude + (wave * 1.5);
        if (y < 0.2) y = 0.2; // ground contact

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    // Grid indices
    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * (vSegments + 1) + j;
        const b = (i + 1) * (vSegments + 1) + j;
        const c = (i + 1) * (vSegments + 1) + (j + 1);
        const d = i * (vSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 2. Twisted Hyperbolic Torus Ribbon
   */
  private buildTwistedTorus(params: ParametricParams): THREE.BufferGeometry {
    const { ribCount, twistAngle, spanRadius, heightAmplitude, rippleFreq } = params;
    const uSegments = ribCount * 2;
    const vSegments = 32;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const twistRad = THREE.MathUtils.degToRad(twistAngle);

    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments;
      const theta = u * Math.PI * 2.0; // full ring

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const phi = (v - 0.5) * Math.PI; // ribbon cross section

        // Möbius twist
        const twist = u * twistRad + Math.sin(theta * rippleFreq) * 0.3;
        const ribbonWidth = spanRadius * 0.35;

        const r = spanRadius * 0.85 + Math.cos(twist) * Math.sin(phi) * ribbonWidth;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        const y = heightAmplitude * (0.6 + 0.4 * Math.sin(theta * 2.0)) + Math.sin(twist) * Math.sin(phi) * (heightAmplitude * 0.5);

        positions.push(x, Math.max(0.1, y), z);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * (vSegments + 1) + j;
        const b = (i + 1) * (vSegments + 1) + j;
        const c = (i + 1) * (vSegments + 1) + (j + 1);
        const d = i * (vSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 3. Inverted Catenary Ribbed Vault
   */
  private buildCatenaryVault(params: ParametricParams): THREE.BufferGeometry {
    const { ribCount, twistAngle, spanRadius, heightAmplitude, rippleFreq } = params;
    const uSegments = ribCount;
    const vSegments = 40;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const twistRad = THREE.MathUtils.degToRad(twistAngle);

    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments; // -1 to 1 across arch
      const spanT = (u - 0.5) * 2.0;

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const z = (v - 0.5) * spanRadius * 1.8;

        // Catenary curve: y = a * (cosh(x/a) - 1) inverted
        const a = 1.2;
        const catenaryY = heightAmplitude * (1.0 - Math.cosh(spanT * a) / Math.cosh(a));
        const wave = Math.sin(v * Math.PI * rippleFreq) * 1.2;
        const twistOffset = (v - 0.5) * twistRad * spanT * 4.0;

        const x = spanT * (spanRadius * 0.9) + twistOffset;
        const y = Math.max(0.1, catenaryY + wave * (1.0 - Math.abs(spanT)));

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * (vSegments + 1) + j;
        const b = (i + 1) * (vSegments + 1) + j;
        const c = (i + 1) * (vSegments + 1) + (j + 1);
        const d = i * (vSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 4. Biomimetic Geodesic Undulating Shell
   */
  private buildGeodesicShell(params: ParametricParams): THREE.BufferGeometry {
    const { ribCount, twistAngle, spanRadius, heightAmplitude, rippleFreq } = params;
    const uSegments = ribCount;
    const vSegments = 40;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const twistRad = THREE.MathUtils.degToRad(twistAngle);

    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments;
      const phi = u * Math.PI; // 0 to 180 deg

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const theta = v * Math.PI; // 0 to 180 deg

        const wave = Math.sin(phi * rippleFreq * 2) * Math.cos(theta * 3) * 1.5;
        const currentTwist = (u - 0.5) * twistRad;

        const r = (spanRadius + wave) * Math.sin(theta * 0.85);
        const x = r * Math.cos(phi + currentTwist);
        const z = r * Math.sin(phi + currentTwist);
        const y = Math.max(0.1, Math.cos(theta * 0.85) * heightAmplitude + wave);

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * (vSegments + 1) + j;
        const b = (i + 1) * (vSegments + 1) + j;
        const c = (i + 1) * (vSegments + 1) + (j + 1);
        const d = i * (vSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * Apply Finite Element Analysis (FEA) Stress Vertex Colors
   */
  private applyFEAColors(geometry: THREE.BufferGeometry, params: ParametricParams): void {
    const posAttr = geometry.getAttribute('position');
    const colors: number[] = [];
    const tempColor = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      // Height and cantilever distance stress proxy
      const heightFactor = Math.min(1.0, y / params.heightAmplitude);
      const spanFactor = Math.min(1.0, Math.sqrt(x * x + z * z) / params.spanRadius);
      const stressRatio = 0.2 + 0.45 * heightFactor + 0.35 * Math.pow(spanFactor, 1.8);

      // Color map: 0.0 Blue (safe) -> 0.4 Green -> 0.7 Yellow (medium) -> 1.0 Crimson Red (high)
      if (stressRatio < 0.4) {
        tempColor.setHSL(0.55 - (stressRatio / 0.4) * 0.2, 0.9, 0.5); // Blue to Green
      } else if (stressRatio < 0.75) {
        const t = (stressRatio - 0.4) / 0.35;
        tempColor.setHSL(0.35 - t * 0.22, 0.95, 0.52); // Green to Yellow
      } else {
        const t = (stressRatio - 0.75) / 0.25;
        tempColor.setHSL(0.13 - t * 0.13, 1.0, 0.5); // Yellow to Red
      }

      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  /**
   * Primary structural skeletal ribs
   */
  private buildSkeleton(params: ParametricParams): THREE.Group {
    const group = new THREE.Group();
    const { ribCount, spanRadius, heightAmplitude, formType } = params;
    const skeletonMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.65
    });

    const step = Math.max(1, Math.floor(ribCount / 8));
    for (let i = 0; i <= ribCount; i += step) {
      const points: THREE.Vector3[] = [];
      const u = i / ribCount;

      for (let j = 0; j <= 24; j++) {
        const v = j / 24;
        const z = (v - 0.5) * spanRadius * 1.8;
        const angle = (u - 0.5) * Math.PI * 1.3;
        const x = Math.sin(angle) * spanRadius * 0.85;
        const y = Math.max(0.1, Math.cos(angle) * heightAmplitude * (1.0 - Math.abs(v - 0.5) * 0.3));
        points.push(new THREE.Vector3(x, y, z));
      }

      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeom, skeletonMaterial);
      group.add(line);
    }

    return group;
  }
}
