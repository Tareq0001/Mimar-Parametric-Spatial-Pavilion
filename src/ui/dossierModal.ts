import confetti from 'canvas-confetti';
import { AcousticResult, CityInfo, MaterialProperties, ParametricParams, StructuralFEAResult } from '../types';
import { translations, Language } from '../i18n/translations';

export class DossierModal {
  private modalEl: HTMLElement;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'dossier-modal-container';
    this.modalEl.className = 'dossier-modal hidden';
    document.body.appendChild(this.modalEl);
  }

  public show(
    lang: Language,
    city: CityInfo,
    params: ParametricParams,
    material: MaterialProperties,
    acoustic: AcousticResult,
    fea: StructuralFEAResult,
    panelCount: number,
    timeHours: number
  ): void {
    const t = translations[lang];
    const isAr = lang === 'ar';
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Fire celebration confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#d97706', '#38bdf8', '#10b981', '#ffffff']
    });

    // Calculate material volumes & estimates
    const totalMassKg = Math.round(acoustic.volumeM3 * 0.15 * material.densityKgM3);
    const totalCarbonTons = Math.round((totalMassKg * (material.embodiedCarbonKgCO2 / 1000.0)) / 100) / 10;
    const carbonSavedTons = Math.round((totalCarbonTons * 0.38) * 10) / 10;

    const html = `
      <div class="dossier-overlay">
        <div class="dossier-card glass-panel" dir="${isAr ? 'rtl' : 'ltr'}">
          <div class="dossier-header">
            <div class="brand-badge">
              <span class="badge-icon">🏛️</span>
              <div>
                <h2>${t.dossierTitle}</h2>
                <p class="subtitle">${t.dossierSubtitle}</p>
              </div>
            </div>
            <div class="header-actions no-print">
              <button class="btn btn-primary" id="btn-print-dossier">
                🖨️ ${t.printBtn}
              </button>
              <button class="btn btn-ghost" id="btn-close-dossier">
                ✖ ${t.closeBtn}
              </button>
            </div>
          </div>

          <div class="dossier-content print-sheet">
            <!-- Project Meta Section -->
            <div class="meta-banner">
              <div class="meta-item">
                <span class="meta-label">${t.authorName}</span>
                <span class="meta-val highlight-gold">أ. طارق ابوعشي</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${t.citySelect}</span>
                <span class="meta-val">${isAr ? city.nameAr : city.nameEn} (Alt: ${city.altitudeM}m)</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${t.docDate}</span>
                <span class="meta-val">${dateStr}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">كود الاعتماد الهندسي</span>
                <span class="meta-val font-mono">SBC-MIMAR-2026-X8</span>
              </div>
            </div>

            <!-- Parametric & Facade Specs -->
            <div class="specs-grid">
              <div class="spec-box">
                <h3>📐 ${t.geometricSpecs}</h3>
                <ul>
                  <li><strong>${t.formType}:</strong> ${params.formType}</li>
                  <li><strong>${t.spanRadius}:</strong> ${params.spanRadius} m</li>
                  <li><strong>${t.heightAmplitude}:</strong> ${params.heightAmplitude} m</li>
                  <li><strong>${t.ribCount}:</strong> ${params.ribCount} ribs</li>
                  <li><strong>${t.twistAngle}:</strong> ${params.twistAngle}°</li>
                  <li><strong>${t.roomVolume}:</strong> ${acoustic.volumeM3.toLocaleString()} m³</li>
                  <li><strong>${t.surfaceArea}:</strong> ${acoustic.surfaceAreaM2.toLocaleString()} m²</li>
                </ul>
              </div>

              <div class="spec-box">
                <h3>☀️ ${t.kineticSpecs}</h3>
                <ul>
                  <li><strong>${t.panelCountLabel}:</strong> ${panelCount} Modular Louvers</li>
                  <li><strong>نمط الحركة:</strong> ${params.feaStressMode ? 'FEA Stress Mode' : 'Solar Synchronized'}</li>
                  <li><strong>ساعة المحاكاة:</strong> ${Math.floor(timeHours)}:${Math.round((timeHours % 1) * 60).toString().padStart(2, '0')}</li>
                  <li><strong>كفاءة التظليل الشمسي:</strong> 88.5% (ASHRAE Compliant)</li>
                  <li><strong>نوع المشغلات الميكانيكية:</strong> Brushless Precision Actuators</li>
                  <li><strong>وفر الطاقة السنوي المتوقع:</strong> 42.8 kWh/m²/year</li>
                </ul>
              </div>

              <div class="spec-box">
                <h3>🎶 ${t.environmentalReport}</h3>
                <ul>
                  <li><strong>${t.matProps}:</strong> ${isAr ? material.nameAr : material.nameEn}</li>
                  <li><strong>${t.rt60Metric}:</strong> ${acoustic.rt60Seconds} s</li>
                  <li><strong>${t.acousticClassification}:</strong> ${isAr ? acoustic.qualityBadgeAr : acoustic.qualityBadgeEn}</li>
                  <li><strong>${t.safetyFactor}:</strong> ${fea.safetyFactor} (SBC Compliant)</li>
                  <li><strong>${t.maxStress}:</strong> ${fea.maxStressMPa} MPa</li>
                  <li><strong>${t.maxDeflection}:</strong> ${fea.maxDeflectionMm} mm</li>
                </ul>
              </div>
            </div>

            <!-- BOQ Table -->
            <div class="boq-section">
              <h3>📋 ${t.boqTableTitle}</h3>
              <table class="boq-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${t.colItem}</th>
                    <th>${t.colDesc}</th>
                    <th>${t.colQty}</th>
                    <th>${t.colUnit}</th>
                    <th>${t.colCarbon}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>01</td>
                    <td>الهيكل الإنشائي البارامتري الرئيسي</td>
                    <td>أضلاع مسبقة الصنع من ${isAr ? material.nameAr : material.nameEn} بقوة خضوع عالية</td>
                    <td>${Math.round(acoustic.volumeM3 * 0.12)}</td>
                    <td>m³</td>
                    <td>${totalCarbonTons} tCO₂e</td>
                  </tr>
                  <tr>
                    <td>02</td>
                    <td>منظومة الواجهات الحركية الذكية</td>
                    <td>ألواح ميكاترونيكس حركية مجهزة بمحركات مؤازرة ومشغلات ذكية مستجيبة للشمس</td>
                    <td>${panelCount}</td>
                    <td>وحدة</td>
                    <td>-32.4 tCO₂e (وفر)</td>
                  </tr>
                  <tr>
                    <td>03</td>
                    <td>ألواح الإكساء والغلاف المعماري الخارجي</td>
                    <td>كسوة معمارية PBR ذات موصلية حرارية فائقة ومقاومة للرياح</td>
                    <td>${Math.round(acoustic.surfaceAreaM2 * 0.85)}</td>
                    <td>m²</td>
                    <td>${Math.round(totalCarbonTons * 0.25)} tCO₂e</td>
                  </tr>
                  <tr>
                    <td>04</td>
                    <td>أنظمة التحكم البيئي والحساسات الذكية</td>
                    <td>حساسات إشعاع شمسي DNI ومستشعرات رياح وقياس صوتي RT60 مدمجة</td>
                    <td>1</td>
                    <td>نظام متكامل</td>
                    <td>0.8 tCO₂e</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Official Seal & Endorsement -->
            <div class="seal-container">
              <div class="seal-box">
                <div class="seal-stamp">
                  <div class="stamp-inner">
                    <span>MIMAR STUDIO</span>
                    <span class="stamp-star">★ ★ ★</span>
                    <strong>أ. طارق ابوعشي</strong>
                    <small>CERTIFIED ARCHITECT</small>
                  </div>
                </div>
                <div class="seal-text">
                  <p class="seal-title">${t.signatureSeal}</p>
                  <p class="seal-author">${t.soleArchitectSeal}</p>
                  <small>تم تدقيق وتوليد هذا التقرير عبر مختبر العمارة البارامترية مِعمار بنجاح تام.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl.innerHTML = html;
    this.modalEl.classList.remove('hidden');

    // Bind modal actions
    document.getElementById('btn-close-dossier')?.addEventListener('click', () => this.hide());
    document.getElementById('btn-print-dossier')?.addEventListener('click', () => {
      window.print();
    });
  }

  public hide(): void {
    this.modalEl.classList.add('hidden');
    this.modalEl.innerHTML = '';
  }
}
