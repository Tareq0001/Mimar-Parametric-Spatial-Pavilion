import * as THREE from 'three';
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

// Preset configurations
const PRESETS: Record<string, PresetModel> = {
  alula: {
    id: 'alula',
    nameAr: 'واحة العُلا | مظلة الكثبان',
    nameEn: 'AlUla Oasis Canopy',
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
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'desert_sandstone',
    kineticMode: 'solar_tracking',
    timeOfDay: 13.5
  },
  riyadh: {
    id: 'riyadh',
    nameAr: 'جناح الابتكار | الرياض كابيتال',
    nameEn: 'Riyadh Innovation Pavilion',
    descAr: 'شريط تورس التوائي فائق الحداثة بواجهات حركية ذكية مستجيبة لحركة الشمس في نجد.',
    descEn: 'Futuristic twisted hyperbolic torus ribbon pavilion.',
    city: 'riyadh',
    geometry: {
      formType: 'twisted_torus',
      ribCount: 44,
      twistAngle: 90,
      spanRadius: 32,
      heightAmplitude: 16,
      rippleFreq: 4,
      ribThickness: 1.0,
      wireframe: false,
      showSkeleton: true,
      feaStressMode: false
    },
    material: 'cyber_titanium',
    kineticMode: 'harmonic_wave',
    timeOfDay: 12.0
  },
  jeddah: {
    id: 'jeddah',
    nameAr: 'صدفة المرجان | واجهة جدة',
    nameEn: 'Jeddah Coral Shell',
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
    nameAr: 'برج الضباب وسحاب عسير | أبها',
    nameEn: 'Abha Mist Tower Pavilion',
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
  private currentMaterial: MaterialKey = 'desert_sandstone';
  private timeOfDay: number = 13.5;
  private windSpeedKmh: number = 45;

  private parametricParams: ParametricParams = {
    formType: 'geodesic_shell',
    ribCount: 38,
    twistAngle: 25,
    spanRadius: 30,
    heightAmplitude: 14,
    rippleFreq: 3,
    ribThickness: 0.8,
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
   * Regenerates or morphs the 3D parametric pavilion
   */
  private updateParametricMesh(): void {
    // Remove previous mesh and skeleton
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
   * Calculates Sabine RT60 and Wind FEA Stress
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

    // Update UI Elements
    const rt60El = document.getElementById('val-rt60-num');
    if (rt60El) rt60El.innerHTML = `${acoustic.rt60Seconds} <span>${this.lang === 'ar' ? 'ثانية' : 'sec'}</span>`;

    const rt60BadgeEl = document.getElementById('val-rt60-badge');
    if (rt60BadgeEl) rt60BadgeEl.textContent = this.lang === 'ar' ? acoustic.qualityBadgeAr : acoustic.qualityBadgeEn;

    const hudAreaEl = document.getElementById('hud-val-area');
    if (hudAreaEl) hudAreaEl.textContent = `${this.currentMeshOutput.surfaceAreaM2} m²`;

    const hudRt60El = document.getElementById('hud-val-rt60');
    if (hudRt60El) hudRt60El.textContent = `${acoustic.rt60Seconds} s`;

    const hudStressEl = document.getElementById('hud-val-stress');
    if (hudStressEl) {
      hudStressEl.textContent = `${fea.maxStressMPa} MPa`;
      hudStressEl.style.color = fea.safetyFactor >= 2.0 ? 'var(--accent-emerald)' : 'var(--accent-gold)';
    }

    // Octave bars heights
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

    // Material spec card
    const matDensityEl = document.getElementById('val-mat-density');
    if (matDensityEl) matDensityEl.textContent = `${matProps.densityKgM3} kg/m³`;

    const matCarbonEl = document.getElementById('val-mat-carbon');
    if (matCarbonEl) matCarbonEl.textContent = `${matProps.embodiedCarbonKgCO2} kgCO₂/m³`;

    const matThermalEl = document.getElementById('val-mat-thermal');
    if (matThermalEl) matThermalEl.textContent = `${matProps.thermalCondW_mK} W/m·K`;

    const matAlphaEl = document.getElementById('val-mat-alpha');
    if (matAlphaEl) matAlphaEl.textContent = `${matProps.avgAlpha}`;
  }

  private setBarHeight(id: string, val: number, max: number): void {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.max(15, Math.min(100, (val / max) * 100));
    el.style.height = `${pct}%`;
  }

  /**
   * Binds UI events and user interactions
   */
  private bindDOMEvents(): void {
    // Tab Switching in Studio Panel
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

      // Update inputs
      (document.getElementById('select-form-type') as HTMLSelectElement).value = p.geometry.formType;
      (document.getElementById('slider-rib-count') as HTMLInputElement).value = String(p.geometry.ribCount);
      document.getElementById('val-rib-count')!.textContent = String(p.geometry.ribCount);

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

    // Parametric Geometry Controls
    const formSelect = document.getElementById('select-form-type') as HTMLSelectElement;
    formSelect?.addEventListener('change', () => {
      this.parametricParams.formType = formSelect.value as GeometryType;
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

    // Materials Cards
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

    // Open BOQ Technical Dossier Modal
    document.getElementById('btn-open-dossier')?.addEventListener('click', () => {
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
    });

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
        ? `مِـعْـمار <span style="font-size: 11px; opacity: 0.6; font-family: var(--font-en); font-weight: 400;">| MIMAR</span>`
        : `MIMAR <span style="font-size: 11px; opacity: 0.6; font-family: var(--font-ar); font-weight: 400;">| مِـعْـمار</span>`;
    }

    const creatorTag = document.getElementById('creator-tag-txt');
    if (creatorTag) creatorTag.textContent = t.creatorBadge;

    const exportTxt = document.getElementById('btn-export-txt');
    if (exportTxt) exportTxt.textContent = t.exportBOQ;

    const langBtn = document.getElementById('btn-toggle-lang');
    if (langBtn) langBtn.textContent = isAr ? 'English' : 'العربية';

    // Tabs
    const tabGeom = document.getElementById('tab-btn-geom');
    if (tabGeom) tabGeom.textContent = t.tabGeometry;

    const tabKinetic = document.getElementById('tab-btn-kinetic');
    if (tabKinetic) tabKinetic.textContent = t.tabKinetic;

    const tabMat = document.getElementById('tab-btn-materials');
    if (tabMat) tabMat.textContent = t.tabMaterials;

    const tabSim = document.getElementById('tab-btn-sim');
    if (tabSim) tabSim.textContent = t.tabSimulation;

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
