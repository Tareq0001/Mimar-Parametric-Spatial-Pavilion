import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import confetti from 'canvas-confetti';
import { SceneManager } from './engine/sceneManager';
import { ParametricMeshGenerator, ParametricMeshOutput } from './engine/parametricMesh';
import { KineticFacadeSystem } from './engine/kineticFacade';
import { MaterialManager, MATERIAL_SPECS } from './engine/materials';
import { SolarPathSimulator, CITIES_DATA } from './engine/solarSimulator';
import { AcousticEngine } from './engine/acousticEngine';
import { StructuralFEASimulator } from './engine/feaSimulator';
import { DossierModal } from './ui/dossierModal';
import { translations, Language } from './i18n/translations';
import {
  CameraPreset,
  CityKey,
  GeometryType,
  KineticMode,
  KineticParams,
  MaterialKey,
  ParametricParams,
  PresetModel
} from './types';

// Royal Architectural Preset configurations
const PRESETS: Record<string, PresetModel> = {
  muqarnas_royal: {
    id: 'muqarnas_royal',
    nameAr: 'قصر المقرنصات الملكي | رخام كرارا الماسي',
    nameEn: 'Royal Muqarnas Pavilion | Carrara Marble',
    descAr: 'قبو مقرنصات أيقوني مستوحى من قصر الحمراء بأعمدة رخامية وأقواس إسلامية حمالة مع بركة ماء عاكسة.',
    descEn: 'Monumental Islamic vault with fluted marble colonnade and tranquil reflecting water basin.',
    city: 'alula',
    geometry: {
      formType: 'muqarnas_vault',
      ribCount: 36,
      twistAngle: 0,
      spanRadius: 28,
      heightAmplitude: 14,
      rippleFreq: 3,
      ribThickness: 0.8,
      muqarnasTiers: 5,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'carrara_marble',
    kineticMode: 'solar_tracking',
    timeOfDay: 13.5
  },
  muqarnas_dome: {
    id: 'muqarnas_dome',
    nameAr: 'قبة النور والعين السماوية | أونيكس الصحراء',
    nameEn: 'Celestial Muqarnas Dome & Oculus | Desert Onyx',
    descAr: 'قبة مقرنصات ملكية ذات 6 طبقات متدلية وعين مركزية (Oculus) تتدفق منها أشعة الشمس الذهبية.',
    descEn: 'Royal tiered stalactite dome with open central Oculus pouring golden sunbeams onto mirror water.',
    city: 'riyadh',
    geometry: {
      formType: 'muqarnas_dome',
      ribCount: 32,
      twistAngle: 0,
      spanRadius: 26,
      heightAmplitude: 16,
      rippleFreq: 2,
      ribThickness: 0.8,
      muqarnasTiers: 6,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'desert_onyx',
    kineticMode: 'harmonic_wave',
    timeOfDay: 12.0
  },
  alula: {
    id: 'alula',
    nameAr: 'واحة العُلا | حجر العلا الذهبي',
    nameEn: 'AlUla Oasis | Golden Sandstone',
    descAr: 'هيكل جيوديسي متموج يحاكي تضاريس وادي العُلا مع واجهة شمسية تحمي من الإشعاع المباشر.',
    descEn: 'Undulating geodesic shell with dynamic kinetic solar shading.',
    city: 'alula',
    geometry: {
      formType: 'geodesic_shell',
      ribCount: 38,
      twistAngle: 25,
      spanRadius: 30,
      heightAmplitude: 14,
      rippleFreq: 3,
      ribThickness: 0.8,
      muqarnasTiers: 5,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'alula_sandstone',
    kineticMode: 'solar_tracking',
    timeOfDay: 13.5
  },
  riyadh: {
    id: 'riyadh',
    nameAr: 'جناح الابتكار | تيتانيوم الذهب الوردي',
    nameEn: 'Innovation Hub | Rose-Gold Titanium',
    descAr: 'شريط تورس التوائي فائق الحداثة بواجهات حركية ذكية مستجيبة لحركة الشمس في نجد.',
    descEn: 'Futuristic twisted hyperbolic torus ribbon pavilion with rose-gold titanium skin.',
    city: 'riyadh',
    geometry: {
      formType: 'twisted_torus',
      ribCount: 44,
      twistAngle: 90,
      spanRadius: 32,
      heightAmplitude: 16,
      rippleFreq: 4,
      ribThickness: 1.0,
      muqarnasTiers: 5,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'rose_gold_titanium',
    kineticMode: 'harmonic_wave',
    timeOfDay: 12.0
  },
  jeddah: {
    id: 'jeddah',
    nameAr: 'صدفة المرجان | زجاج نقي ساحلي',
    nameEn: 'Coral Shell | Clear Coastal Glass',
    descAr: 'قبو سلسلي منحني مستوحى من كائنات البحر الأحمر مع زجاج عالي الشفافية ومقاومة للرطوبة.',
    descEn: 'Curved catenary rib vault with low-iron structural glass.',
    city: 'jeddah',
    geometry: {
      formType: 'catenary_vault',
      ribCount: 32,
      twistAngle: -15,
      spanRadius: 26,
      heightAmplitude: 11,
      rippleFreq: 2,
      ribThickness: 0.6,
      muqarnasTiers: 4,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'low_iron_glass',
    kineticMode: 'solar_tracking',
    timeOfDay: 15.0
  },
  abha: {
    id: 'abha',
    nameAr: 'برج الضباب وسحاب عسير | برونز معماري',
    nameEn: 'Mist Tower & Asir Pavilion | Architectural Bronze',
    descAr: 'مظلة جيبية شاهقة مصممة لاقتناص التيارات الهوائية الجبلية في مرتفعات عسير الشاهقة.',
    descEn: 'Sinusoidal canopy engineered to capture mountain wind drafts.',
    city: 'abha',
    geometry: {
      formType: 'sinusoidal_canopy',
      ribCount: 48,
      twistAngle: 60,
      spanRadius: 35,
      heightAmplitude: 18,
      rippleFreq: 5,
      ribThickness: 1.2,
      muqarnasTiers: 5,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'brushed_bronze',
    kineticMode: 'max_aperture',
    timeOfDay: 10.5
  }
};

class MimarApp {
  private lang: Language = 'ar';
  private currentCity: CityKey = 'alula';
  private currentMaterial: MaterialKey = 'carrara_marble';
  private timeOfDay: number = 13.5;
  private windSpeedKmh: number = 45;

  private parametricParams: ParametricParams = {
    formType: 'muqarnas_vault',
    ribCount: 36,
    twistAngle: 0,
    spanRadius: 28,
    heightAmplitude: 14,
    rippleFreq: 3,
    ribThickness: 0.8,
    muqarnasTiers: 5,
    wireframe: false,
    showSkeleton: true,
    feaStressMode: false
  };

  private kineticParams: KineticParams = {
    mode: 'solar_tracking',
    manualAperture: 45,
    waveSpeed: 1.2,
    activePanelsCount: 216,
    louverTiltAngle: 45,
    shadingEfficiency: 84.5,
    directRadiationW: 950,
    daylightLux: 85000
  };

  // Systems
  private sceneManager!: SceneManager;
  private meshGenerator!: ParametricMeshGenerator;
  private kineticFacade!: KineticFacadeSystem;
  private materialManager!: MaterialManager;
  private solarSimulator!: SolarPathSimulator;
  private acousticEngine!: AcousticEngine;
  private feaSimulator!: StructuralFEASimulator;
  private dossierModal!: DossierModal;
  private objExporter: OBJExporter = new OBJExporter();

  // Active Three.js scene instances
  private currentMeshOutput: ParametricMeshOutput | null = null;

  constructor() {
    this.initEngines();
    this.bindDOMEvents();
    this.updateParametricMesh();
    this.updateSolarAndEnvironment();
    this.startAnimationLoop();
  }

  private initEngines(): void {
    const canvasContainer = document.getElementById('canvas-container')!;
    this.sceneManager = new SceneManager(canvasContainer);
    this.meshGenerator = new ParametricMeshGenerator();
    this.materialManager = new MaterialManager();
    this.solarSimulator = new SolarPathSimulator();
    this.acousticEngine = new AcousticEngine();
    this.feaSimulator = new StructuralFEASimulator();
    this.dossierModal = new DossierModal();

    // Kinetic Facade
    this.kineticFacade = new KineticFacadeSystem();
    this.sceneManager.scene.add(this.kineticFacade.group);
  }

  /**
   * Regenerates the 3D parametric pavilion mesh & skeleton
   */
  private updateParametricMesh(): void {
    if (this.currentMeshOutput) {
      this.sceneManager.scene.remove(this.currentMeshOutput.mesh);
      this.sceneManager.scene.remove(this.currentMeshOutput.skeletonGroup);
      this.currentMeshOutput.mesh.geometry.dispose();
    }

    const mat = this.materialManager.getMaterial(
      this.currentMaterial,
      this.parametricParams.feaStressMode,
      this.parametricParams.wireframe
    );

    this.currentMeshOutput = this.meshGenerator.generate(this.parametricParams, mat);
    this.sceneManager.scene.add(this.currentMeshOutput.mesh);

    if (this.parametricParams.showSkeleton) {
      this.sceneManager.scene.add(this.currentMeshOutput.skeletonGroup);
    }

    // Toggle Muqarnas Tiers slider visibility based on formType
    const tiersGroup = document.getElementById('grp-muqarnas-tiers');
    if (tiersGroup) {
      const isMuqarnas = this.parametricParams.formType === 'muqarnas_vault' || this.parametricParams.formType === 'muqarnas_dome';
      tiersGroup.style.display = isMuqarnas ? 'flex' : 'none';
    }

    this.updateAcousticsAndFEA();
  }

  /**
   * Updates Solar Ephemeris & Lighting
   */
  private updateSolarAndEnvironment(): void {
    const solar = this.solarSimulator.calculate(this.currentCity, this.timeOfDay);
    this.sceneManager.updateSolarLighting(solar);

    this.kineticParams.directRadiationW = solar.directNormalIrradianceW;
    this.kineticParams.daylightLux = solar.daylightLux;
    this.kineticParams.shadingEfficiency = solar.shadingEfficiencyPct;

    // HUD & Badge Updates
    const sunAngleEl = document.getElementById('hud-val-sun');
    if (sunAngleEl) sunAngleEl.textContent = `${solar.solarAltitudeDeg}°`;

    const shadingEffEl = document.getElementById('val-shading-eff');
    if (shadingEffEl) shadingEffEl.innerHTML = `${solar.shadingEfficiencyPct} <span>%</span>`;

    const timeBadgeEl = document.getElementById('val-time-of-day');
    if (timeBadgeEl) {
      const h = Math.floor(this.timeOfDay);
      const m = Math.round((this.timeOfDay % 1) * 60);
      timeBadgeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    this.acousticEngine.updateFilterWithSolar(solar.solarAltitudeDeg);
  }

  /**
   * Calculates Sabine RT60, Wind FEA Stress, and Instant BOQ metrics
   */
  private updateAcousticsAndFEA(): void {
    if (!this.currentMeshOutput) return;

    const matProps = MATERIAL_SPECS[this.currentMaterial];
    const acoustic = this.acousticEngine.calculateRT60(
      this.currentMeshOutput.volumeM3,
      this.currentMeshOutput.surfaceAreaM2,
      matProps
    );

    const fea = this.feaSimulator.calculate(
      this.windSpeedKmh,
      this.parametricParams,
      matProps
    );

    // Update Acoustics UI
    const rt60El = document.getElementById('val-rt60-num');
    if (rt60El) rt60El.innerHTML = `${acoustic.rt60Seconds} <span>${this.lang === 'ar' ? 'ثانية' : 'sec'}</span>`;

    const rt60BadgeEl = document.getElementById('val-rt60-badge');
    if (rt60BadgeEl) rt60BadgeEl.textContent = this.lang === 'ar' ? acoustic.qualityBadgeAr : acoustic.qualityBadgeEn;

    // HUD Indicators
    const hudAreaEl = document.getElementById('hud-val-area');
    if (hudAreaEl) hudAreaEl.textContent = `${this.currentMeshOutput.surfaceAreaM2} m²`;

    const hudRt60El = document.getElementById('hud-val-rt60');
    if (hudRt60El) hudRt60El.textContent = `${acoustic.rt60Seconds} s`;

    const hudStressEl = document.getElementById('hud-val-stress');
    if (hudStressEl) {
      hudStressEl.textContent = `${fea.maxStressMPa} MPa`;
      hudStressEl.style.color = fea.safetyFactor >= 2.0 ? 'var(--accent-emerald)' : 'var(--accent-gold)';
    }

    // Octave bars
    const maxBar = Math.max(0.1, acoustic.octaveRT60.hz125, acoustic.octaveRT60.hz250, acoustic.octaveRT60.hz500, acoustic.octaveRT60.hz1000, acoustic.octaveRT60.hz2000, acoustic.octaveRT60.hz4000);
    this.setBarHeight('bar-125', acoustic.octaveRT60.hz125, maxBar);
    this.setBarHeight('bar-250', acoustic.octaveRT60.hz250, maxBar);
    this.setBarHeight('bar-500', acoustic.octaveRT60.hz500, maxBar);
    this.setBarHeight('bar-1k', acoustic.octaveRT60.hz1000, maxBar);
    this.setBarHeight('bar-2k', acoustic.octaveRT60.hz2000, maxBar);
    this.setBarHeight('bar-4k', acoustic.octaveRT60.hz4000, maxBar);

    // Wind FEA values
    const pressureEl = document.getElementById('val-wind-pressure');
    if (pressureEl) pressureEl.textContent = `${fea.windPressureN_m2} N/m²`;

    const stressEl = document.getElementById('val-max-stress');
    if (stressEl) stressEl.textContent = `${fea.maxStressMPa} MPa`;

    const safetyEl = document.getElementById('val-safety-factor');
    if (safetyEl) {
      safetyEl.textContent = `${fea.safetyFactor} (${this.lang === 'ar' ? (fea.safetyFactor >= 2.0 ? 'آمن إنشائياً' : 'متوسط') : (fea.safetyFactor >= 2.0 ? 'Safe' : 'Moderate')})`;
      safetyEl.style.color = fea.safetyFactor >= 2.0 ? 'var(--accent-emerald)' : 'var(--accent-crimson)';
    }

    // Tab 4 Quick BOQ Calculator Updates
    const structuralVolM3 = Math.round(this.currentMeshOutput.volumeM3 * 0.16 * 10) / 10;
    const totalMassKg = Math.round(structuralVolM3 * matProps.densityKgM3);
    const totalMassTons = Math.round(totalMassKg / 100) / 10;
    const totalCarbonTons = Math.round((totalMassKg * (matProps.embodiedCarbonKgCO2 / 1000.0)) / 100) / 10;
    const carbonSavedTons = Math.round((totalCarbonTons * 0.38) * 10) / 10;

    const boqVolEl = document.getElementById('val-boq-vol');
    if (boqVolEl) boqVolEl.textContent = `${structuralVolM3} m³`;

    const boqMassEl = document.getElementById('val-boq-mass');
    if (boqMassEl) boqMassEl.textContent = `${totalMassTons} ${this.lang === 'ar' ? 'طن' : 'tons'}`;

    const boqCarbonEl = document.getElementById('val-boq-carbon');
    if (boqCarbonEl) boqCarbonEl.textContent = `${totalCarbonTons} ${this.lang === 'ar' ? 'طن CO₂' : 'tons CO₂'}`;

    const boqSavedEl = document.getElementById('val-boq-saved');
    if (boqSavedEl) boqSavedEl.textContent = `${carbonSavedTons} ${this.lang === 'ar' ? 'طن CO₂' : 'tons CO₂'}`;
  }

  private setBarHeight(id: string, val: number, max: number): void {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.max(15, Math.min(100, (val / max) * 100));
    el.style.height = `${pct}%`;
  }

  /**
   * Downloads the current 3D pavilion as a standard Wavefront OBJ file
   */
  private exportOBJFile(): void {
    if (!this.currentMeshOutput) return;

    try {
      const result = this.objExporter.parse(this.currentMeshOutput.mesh);
      const blob = new Blob([result], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MIMAR_${this.parametricParams.formType}_${this.currentMaterial}.obj`;
      link.click();
      URL.revokeObjectURL(link.href);

      // Celebration confetti
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#d97706', '#38bdf8', '#10b981', '#f59e0b']
      });
    } catch (e) {
      console.error('Failed to export OBJ', e);
    }
  }

  /**
   * Binds UI events and user interactions
   */
  private bindDOMEvents(): void {
    // Tab Switching across all 4 Specialized Tabs
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.panel-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-tab');
        document.querySelectorAll('.panel-tab-body').forEach((panel) => {
          (panel as HTMLElement).style.display = panel.id === targetId ? 'flex' : 'none';
        });
      });
    });

    // Preset Selection
    const presetSelect = document.getElementById('select-preset') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => {
      const p = PRESETS[presetSelect.value];
      if (!p) return;

      this.currentCity = p.city;
      (document.getElementById('select-city') as HTMLSelectElement).value = p.city;

      this.parametricParams = { ...p.geometry };
      this.currentMaterial = p.material;
      this.kineticParams.mode = p.kineticMode;
      this.timeOfDay = p.timeOfDay;

      // Update Form Inputs
      (document.getElementById('select-form-type') as HTMLSelectElement).value = p.geometry.formType;
      (document.getElementById('slider-rib-count') as HTMLInputElement).value = String(p.geometry.ribCount);
      document.getElementById('val-rib-count')!.textContent = String(p.geometry.ribCount);

      if (p.geometry.muqarnasTiers) {
        const tiersSlider = document.getElementById('slider-muqarnas-tiers') as HTMLInputElement;
        if (tiersSlider) tiersSlider.value = String(p.geometry.muqarnasTiers);
        const tiersBadge = document.getElementById('val-muqarnas-tiers');
        if (tiersBadge) tiersBadge.textContent = `${p.geometry.muqarnasTiers} ${this.lang === 'ar' ? 'طبقات' : 'tiers'}`;
      }

      (document.getElementById('slider-span-radius') as HTMLInputElement).value = String(p.geometry.spanRadius);
      document.getElementById('val-span-radius')!.textContent = `${p.geometry.spanRadius} m`;

      (document.getElementById('slider-height-amp') as HTMLInputElement).value = String(p.geometry.heightAmplitude);
      document.getElementById('val-height-amp')!.textContent = `${p.geometry.heightAmplitude} m`;

      (document.getElementById('slider-twist-angle') as HTMLInputElement).value = String(p.geometry.twistAngle);
      document.getElementById('val-twist-angle')!.textContent = `${p.geometry.twistAngle}°`;

      (document.getElementById('slider-ripple-freq') as HTMLInputElement).value = String(p.geometry.rippleFreq);
      document.getElementById('val-ripple-freq')!.textContent = `${p.geometry.rippleFreq} waves`;

      (document.getElementById('select-kinetic-mode') as HTMLSelectElement).value = p.kineticMode;
      (document.getElementById('slider-time-of-day') as HTMLInputElement).value = String(p.timeOfDay);

      // Material cards active state
      document.querySelectorAll('.material-card').forEach((card) => {
        card.classList.toggle('active', card.getAttribute('data-mat') === p.material);
      });

      this.updateParametricMesh();
      this.updateSolarAndEnvironment();
    });

    // City Microclimate Select
    const citySelect = document.getElementById('select-city') as HTMLSelectElement;
    citySelect?.addEventListener('change', () => {
      this.currentCity = citySelect.value as CityKey;
      this.updateSolarAndEnvironment();
    });

    // Solar Time Slider
    const timeSlider = document.getElementById('slider-time-of-day') as HTMLInputElement;
    timeSlider?.addEventListener('input', () => {
      this.timeOfDay = parseFloat(timeSlider.value);
      this.updateSolarAndEnvironment();
    });

    // Form Type Selector
    const formSelect = document.getElementById('select-form-type') as HTMLSelectElement;
    formSelect?.addEventListener('change', () => {
      this.parametricParams.formType = formSelect.value as GeometryType;
      this.updateParametricMesh();
    });

    // Muqarnas Tiers Slider
    this.bindRangeSlider('slider-muqarnas-tiers', 'val-muqarnas-tiers', ` ${this.lang === 'ar' ? 'طبقات' : 'tiers'}`, (val) => {
      this.parametricParams.muqarnasTiers = val;
      this.updateParametricMesh();
    });

    this.bindRangeSlider('slider-rib-count', 'val-rib-count', '', (val) => {
      this.parametricParams.ribCount = val;
      this.updateParametricMesh();
    });

    this.bindRangeSlider('slider-span-radius', 'val-span-radius', ' m', (val) => {
      this.parametricParams.spanRadius = val;
      this.updateParametricMesh();
    });

    this.bindRangeSlider('slider-height-amp', 'val-height-amp', ' m', (val) => {
      this.parametricParams.heightAmplitude = val;
      this.updateParametricMesh();
    });

    this.bindRangeSlider('slider-twist-angle', 'val-twist-angle', '°', (val) => {
      this.parametricParams.twistAngle = val;
      this.updateParametricMesh();
    });

    this.bindRangeSlider('slider-ripple-freq', 'val-ripple-freq', ' waves', (val) => {
      this.parametricParams.rippleFreq = val;
      this.updateParametricMesh();
    });

    // Toggles
    const wireframeCheck = document.getElementById('check-wireframe') as HTMLInputElement;
    wireframeCheck?.addEventListener('change', () => {
      this.parametricParams.wireframe = wireframeCheck.checked;
      this.updateParametricMesh();
    });

    const skeletonCheck = document.getElementById('check-skeleton') as HTMLInputElement;
    skeletonCheck?.addEventListener('change', () => {
      this.parametricParams.showSkeleton = skeletonCheck.checked;
      if (this.currentMeshOutput) {
        if (skeletonCheck.checked) {
          this.sceneManager.scene.add(this.currentMeshOutput.skeletonGroup);
        } else {
          this.sceneManager.scene.remove(this.currentMeshOutput.skeletonGroup);
        }
      }
    });

    const feaCheck = document.getElementById('check-fea-stress') as HTMLInputElement;
    feaCheck?.addEventListener('change', () => {
      this.parametricParams.feaStressMode = feaCheck.checked;
      this.updateParametricMesh();
    });

    // Kinetic Facade Controls
    const kineticSelect = document.getElementById('select-kinetic-mode') as HTMLSelectElement;
    kineticSelect?.addEventListener('change', () => {
      this.kineticParams.mode = kineticSelect.value as KineticMode;
    });

    this.bindRangeSlider('slider-wave-speed', 'val-wave-speed', 'x', (val) => {
      this.kineticParams.waveSpeed = val;
    });

    // Materials Cards (9 Luxury PBR Finishes)
    document.querySelectorAll('.material-card').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.material-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.currentMaterial = card.getAttribute('data-mat') as MaterialKey;
        this.updateParametricMesh();
      });
    });

    // Impulse Ping Web Audio Trigger
    document.getElementById('btn-impulse-ping')?.addEventListener('click', () => {
      const rt60 = this.currentMeshOutput ? this.acousticEngine.calculateRT60(
        this.currentMeshOutput.volumeM3,
        this.currentMeshOutput.surfaceAreaM2,
        MATERIAL_SPECS[this.currentMaterial]
      ).rt60Seconds : 1.5;

      this.acousticEngine.triggerImpulsePing(rt60);
    });

    // Wind Speed Slider
    this.bindRangeSlider('slider-wind-speed', 'val-wind-speed', ' km/h', (val) => {
      this.windSpeedKmh = val;
      this.updateAcousticsAndFEA();
    });

    // Audio Spatial Sound Mute/Unmute
    document.getElementById('btn-toggle-audio')?.addEventListener('click', () => {
      const isMuted = this.acousticEngine.toggleMute();
      const icon = document.getElementById('audio-icon');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
    });

    // Camera Views
    const camButtons = document.querySelectorAll<HTMLButtonElement>('.cam-btn[data-cam]');
    camButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        camButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const camPreset = btn.getAttribute('data-cam') as CameraPreset;
        this.sceneManager.setCameraPreset(camPreset);
      });
    });

    // Auto-Rotate Toggle
    document.getElementById('btn-auto-rotate')?.addEventListener('click', (e) => {
      const active = this.sceneManager.toggleAutoRotate();
      (e.currentTarget as HTMLElement).classList.toggle('active', active);
    });

    // Theme Toggle
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
    });

    // Language Toggle
    document.getElementById('btn-toggle-lang')?.addEventListener('click', () => {
      this.lang = this.lang === 'ar' ? 'en' : 'ar';
      this.applyLanguage();
    });

    // 3D OBJ Export Buttons (both in header nav and Tab 4)
    document.getElementById('btn-export-obj-nav')?.addEventListener('click', () => {
      this.exportOBJFile();
    });
    document.getElementById('btn-download-obj')?.addEventListener('click', () => {
      this.exportOBJFile();
    });

    // Open BOQ Technical Dossier Modal (both in header nav and Tab 4)
    const openDossierHandler = () => {
      if (!this.currentMeshOutput) return;

      const matProps = MATERIAL_SPECS[this.currentMaterial];
      const acoustic = this.acousticEngine.calculateRT60(
        this.currentMeshOutput.volumeM3,
        this.currentMeshOutput.surfaceAreaM2,
        matProps
      );
      const fea = this.feaSimulator.calculate(
        this.windSpeedKmh,
        this.parametricParams,
        matProps
      );

      this.dossierModal.show(
        this.lang,
        CITIES_DATA[this.currentCity],
        this.parametricParams,
        matProps,
        acoustic,
        fea,
        this.kineticFacade.getPanelCount(),
        this.timeOfDay
      );
    };

    document.getElementById('btn-open-dossier')?.addEventListener('click', openDossierHandler);
    document.getElementById('btn-open-dossier-tab')?.addEventListener('click', openDossierHandler);

    // Mouse Tracking for Kinetic Facade
    window.addEventListener('mousemove', (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.kineticFacade.updateCursor(normX, normY);
    });
  }

  private bindRangeSlider(
    sliderId: string,
    valId: string,
    unit: string,
    onChange: (val: number) => void
  ): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valBadge = document.getElementById(valId);
    if (!slider || !valBadge) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valBadge.textContent = `${val}${unit}`;
      onChange(val);
    });
  }

  private applyLanguage(): void {
    const isAr = this.lang === 'ar';
    document.documentElement.lang = this.lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.body.dir = isAr ? 'rtl' : 'ltr';

    const t = translations[this.lang];

    // Titles & Header
    const titleTxt = document.getElementById('app-title-txt');
    if (titleTxt) {
      titleTxt.innerHTML = isAr
        ? `مِـعْـمار <span class="brand-sub-badge">| MIMAR ATELIER</span>`
        : `MIMAR <span class="brand-sub-badge">| ATELIER</span>`;
    }

    const creatorTag = document.getElementById('creator-tag-txt');
    if (creatorTag) creatorTag.textContent = t.creatorBadge;

    const exportTxt = document.getElementById('btn-export-txt');
    if (exportTxt) exportTxt.textContent = t.exportBOQ;

    const langBtn = document.getElementById('btn-toggle-lang');
    if (langBtn) langBtn.textContent = isAr ? 'English' : 'العربية';

    // 4 Tabs
    const tabGeom = document.getElementById('tab-btn-geom');
    if (tabGeom) tabGeom.textContent = t.tabGeometry;

    const tabMuqarnas = document.getElementById('tab-btn-muqarnas');
    if (tabMuqarnas) tabMuqarnas.textContent = t.tabMuqarnas;

    const tabSim = document.getElementById('tab-btn-sim');
    if (tabSim) tabSim.textContent = t.tabSimulation;

    const tabAcademy = document.getElementById('tab-btn-academy');
    if (tabAcademy) tabAcademy.textContent = t.tabAcademy;

    // HUD Labels
    const hudArea = document.getElementById('hud-lbl-area');
    if (hudArea) hudArea.textContent = t.hudCoveredArea;

    const hudPanels = document.getElementById('hud-lbl-panels');
    if (hudPanels) hudPanels.textContent = t.hudPanels;

    const hudRt60 = document.getElementById('hud-lbl-rt60');
    if (hudRt60) hudRt60.textContent = t.hudRT60;

    const hudSun = document.getElementById('hud-lbl-sun');
    if (hudSun) hudSun.textContent = t.hudSolarAngle;

    const hudStress = document.getElementById('hud-lbl-stress');
    if (hudStress) hudStress.textContent = t.hudStress;

    this.updateAcousticsAndFEA();
  }

  /**
   * Main Render Loop
   */
  private startAnimationLoop(): void {
    const clock = new THREE.Clock();

    const tick = () => {
      requestAnimationFrame(tick);

      const elapsedTime = clock.getElapsedTime();
      const sunDir = this.sceneManager.sunLight.position.clone().normalize();

      // Update kinetic louvers
      this.kineticFacade.update(elapsedTime, this.kineticParams, sunDir);

      // Render Three.js viewport
      this.sceneManager.render();
    };

    tick();
  }
}

// Instantiate once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new MimarApp();
});
