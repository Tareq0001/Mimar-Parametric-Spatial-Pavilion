import * as THREE from 'three';
import { MaterialKey, MaterialProperties } from '../types';

export const MATERIAL_SPECS: Record<MaterialKey, MaterialProperties> = {
  concrete_brutalist: {
    key: 'concrete_brutalist',
    nameAr: 'خرسانة بروتاليزم معمارية',
    nameEn: 'Architectural Brutalist Concrete',
    densityKgM3: 2400,
    embodiedCarbonKgCO2: 380,
    roughness: 0.88,
    metalness: 0.05,
    transmission: 0.0,
    ior: 1.5,
    alpha125: 0.01,
    alpha250: 0.01,
    alpha500: 0.02,
    alpha1000: 0.02,
    alpha2000: 0.03,
    alpha4000: 0.03,
    avgAlpha: 0.02,
    thermalCondW_mK: 1.4,
    colorHex: 0x9ca3af
  },
  desert_sandstone: {
    key: 'desert_sandstone',
    nameAr: 'حجر رملي ترافيرتين صحراوي',
    nameEn: 'Desert Travertine Sandstone',
    densityKgM3: 2200,
    embodiedCarbonKgCO2: 180,
    roughness: 0.75,
    metalness: 0.08,
    transmission: 0.0,
    ior: 1.55,
    alpha125: 0.03,
    alpha250: 0.04,
    alpha500: 0.06,
    alpha1000: 0.07,
    alpha2000: 0.09,
    alpha4000: 0.10,
    avgAlpha: 0.065,
    thermalCondW_mK: 1.2,
    colorHex: 0xd4a373
  },
  brushed_bronze: {
    key: 'brushed_bronze',
    nameAr: 'برونز معماري مفرش ذهبي',
    nameEn: 'Brushed Architectural Bronze',
    densityKgM3: 8800,
    embodiedCarbonKgCO2: 450,
    roughness: 0.28,
    metalness: 0.88,
    transmission: 0.0,
    ior: 2.2,
    alpha125: 0.01,
    alpha250: 0.01,
    alpha500: 0.01,
    alpha1000: 0.02,
    alpha2000: 0.02,
    alpha4000: 0.02,
    avgAlpha: 0.015,
    thermalCondW_mK: 60.0,
    colorHex: 0xd97706
  },
  cyber_titanium: {
    key: 'cyber_titanium',
    nameAr: 'تيتانيوم مؤكسد سايبر أردوازي',
    nameEn: 'Anodized Cyber Titanium',
    densityKgM3: 4500,
    embodiedCarbonKgCO2: 650,
    roughness: 0.18,
    metalness: 0.94,
    transmission: 0.0,
    ior: 2.5,
    alpha125: 0.01,
    alpha250: 0.01,
    alpha500: 0.01,
    alpha1000: 0.01,
    alpha2000: 0.02,
    alpha4000: 0.02,
    avgAlpha: 0.013,
    thermalCondW_mK: 21.9,
    colorHex: 0x38bdf8
  },
  low_iron_glass: {
    key: 'low_iron_glass',
    nameAr: 'زجاج إنشائي نقي منخفض الحديد',
    nameEn: 'Ultra-Clear Low-Iron Glass',
    densityKgM3: 2500,
    embodiedCarbonKgCO2: 240,
    roughness: 0.04,
    metalness: 0.0,
    transmission: 0.92,
    ior: 1.52,
    alpha125: 0.18,
    alpha250: 0.06,
    alpha500: 0.04,
    alpha1000: 0.03,
    alpha2000: 0.02,
    alpha4000: 0.02,
    avgAlpha: 0.058,
    thermalCondW_mK: 1.0,
    colorHex: 0xe0f2fe
  },
  biopolymer_membrane: {
    key: 'biopolymer_membrane',
    nameAr: 'غشاء بوليمري نانوي متوهج',
    nameEn: 'Translucent Bio-Polymer Membrane',
    densityKgM3: 1100,
    embodiedCarbonKgCO2: 95,
    roughness: 0.42,
    metalness: 0.02,
    transmission: 0.65,
    ior: 1.45,
    alpha125: 0.12,
    alpha250: 0.22,
    alpha500: 0.35,
    alpha1000: 0.48,
    alpha2000: 0.55,
    alpha4000: 0.60,
    avgAlpha: 0.386,
    thermalCondW_mK: 0.15,
    colorHex: 0xf1f5f9
  }
};

export class MaterialManager {
  private cache: Map<MaterialKey, THREE.Material> = new Map();
  private stressMaterial: THREE.MeshStandardMaterial;

  constructor() {
    // Vertex colored material for FEA stress visualization
    this.stressMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
  }

  public getMaterial(key: MaterialKey, isFEA: boolean = false, wireframe: boolean = false): THREE.Material {
    if (isFEA) {
      this.stressMaterial.wireframe = wireframe;
      return this.stressMaterial;
    }

    const cachedKey = key;
    let mat = this.cache.get(cachedKey);
    if (!mat) {
      mat = this.createPBRMaterial(key);
      this.cache.set(cachedKey, mat);
    }

    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
      mat.wireframe = wireframe;
    }
    return mat;
  }

  private createPBRMaterial(key: MaterialKey): THREE.Material {
    const spec = MATERIAL_SPECS[key];

    if (key === 'low_iron_glass') {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(spec.colorHex),
        roughness: spec.roughness,
        metalness: spec.metalness,
        transmission: spec.transmission,
        ior: spec.ior,
        transparent: true,
        opacity: 0.85,
        reflectivity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide
      });
    }

    if (key === 'biopolymer_membrane') {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(spec.colorHex),
        roughness: spec.roughness,
        metalness: spec.metalness,
        transmission: spec.transmission,
        ior: spec.ior,
        transparent: true,
        opacity: 0.78,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.08,
        side: THREE.DoubleSide
      });
    }

    if (key === 'brushed_bronze' || key === 'cyber_titanium') {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.colorHex),
        roughness: spec.roughness,
        metalness: spec.metalness,
        side: THREE.DoubleSide
      });
    }

    // Concrete & Sandstone
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.colorHex),
      roughness: spec.roughness,
      metalness: spec.metalness,
      side: THREE.DoubleSide
    });
  }
}
