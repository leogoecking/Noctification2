import { useWeatherWidget, type WeatherData } from "../hooks/useWeatherWidget";

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 99) return "⛈️";
  return "❓";
}

function CityEntry({ city, last }: { city: WeatherData; last: boolean }) {
  return (
    <div className={last ? "" : "border-b border-outlineSoft pb-3"}>
      {/* Cidade + temp atual */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none">{weatherIcon(city.weatherCode)}</span>
          <span className="truncate text-xs font-semibold text-textMain">{city.city}</span>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-textMain">
          {city.temperature}°C
        </span>
      </div>

      {/* Previsão dos próximos 2 dias */}
      <div className="mt-1.5 flex gap-3">
        {city.forecast.map((day) => (
          <div key={day.label} className="flex items-center gap-1 text-[11px] text-textMuted">
            <span className="font-medium">{day.label}</span>
            <span className="leading-none">{weatherIcon(day.weatherCode)}</span>
            <span className="tabular-nums">
              <span className="text-textMain">{day.max}°</span>/{day.min}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const WeatherWidget = () => {
  const { data, loading, error, refetch } = useWeatherWidget();

  return (
    <aside className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
          Previsão do tempo
        </p>
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="text-[10px] text-textMuted transition-colors hover:text-textMain disabled:opacity-40"
          title="Atualizar"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-panelAlt" />
              <div className="h-3 w-full animate-pulse rounded bg-panelAlt" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((city, i) => (
            <CityEntry key={city.city} city={city} last={i === data.length - 1} />
          ))}
        </div>
      )}
    </aside>
  );
};
