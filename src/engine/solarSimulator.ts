import * as THREE from 'three';
import { CityInfo, CityKey } from '../types';

export const CITIES_DATA: Record<CityKey, CityInfo> = {
  riyadh: {
    key: 'riyadh',
    nameAr: 'الرياض (هضبة نجد)',
    nameEn: 'Riyadh (Najd Plateau)',
    lat: 24.7136,
    lng: 46.6753,
    altitudeM: 612,
    avgTempC: 38,
    climateAr: 'صحراوي حار - إشعاع شمسي عمودي شديد',
    climateEn: 'Hot Arid - Extreme Direct Solar Radiation'
  },
  jeddah: {
    key: 'jeddah',
    nameAr: 'جدة (ساحل البحر الأحمر)',
    nameEn: 'Jeddah (Red Sea Coast)',
    lat: 21.5433,
    lng: 39.1728,
    altitudeM: 12,
    avgTempC: 34,
    climateAr: 'ساحلي رطب - إشعاع مشتت وضباب ملحي',
    climateEn: 'Humid Coastal - Diffuse Radiation & Salt Mist'
  },
  alula: {
    key: 'alula',
    nameAr: 'العُلا (أودية الكثبان والجبال)',
    nameEn: 'AlUla (Dunes & Sandstone Canyons)',
    lat: 26.6176,
    lng: 37.9234,
    altitudeM: 700,
    avgTempC: 36,
    climateAr: 'أودية صحراوية صخرية - تباين حراري شاسع',
    climateEn: 'Desert Canyon - High Thermal Diurnal Swing'
  },
  abha: {
    key: 'abha',
    nameAr: 'أبها (مرتفعات جبال عسير)',
    nameEn: 'Abha (Asir Mountain Highlands)',
    lat: 18.2164,
    lng: 42.5053,
    altitudeM: 2270,
    avgTempC: 22,
    climateAr: 'جبلي معتدل - ضباب موسمي ورياح صاعدة',
    climateEn: 'Temperate Highland - Seasonal Mist & Updrafts'
  }
};

export interface SolarState {
  timeHours: number;           // 6 to 18
  solarAltitudeDeg: number;    // 0 to 90
  solarAzimuthDeg: number;     // 0 to 360
  directNormalIrradianceW: number; // W/m2
  daylightLux: number;
  sunPositionVector: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  skyTopColor: THREE.Color;
  skyBottomColor: THREE.Color;
  shadingEfficiencyPct: number;
}

export class SolarPathSimulator {
  public calculate(cityKey: CityKey, timeHours: number): SolarState {
    const city = CITIES_DATA[cityKey];
    const latRad = THREE.MathUtils.degToRad(city.lat);

    // Approximate solar declination for spring/summer equinox (~15 degrees)
    const declinationDeg = 15.0;
    const decRad = THREE.MathUtils.degToRad(declinationDeg);

    // Solar hour angle (-90 deg at 06:00, 0 at 12:00 noon, +90 deg at 18:00)
    const hourAngleDeg = (timeHours - 12.0) * 15.0;
    const hourAngleRad = THREE.MathUtils.degToRad(hourAngleDeg);

    // Solar Elevation / Altitude formula: sin(alt) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(H)
    const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad);
    const altitudeRad = Math.asin(Math.max(0, Math.min(1, sinAlt)));
    const altitudeDeg = THREE.MathUtils.radToDeg(altitudeRad);

    // Solar Azimuth formula: cos(az) = (sin(alt)*sin(lat) - sin(dec)) / (cos(alt)*cos(lat))
    const cosAlt = Math.cos(altitudeRad);
    let azimuthDeg = 180.0;
    if (cosAlt > 0.001) {
      const cosAz = (sinAlt * Math.sin(latRad) - Math.sin(decRad)) / (cosAlt * Math.cos(latRad));
      const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
      const rawAzRad = Math.acos(clampedCosAz);
      azimuthDeg = hourAngleDeg < 0 ? THREE.MathUtils.radToDeg(rawAzRad) : 360.0 - THREE.MathUtils.radToDeg(rawAzRad);
    }

    // Solar position in 3D world space (radius = 60m)
    const sunDistance = 65.0;
    const phi = Math.PI * 0.5 - altitudeRad;
    const theta = THREE.MathUtils.degToRad(azimuthDeg);

    const sunX = sunDistance * Math.sin(phi) * Math.sin(theta);
    const sunY = Math.max(1.5, sunDistance * Math.cos(phi));
    const sunZ = sunDistance * Math.sin(phi) * Math.cos(theta);

    const sunPositionVector = new THREE.Vector3(sunX, sunY, sunZ);

    // Atmospheric extinction & Direct Normal Irradiance (W/m2)
    // High altitude in Abha has 12% higher radiation intensity due to thinner air
    const altitudeMultiplier = 1.0 + (city.altitudeM / 2000.0) * 0.12;
    const airMass = 1.0 / (Math.sin(altitudeRad) + 0.05);
    const dni = Math.round(Math.max(0, 1050 * Math.pow(0.72, airMass) * altitudeMultiplier));
    const daylightLux = Math.round(dni * 105);

    // Shading efficiency (higher when facade intercepts steep sun angles)
    const shadingEfficiencyPct = Math.round(Math.min(96, Math.max(25, 40 + (altitudeDeg / 90.0) * 52)));

    // Colors & Lighting based on sun elevation
    const sunColor = new THREE.Color();
    const skyTopColor = new THREE.Color();
    const skyBottomColor = new THREE.Color();
    let sunIntensity = 1.0;

    if (altitudeDeg < 12) {
      // Golden hour / sunrise / sunset
      sunColor.setRGB(1.0, 0.45, 0.15); // Deep amber
      sunIntensity = 1.8;
      skyTopColor.setRGB(0.08, 0.06, 0.16);
      skyBottomColor.setRGB(0.42, 0.18, 0.08);
    } else if (altitudeDeg < 35) {
      // Warm morning / late afternoon
      sunColor.setRGB(1.0, 0.85, 0.55);
      sunIntensity = 2.4;
      skyTopColor.setRGB(0.03, 0.07, 0.16);
      skyBottomColor.setRGB(0.18, 0.22, 0.32);
    } else {
      // Crisp noon zenith
      sunColor.setRGB(1.0, 0.98, 0.92);
      sunIntensity = 3.2;
      skyTopColor.setRGB(0.02, 0.05, 0.12);
      skyBottomColor.setRGB(0.08, 0.14, 0.24);
    }

    return {
      timeHours,
      solarAltitudeDeg: Math.round(altitudeDeg * 10) / 10,
      solarAzimuthDeg: Math.round(azimuthDeg * 10) / 10,
      directNormalIrradianceW: dni,
      daylightLux,
      sunPositionVector,
      sunColor,
      sunIntensity,
      skyTopColor,
      skyBottomColor,
      shadingEfficiencyPct
    };
  }
}
