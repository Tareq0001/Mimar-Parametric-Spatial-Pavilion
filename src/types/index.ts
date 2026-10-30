export type CityKey = 'riyadh' | 'jeddah' | 'alula' | 'abha';

export interface CityInfo {
  key: CityKey;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
  altitudeM: number;
  avgTempC: number;
  climateAr: string;
  climateEn: string;
}

export type GeometryType = 'sinusoidal_canopy' | 'twisted_torus' | 'catenary_vault' | 'geodesic_shell';

export interface ParametricParams {
  formType: GeometryType;
  ribCount: number;        // 12 to 64
  twistAngle: number;      // -180 to 180 degrees
  spanRadius: number;      // 10 to 45 meters
  heightAmplitude: number; // 4 to 22 meters
  rippleFreq: number;      // 1 to 8 waves
  ribThickness: number;    // 0.2 to 2.0 meters
  wireframe: boolean;
  showSkeleton: boolean;
  feaStressMode: boolean;
}

export type KineticMode = 'solar_tracking' | 'harmonic_wave' | 'cursor_interactive' | 'storm_seal' | 'max_aperture';

export interface KineticParams {
  mode: KineticMode;
  manualAperture: number;  // 0 to 90 degrees
  waveSpeed: number;       // 0.5 to 3.0
  activePanelsCount: number;
  louverTiltAngle: number;
  shadingEfficiency: number; // 0 to 100%
  directRadiationW: number;  // W/m2
  daylightLux: number;
}

export type MaterialKey = 
  | 'concrete_brutalist' 
  | 'desert_sandstone' 
  | 'brushed_bronze' 
  | 'cyber_titanium' 
  | 'low_iron_glass' 
  | 'biopolymer_membrane';

export interface MaterialProperties {
  key: MaterialKey;
  nameAr: string;
  nameEn: string;
  densityKgM3: number;
  embodiedCarbonKgCO2: number;
  roughness: number;
  metalness: number;
  transmission: number;
  ior: number;
  alpha125: number;
  alpha250: number;
  alpha500: number;
  alpha1000: number;
  alpha2000: number;
  alpha4000: number;
  avgAlpha: number;
  thermalCondW_mK: number;
  colorHex: number;
}

export interface AcousticResult {
  volumeM3: number;
  surfaceAreaM2: number;
  totalSabins: number;
  rt60Seconds: number;
  qualityBadgeAr: string;
  qualityBadgeEn: string;
  octaveRT60: {
    hz125: number;
    hz250: number;
    hz500: number;
    hz1000: number;
    hz2000: number;
    hz4000: number;
  };
}

export interface StructuralFEAResult {
  windSpeedKmh: number;
  windPressureN_m2: number;
  maxStressMPa: number;
  maxDeflectionMm: number;
  safetyFactor: number;
  statusAr: string;
  statusEn: string;
}

export type CameraPreset = 'perspective' | 'isometric' | 'elevation_front' | 'elevation_side' | 'plan_top';

export interface PresetModel {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  city: CityKey;
  geometry: ParametricParams;
  material: MaterialKey;
  kineticMode: KineticMode;
  timeOfDay: number;
}
