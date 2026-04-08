import { useEffect, useState } from "react";

export interface DayForecast {
  label: string; // "Amanhã", "Sex", etc.
  weatherCode: number;
  max: number;
  min: number;
}

export interface WeatherData {
  city: string;
  temperature: number;
  weatherCode: number;
  forecast: [DayForecast, DayForecast]; // próximos 2 dias
}

// Cidades configuráveis — altere name/lat/lon conforme necessário
const CITIES = [
  { name: "Teixeira de Freitas", lat: -17.5369, lon: -39.7428 },
  { name: "Nanuque", lat: -17.8397, lon: -40.3536 },
  { name: "Prado", lat: -17.3408, lon: -39.2208 },
];

const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Bug 3 corrigido: removido parâmetro "offset" enganoso;
// "Amanhã" é decidido pelo chamador passando a string literal.
function isoDateToDayAbbr(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return DAY_ABBR[d.getDay()];
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

let cache: { data: WeatherData[]; timestamp: number } | null = null;

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

async function fetchCity(city: (typeof CITIES)[number]): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: "3",
    timezone: "America/Sao_Paulo",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as OpenMeteoResponse;

  return {
    city: city.name,
    temperature: Math.round(json.current.temperature_2m),
    weatherCode: json.current.weather_code,
    forecast: [
      {
        label: "Amanhã",
        weatherCode: json.daily.weather_code[1],
        max: Math.round(json.daily.temperature_2m_max[1]),
        min: Math.round(json.daily.temperature_2m_min[1]),
      },
      {
        label: isoDateToDayAbbr(json.daily.time[2]),
        weatherCode: json.daily.weather_code[2],
        max: Math.round(json.daily.temperature_2m_max[2]),
        min: Math.round(json.daily.temperature_2m_min[2]),
      },
    ],
  };
}

export function useWeatherWidget() {
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
        setData(cache.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Bug 2 corrigido: Promise.allSettled — cidades que falharem são ignoradas
      // individualmente; o widget exibe as que obtiveram resposta.
      const settled = await Promise.allSettled(CITIES.map(fetchCity));

      if (cancelled) return;

      const results = settled
        .filter((r): r is PromiseFulfilledResult<WeatherData> => r.status === "fulfilled")
        .map((r) => r.value);

      if (results.length === 0) {
        setError("Não foi possível carregar a previsão");
      } else {
        cache = { data: results, timestamp: Date.now() };
        setData(results);
        if (results.length < CITIES.length) {
          setError("Algumas cidades não puderam ser carregadas");
        } else {
          setError(null);
        }
      }

      setLoading(false);
    }

    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  // Bug 1 corrigido: limpa o cache antes de incrementar fetchKey,
  // garantindo que o botão "↻" sempre busca dados frescos.
  function refetch() {
    cache = null;
    setFetchKey((k) => k + 1);
  }

  return { data, loading, error, refetch };
}
