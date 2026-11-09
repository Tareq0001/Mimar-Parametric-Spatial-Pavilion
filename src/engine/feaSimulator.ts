import { MaterialProperties, ParametricParams, StructuralFEAResult } from '../types';

export class StructuralFEASimulator {
  public calculate(
    windSpeedKmh: number,
    params: ParametricParams,
    material: MaterialProperties
  ): StructuralFEAResult {
    // Air density at standard conditions (1.20 kg/m3)
    const rho = 1.20;
    const vMps = (windSpeedKmh * 1000) / 3600; // convert to m/s

    // Dynamic wind pressure: q = 0.5 * rho * v^2
    const windPressureN_m2 = Math.round(0.5 * rho * Math.pow(vMps, 2));

    // Shape factor based on form curvature & height
    let shapeFactor = 1.2;
    if (params.formType === 'catenary_vault') shapeFactor = 0.95;
    if (params.formType === 'geodesic_shell') shapeFactor = 0.85;
    if (params.formType === 'sinusoidal_canopy') shapeFactor = 1.35;
    if (params.formType === 'twisted_torus') shapeFactor = 1.45;

    // Cantilever and height moment multiplier
    const heightRatio = params.heightAmplitude / 10.0;
    const spanRatio = params.spanRadius / 25.0;

    // Peak von Mises stress in MPa (approximate structural engineering FEA proxy)
    const rawStress = (windPressureN_m2 / 1000.0) * shapeFactor * Math.pow(heightRatio, 1.4) * (spanRatio * 1.2) * (2.2 / Math.max(0.5, params.ribThickness));
    const maxStressMPa = Math.round(Math.max(2.5, rawStress) * 10) / 10;

    // Max structural deflection in mm (dependent on material elasticity modulus)
    let elasticityE_GPa = 30; // Concrete default
    let yieldStressMPa = 35;  // Concrete compressive/shear limit

    if (material.key === 'carrara_marble') {
      elasticityE_GPa = 65;
      yieldStressMPa = 90;
    } else if (material.key === 'desert_onyx') {
      elasticityE_GPa = 55;
      yieldStressMPa = 70;
    } else if (material.key === 'alula_sandstone') {
      elasticityE_GPa = 24;
      yieldStressMPa = 32;
    } else if (material.key === 'rose_gold_titanium') {
      elasticityE_GPa = 120;
      yieldStressMPa = 480;
    } else if (material.key === 'brushed_bronze') {
      elasticityE_GPa = 110;
      yieldStressMPa = 180;
    } else if (material.key === 'cyber_titanium') {
      elasticityE_GPa = 115;
      yieldStressMPa = 450;
    } else if (material.key === 'low_iron_glass') {
      elasticityE_GPa = 70;
      yieldStressMPa = 45;
    } else if (material.key === 'biopolymer_membrane') {
      elasticityE_GPa = 5;
      yieldStressMPa = 25;
    }

    const deflectionMm = Math.round((maxStressMPa * 1000 / (elasticityE_GPa * 1.5) * heightRatio * 8.5) * 10) / 10;
    const safetyFactor = Math.round((yieldStressMPa / maxStressMPa) * 10) / 10;

    let statusAr = '';
    let statusEn = '';

    if (safetyFactor >= 2.0) {
      statusAr = 'آمن إنشائياً - متوافق مع كود البناء السعودي (SBC 301)';
      statusEn = 'Structurally Compliant (SBC 301 Code Compliant)';
    } else if (safetyFactor >= 1.2) {
      statusAr = 'إجهاد متوسط - يُوصى بإضافة دعامات فولاذية موضعية';
      statusEn = 'Moderate Stress - Diagonal Stiffeners Recommended';
    } else {
      statusAr = 'إجهاد حرج - تجاوز حدود المرونة الإنشائية القصوى';
      statusEn = 'Critical Shear - Elastic Limit Exceeded';
    }

    return {
      windSpeedKmh,
      windPressureN_m2,
      maxStressMPa,
      maxDeflectionMm: Math.max(0.5, deflectionMm),
      safetyFactor,
      statusAr,
      statusEn
    };
  }
}
