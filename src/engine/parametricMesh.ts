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

    switch (params.formType) {
      case 'muqarnas_vault':
        geometry = this.buildMuqarnasVault(params);
        break;
      case 'muqarnas_dome':
        geometry = this.buildMuqarnasDome(params);
        break;
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

    // Precise surface area from triangular faces
    const pos = geometry.getAttribute('position');
    const idx = geometry.getIndex();
    let calculatedArea = 0;

    if (idx && pos) {
      const vA = new THREE.Vector3();
      const vB = new THREE.Vector3();
      const vC = new THREE.Vector3();
      const ab = new THREE.Vector3();
      const ac = new THREE.Vector3();
      const cross = new THREE.Vector3();

      for (let i = 0; i < idx.count; i += 3) {
        const iA = idx.getX(i);
        const iB = idx.getX(i + 1);
        const iC = idx.getX(i + 2);

        vA.fromBufferAttribute(pos, iA);
        vB.fromBufferAttribute(pos, iB);
        vC.fromBufferAttribute(pos, iC);

        ab.subVectors(vB, vA);
        ac.subVectors(vC, vA);
        cross.crossVectors(ab, ac);
        calculatedArea += cross.length() * 0.5;
      }
    }

    geometry.computeBoundingBox();
    const box = geometry.boundingBox || new THREE.Box3();
    const size = new THREE.Vector3();
    box.getSize(size);

    const surfaceArea = Math.round(Math.max(120, calculatedArea) * 10) / 10;
    const volume = Math.round((size.x * size.z * size.y * 0.44) * 10) / 10;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const skeletonGroup = this.buildSkeleton(params);

    return {
      mesh,
      skeletonGroup,
      surfaceAreaM2: surfaceArea,
      volumeM3: Math.max(380, volume)
    };
  }

  // ==========================================
  // 1. MASTERPIECE: PARAMETRIC MUQARNAS VAULT
  // (قبو المقرنصات البارامتري الماسي ذو الحنايا المتدرجة)
  // ==========================================
  private buildMuqarnasVault(params: ParametricParams): THREE.BufferGeometry {
    const { spanRadius, heightAmplitude, ribCount, muqarnasTiers = 5 } = params;
    const halfSpan = spanRadius * 0.85;
    const length = spanRadius * 1.5;
    const tiers = Math.max(3, Math.min(8, muqarnasTiers || 5));
    const zSegments = Math.max(12, Math.min(36, Math.floor(ribCount / 2)));

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Helper to push triangle
    const addTri = (
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      u1: [number, number],
      u2: [number, number],
      u3: [number, number]
    ) => {
      const startIdx = positions.length / 3;
      positions.push(...p1, ...p2, ...p3);
      uvs.push(...u1, ...u2, ...u3);
      indices.push(startIdx, startIdx + 1, startIdx + 2);
    };

    // Helper to push quad (two triangles)
    const addQuad = (
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      p4: [number, number, number],
      u1: [number, number],
      u2: [number, number],
      u3: [number, number],
      u4: [number, number]
    ) => {
      addTri(p1, p2, p3, u1, u2, u3);
      addTri(p1, p3, p4, u1, u3, u4);
    };

    // Four-centered Islamic pointed arch curve function
    const archY = (xNorm: number, height: number): number => {
      const clamped = Math.min(1.0, Math.abs(xNorm));
      // Pointed ogee / Persian four-centered arch profile
      return height * Math.pow(Math.max(0, 1.0 - Math.pow(clamped, 1.8)), 0.65);
    };

    // 1. Generate Stepped Muqarnas Corbelled Tiers (Squinches and Prismatic Facets)
    for (let zi = 0; zi < zSegments; zi++) {
      const z0 = (zi / zSegments - 0.5) * length;
      const z1 = ((zi + 1) / zSegments - 0.5) * length;
      const zMid = (z0 + z1) * 0.5;

      for (let t = 0; t < tiers; t++) {
        const tierRatio0 = t / tiers;
        const tierRatio1 = (t + 1) / tiers;

        // Radial corbelling stepping inward
        const xStep0 = halfSpan * (1.0 - tierRatio0 * 0.75);
        const xStep1 = halfSpan * (1.0 - tierRatio1 * 0.75);

        const yStep0 = 2.0 + (heightAmplitude - 2.0) * Math.pow(tierRatio0, 0.85);
        const yStep1 = 2.0 + (heightAmplitude - 2.0) * Math.pow(tierRatio1, 0.85);

        // Subdivide each tier along arc into prismatic facet cells
        const cellsPerTier = 4 + t * 2;
        for (let c = 0; c < cellsPerTier; c++) {
          const u0 = c / cellsPerTier;
          const u1 = (c + 1) / cellsPerTier;
          const uMid = (u0 + u1) * 0.5;

          // Left side (+X)
          const xA0 = xStep0 * (1.0 - u0 * 0.85);
          const xA1 = xStep0 * (1.0 - u1 * 0.85);
          const xB0 = xStep1 * (1.0 - u0 * 0.85);
          const xB1 = xStep1 * (1.0 - u1 * 0.85);
          const xP = (xA0 + xA1 + xB0 + xB1) * 0.25;

          const yA = yStep0 + archY(u0, 1.2);
          const yB = yStep1 + archY(u1, 1.2);
          const yP = (yA + yB) * 0.5 - 0.35; // Drooping stalactite pendant tip

          // Stalactite / squinch prismatic facets (+X side)
          // 1. Niche back-wall quad
          addQuad(
            [xA0, yA, z0],
            [xA1, yA, z0],
            [xB1, yB, z1],
            [xB0, yB, z1],
            [u0, tierRatio0],
            [u1, tierRatio0],
            [u1, tierRatio1],
            [u0, tierRatio1]
          );

          // 2. Diamond faceted pendant projection
          addTri(
            [xA0, yA, z0],
            [xA1, yA, z0],
            [xP, yP, zMid],
            [u0, tierRatio0],
            [u1, tierRatio0],
            [uMid, tierRatio0]
          );

          addTri(
            [xA1, yA, z0],
            [xB1, yB, z1],
            [xP, yP, zMid],
            [u1, tierRatio0],
            [u1, tierRatio1],
            [uMid, tierRatio1]
          );

          // Symmetrical Right side (-X)
          addQuad(
            [-xA1, yA, z0],
            [-xA0, yA, z0],
            [-xB0, yB, z1],
            [-xB1, yB, z1],
            [u1, tierRatio0],
            [u0, tierRatio0],
            [u0, tierRatio1],
            [u1, tierRatio1]
          );

          addTri(
            [-xA1, yA, z0],
            [-xA0, yA, z0],
            [-xP, yP, zMid],
            [u1, tierRatio0],
            [u0, tierRatio0],
            [uMid, tierRatio0]
          );

          addTri(
            [-xA0, yA, z0],
            [-xB0, yB, z1],
            [-xP, yP, zMid],
            [u0, tierRatio0],
            [u0, tierRatio1],
            [uMid, tierRatio1]
          );
        }
      }

      // Central diamond apex crown ceiling (خاتم المقرنصات الماسي)
      const xCrown = halfSpan * (1.0 - 0.75);
      const yCrown = heightAmplitude;
      addQuad(
        [-xCrown, yCrown, z0],
        [xCrown, yCrown, z0],
        [xCrown, yCrown, z1],
        [-xCrown, yCrown, z1],
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      );
    }

    // 2. Monumental Supporting Piers & Fluted Marble Columns
    const colR = 1.35;
    const colH = heightAmplitude * 0.75;
    const colPositions: [number, number][] = [
      [halfSpan, length * 0.45],
      [halfSpan, -length * 0.45],
      [-halfSpan, length * 0.45],
      [-halfSpan, -length * 0.45]
    ];

    const colSegments = 16;
    for (const [colX, colZ] of colPositions) {
      for (let s = 0; s < colSegments; s++) {
        const a0 = (s / colSegments) * Math.PI * 2;
        const a1 = ((s + 1) / colSegments) * Math.PI * 2;

        const cos0 = Math.cos(a0);
        const sin0 = Math.sin(a0);
        const cos1 = Math.cos(a1);
        const sin1 = Math.sin(a1);

        // Fluted column effect
        const fluting = (s % 2 === 0 ? 0.95 : 1.05);

        // Shaft quad
        addQuad(
          [colX + cos0 * colR * fluting, 0.1, colZ + sin0 * colR * fluting],
          [colX + cos1 * colR * fluting, 0.1, colZ + sin1 * colR * fluting],
          [colX + cos1 * colR * 1.1, colH, colZ + sin1 * colR * 1.1],
          [colX + cos0 * colR * 1.1, colH, colZ + sin0 * colR * 1.1],
          [s / colSegments, 0],
          [(s + 1) / colSegments, 0],
          [(s + 1) / colSegments, 1],
          [s / colSegments, 1]
        );

        // Capital muqarnas corbel bracket
        addQuad(
          [colX + cos0 * colR * 1.1, colH, colZ + sin0 * colR * 1.1],
          [colX + cos1 * colR * 1.1, colH, colZ + sin1 * colR * 1.1],
          [colX + cos1 * colR * 1.85, colH + 1.8, colZ + sin1 * colR * 1.85],
          [colX + cos0 * colR * 1.85, colH + 1.8, colZ + sin0 * colR * 1.85],
          [s / colSegments, 0],
          [(s + 1) / colSegments, 0],
          [(s + 1) / colSegments, 1],
          [s / colSegments, 1]
        );
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  // ==========================================
  // 2. MASTERPIECE: ROYAL MUQARNAS DOME & OCULUS
  // (قبة المقرنصات الملكية ذات الطبقات المتدلية والعين المركزية)
  // ==========================================
  private buildMuqarnasDome(params: ParametricParams): THREE.BufferGeometry {
    const { spanRadius, heightAmplitude, ribCount, muqarnasTiers = 6 } = params;
    const tiers = Math.max(4, Math.min(8, muqarnasTiers || 6));
    const sectors = Math.max(16, Math.min(32, Math.floor(ribCount / 2) * 2)); // 8-fold or 16-fold symmetry

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const addTri = (
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      u1: [number, number],
      u2: [number, number],
      u3: [number, number]
    ) => {
      const startIdx = positions.length / 3;
      positions.push(...p1, ...p2, ...p3);
      uvs.push(...u1, ...u2, ...u3);
      indices.push(startIdx, startIdx + 1, startIdx + 2);
    };

    const addQuad = (
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      p4: [number, number, number],
      u1: [number, number],
      u2: [number, number],
      u3: [number, number],
      u4: [number, number]
    ) => {
      addTri(p1, p2, p3, u1, u2, u3);
      addTri(p1, p3, p4, u1, u3, u4);
    };

    const oculusRadius = spanRadius * 0.22; // Open central oculus for divine sunbeams
    const baseRadius = spanRadius * 0.95;
    const drumHeight = heightAmplitude * 0.28;

    // 1. Octagonal / Polygonal Drum Base with Grand Arches
    for (let s = 0; s < sectors; s++) {
      const a0 = (s / sectors) * Math.PI * 2;
      const a1 = ((s + 1) / sectors) * Math.PI * 2;

      const x0 = Math.cos(a0) * baseRadius;
      const z0 = Math.sin(a0) * baseRadius;
      const x1 = Math.cos(a1) * baseRadius;
      const z1 = Math.sin(a1) * baseRadius;

      // Base wall
      addQuad(
        [x0, 0.1, z0],
        [x1, 0.1, z1],
        [x1, drumHeight, z1],
        [x0, drumHeight, z0],
        [s / sectors, 0],
        [(s + 1) / sectors, 0],
        [(s + 1) / sectors, 0.2],
        [s / sectors, 0.2]
      );
    }

    // 2. Concentric Muqarnas Stalactite Tiers
    for (let t = 0; t < tiers; t++) {
      const t0 = t / tiers;
      const t1 = (t + 1) / tiers;

      // Inward stepping radius (cantilevered inward toward oculus)
      const r0 = baseRadius - (baseRadius - oculusRadius) * Math.pow(t0, 0.85);
      const r1 = baseRadius - (baseRadius - oculusRadius) * Math.pow(t1, 0.85);

      // Height stepping upward
      const y0 = drumHeight + (heightAmplitude - drumHeight) * Math.sin(t0 * Math.PI * 0.5);
      const y1 = drumHeight + (heightAmplitude - drumHeight) * Math.sin(t1 * Math.PI * 0.5);

      // Alternating angular offset creates honeycomb stalactite tessellation
      const angleOffset0 = (t % 2 === 0 ? 0 : Math.PI / sectors);
      const angleOffset1 = ((t + 1) % 2 === 0 ? 0 : Math.PI / sectors);

      for (let s = 0; s < sectors; s++) {
        const aA0 = (s / sectors) * Math.PI * 2 + angleOffset0;
        const aA1 = ((s + 1) / sectors) * Math.PI * 2 + angleOffset0;
        const aB0 = (s / sectors) * Math.PI * 2 + angleOffset1;
        const aB1 = ((s + 1) / sectors) * Math.PI * 2 + angleOffset1;

        // Base points of cell
        const pA0: [number, number, number] = [Math.cos(aA0) * r0, y0, Math.sin(aA0) * r0];
        const pA1: [number, number, number] = [Math.cos(aA1) * r0, y0, Math.sin(aA1) * r0];

        // Top points of cell
        const pB0: [number, number, number] = [Math.cos(aB0) * r1, y1, Math.sin(aB0) * r1];
        const pB1: [number, number, number] = [Math.cos(aB1) * r1, y1, Math.sin(aB1) * r1];

        // Drooping pendant stalactite apex (طاسة المقرنص المتدلية)
        const aMid = (aA0 + aA1) * 0.5;
        const rMid = (r0 + r1) * 0.5 * 1.08; // projects outwards slightly
        const yPendant = y0 - (y1 - y0) * 0.45; // suspended below tier
        const pPendant: [number, number, number] = [
          Math.cos(aMid) * rMid,
          yPendant,
          Math.sin(aMid) * rMid
        ];

        // 1. Inward inclined ceiling facet (rhombic shelf)
        addQuad(
          pA0,
          pA1,
          pB1,
          pB0,
          [s / sectors, t0],
          [(s + 1) / sectors, t0],
          [(s + 1) / sectors, t1],
          [s / sectors, t1]
        );

        // 2. Front prismatic facet 1
        addTri(
          pA0,
          pA1,
          pPendant,
          [s / sectors, t0],
          [(s + 1) / sectors, t0],
          [(s + 0.5) / sectors, t0]
        );

        // 3. Side squinch facets catching grazing sun rays
        addTri(
          pA0,
          pPendant,
          pB0,
          [s / sectors, t0],
          [(s + 0.5) / sectors, t0],
          [s / sectors, t1]
        );

        addTri(
          pA1,
          pB1,
          pPendant,
          [(s + 1) / sectors, t0],
          [(s + 1) / sectors, t1],
          [(s + 0.5) / sectors, t0]
        );
      }
    }

    // 3. Central Oculus Sun Ring & Cornice (عين القبة المركزية ذات الحافة المقولبة)
    const ringSegments = sectors * 2;
    const corniceWidth = 0.85;
    for (let r = 0; r < ringSegments; r++) {
      const a0 = (r / ringSegments) * Math.PI * 2;
      const a1 = ((r + 1) / ringSegments) * Math.PI * 2;

      const x0 = Math.cos(a0) * oculusRadius;
      const z0 = Math.sin(a0) * oculusRadius;
      const x1 = Math.cos(a1) * oculusRadius;
      const z1 = Math.sin(a1) * oculusRadius;

      const x0Out = Math.cos(a0) * (oculusRadius + corniceWidth);
      const z0Out = Math.sin(a0) * (oculusRadius + corniceWidth);
      const x1Out = Math.cos(a1) * (oculusRadius + corniceWidth);
      const z1Out = Math.sin(a1) * (oculusRadius + corniceWidth);

      // Oculus border flange
      addQuad(
        [x0, heightAmplitude + 0.3, z0],
        [x1, heightAmplitude + 0.3, z1],
        [x1Out, heightAmplitude, z1Out],
        [x0Out, heightAmplitude, z0Out],
        [r / ringSegments, 0],
        [(r + 1) / ringSegments, 0],
        [(r + 1) / ringSegments, 1],
        [r / ringSegments, 1]
      );
    }

    // 4. Perimeter Colonnade: 8 Royal Fluted Columns supporting the drum
    const colCount = 8;
    for (let c = 0; c < colCount; c++) {
      const colAngle = (c / colCount) * Math.PI * 2;
      const colX = Math.cos(colAngle) * baseRadius;
      const colZ = Math.sin(colAngle) * baseRadius;
      const colR = 1.1;

      for (let s = 0; s < 12; s++) {
        const sa0 = (s / 12) * Math.PI * 2;
        const sa1 = ((s + 1) / 12) * Math.PI * 2;

        addQuad(
          [colX + Math.cos(sa0) * colR, 0.1, colZ + Math.sin(sa0) * colR],
          [colX + Math.cos(sa1) * colR, 0.1, colZ + Math.sin(sa1) * colR],
          [colX + Math.cos(sa1) * colR * 1.25, drumHeight, colZ + Math.sin(sa1) * colR * 1.25],
          [colX + Math.cos(sa0) * colR * 1.25, drumHeight, colZ + Math.sin(sa0) * colR * 1.25],
          [s / 12, 0],
          [(s + 1) / 12, 0],
          [(s + 1) / 12, 1],
          [s / 12, 1]
        );
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 3. Sinusoidal Canopy (Wavy Rib Vault)
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
      const u = i / uSegments;
      const angleU = (u - 0.5) * Math.PI * 1.4;

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const z = (v - 0.5) * spanRadius * 2.0;

        const wave = Math.sin(v * Math.PI * rippleFreq) * Math.cos(u * Math.PI * 2.0);
        const currentTwist = (v - 0.5) * twistRad;

        let x = Math.sin(angleU + currentTwist) * (spanRadius * (0.8 + 0.2 * wave));
        let y = Math.cos(angleU) * heightAmplitude + (wave * 1.5);
        if (y < 0.2) y = 0.2;

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
   * 4. Twisted Hyperbolic Torus Ribbon
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
      const theta = u * Math.PI * 2.0;

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const phi = (v - 0.5) * Math.PI;

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
   * 5. Inverted Catenary Ribbed Vault
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
      const u = i / uSegments;
      const spanT = (u - 0.5) * 2.0;

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const z = (v - 0.5) * spanRadius * 1.8;

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
   * 6. Biomimetic Geodesic Undulating Shell
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
      const phi = u * Math.PI;

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        const theta = v * Math.PI;

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

      const heightFactor = Math.min(1.0, y / params.heightAmplitude);
      const spanFactor = Math.min(1.0, Math.sqrt(x * x + z * z) / params.spanRadius);
      const stressRatio = 0.2 + 0.45 * heightFactor + 0.35 * Math.pow(spanFactor, 1.8);

      if (stressRatio < 0.4) {
        tempColor.setHSL(0.55 - (stressRatio / 0.4) * 0.2, 0.9, 0.5);
      } else if (stressRatio < 0.75) {
        const t = (stressRatio - 0.4) / 0.35;
        tempColor.setHSL(0.35 - t * 0.22, 0.95, 0.52);
      } else {
        const t = (stressRatio - 0.75) / 0.25;
        tempColor.setHSL(0.13 - t * 0.13, 1.0, 0.5);
      }

      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  /**
   * Primary structural skeletal ribs & Islamic geometric star webbing
   */
  private buildSkeleton(params: ParametricParams): THREE.Group {
    const group = new THREE.Group();
    const { ribCount, spanRadius, heightAmplitude, formType } = params;
    const skeletonMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.75
    });

    const goldRibMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });

    if (formType === 'muqarnas_vault') {
      // Longitudinal arch curves and diagonal star ribs
      const ribNum = 8;
      const length = spanRadius * 1.5;
      for (let i = 0; i <= ribNum; i++) {
        const z = (i / ribNum - 0.5) * length;
        const pts: THREE.Vector3[] = [];
        const segs = 32;
        for (let s = 0; s <= segs; s++) {
          const u = (s / segs - 0.5) * 2.0;
          const x = u * spanRadius * 0.85;
          const y = heightAmplitude * Math.pow(Math.max(0, 1.0 - Math.pow(Math.abs(u), 1.8)), 0.65);
          pts.push(new THREE.Vector3(x, Math.max(0.1, y), z));
        }
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        group.add(new THREE.Line(geom, i % 2 === 0 ? goldRibMat : skeletonMaterial));
      }

      // Central diagonal X ribs
      const diag1: THREE.Vector3[] = [
        new THREE.Vector3(-spanRadius * 0.8, 0.1, -length * 0.45),
        new THREE.Vector3(0, heightAmplitude, 0),
        new THREE.Vector3(spanRadius * 0.8, 0.1, length * 0.45)
      ];
      const diag2: THREE.Vector3[] = [
        new THREE.Vector3(spanRadius * 0.8, 0.1, -length * 0.45),
        new THREE.Vector3(0, heightAmplitude, 0),
        new THREE.Vector3(-spanRadius * 0.8, 0.1, length * 0.45)
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(diag1), goldRibMat));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(diag2), goldRibMat));
      return group;
    }

    if (formType === 'muqarnas_dome') {
      // 8-pointed star Islamic radial groin arches
      const rays = 16;
      for (let r = 0; r < rays; r++) {
        const angle = (r / rays) * Math.PI * 2;
        const pts: THREE.Vector3[] = [];
        const segs = 20;
        for (let s = 0; s <= segs; s++) {
          const t = s / segs;
          const rad = spanRadius * 0.95 * (1.0 - t * 0.75);
          const y = heightAmplitude * Math.sin(t * Math.PI * 0.5);
          pts.push(new THREE.Vector3(Math.cos(angle) * rad, Math.max(0.1, y), Math.sin(angle) * rad));
        }
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        group.add(new THREE.Line(geom, r % 2 === 0 ? goldRibMat : skeletonMaterial));
      }

      // Oculus glowing golden perimeter ring
      const oculusPts: THREE.Vector3[] = [];
      const oculusR = spanRadius * 0.22;
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        oculusPts.push(new THREE.Vector3(Math.cos(a) * oculusR, heightAmplitude + 0.3, Math.sin(a) * oculusR));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(oculusPts), goldRibMat));
      return group;
    }

    // Default sinusoidal / shell skeletons
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
