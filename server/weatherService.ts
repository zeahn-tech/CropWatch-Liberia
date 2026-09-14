import { WeatherContext } from '../src/types.js';

// Coordinates for Liberian county seats
const LIBERIA_COUNTY_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  Bong: { lat: 6.9942, lon: -9.5855, name: 'Gbarnga / Suakoko' },
  Montserrado: { lat: 6.3005, lon: -10.7969, name: 'Monrovia' },
  Nimba: { lat: 7.2767, lon: -8.7183, name: 'Sanniquellie / Ganta' },
  Lofa: { lat: 8.4219, lon: -9.7478, name: 'Voinjama' },
  Margibi: { lat: 6.5167, lon: -10.35, name: 'Kakata' },
  'Grand Bassa': { lat: 5.8814, lon: -10.0447, name: 'Buchanan' },
  Sinoe: { lat: 5.0, lon: -9.0, name: 'Greenville' },
  Maryland: { lat: 4.375, lon: -7.7169, name: 'Harper' },
};

interface WeatherCacheEntry {
  weather: WeatherContext;
  expiresAt: number;
}

const weatherCache: Record<string, WeatherCacheEntry> = {};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function getCountyWeather(county: string): Promise<WeatherContext> {
  const normalizedCounty = Object.keys(LIBERIA_COUNTY_COORDINATES).find(
    (c) => c.toLowerCase() === (county || 'Bong').toLowerCase()
  ) || 'Bong';

  const cacheKey = normalizedCounty.toLowerCase();
  const cached = weatherCache[cacheKey];
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`🌤️ Weather Cache HIT for ${normalizedCounty} (Expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
    return cached.weather;
  }

  const coords = LIBERIA_COUNTY_COORDINATES[normalizedCounty];

  try {
    // Open-Meteo free agro-weather endpoint (no API key needed)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=Africa/Monrovia`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // quick timeout

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      const tempC = Math.round(data.current?.temperature_2m ?? 28);
      const humidity = Math.round(data.current?.relative_humidity_2m ?? 85);
      const rain24hMm = Number((data.daily?.precipitation_sum?.[0] ?? 14.5).toFixed(1));

      const weatherResult = buildWeatherContext(normalizedCounty, tempC, humidity, rain24hMm);
      weatherCache[cacheKey] = {
        weather: weatherResult,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return weatherResult;
    }
  } catch (err) {
    // Graceful fallback to seasonal tropical baseline
  }

  // Climatological default for wet season in Liberia
  const fallbackWeather = buildWeatherContext(normalizedCounty, 28, 86, 18.2);
  weatherCache[cacheKey] = {
    weather: fallbackWeather,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return fallbackWeather;
}

function buildWeatherContext(county: string, tempC: number, humidity: number, rain24hMm: number): WeatherContext {
  const isHighRain = rain24hMm > 15;
  const isHighHumidity = humidity > 80;

  const fungalRisk: 'low' | 'moderate' | 'high' = isHighRain && isHighHumidity ? 'high' : isHighHumidity ? 'moderate' : 'low';
  const droughtRisk: 'low' | 'moderate' | 'high' = rain24hMm < 2 && tempC > 31 ? 'high' : 'low';

  let agroAdvisory = 'Normal seasonal conditions. Continue routine field weeding and plot drainage inspection.';
  if (fungalRisk === 'high') {
    agroAdvisory = 'Heavy precipitation and high humidity elevate fungal pathogen pressure (Rice Blast & Cassava Leaf Spot). Maintain good ridge spacing and ensure field drainage channels are clear.';
  } else if (droughtRisk === 'high') {
    agroAdvisory = 'Dry spell detected. Prioritize water conservation for young seedlings and apply organic mulch to soil beds.';
  }

  return {
    county,
    temperatureC: tempC,
    relativeHumidity: humidity,
    rainfall24hMm: rain24hMm,
    forecastSummary: `${tempC}°C, ${humidity}% humidity with ${rain24hMm}mm expected 24h precipitation in ${county} County.`,
    agroAdvisory,
    fungalRiskLevel: fungalRisk,
    droughtRiskLevel: droughtRisk,
  };
}
