import { useRef, useState } from "react";
import { playCustomAudio, playNotificationPreset } from "../../lib/reminderAudio";
import {
  PRIORITY_LABELS,
  SOUND_OPTIONS,
  type CustomAudioEntry,
  type SoundPrefsState,
  type SoundPresetName,
} from "../../lib/notificationSoundPrefs";
import type { NotificationPriority } from "../../types";

const PRIORITIES: NotificationPriority[] = ["critical", "high", "normal", "low"];

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav"];
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

interface SoundConfigPanelProps {
  prefs: SoundPrefsState;
  onToggleMaster: () => void;
  onSetSound: (priority: NotificationPriority, preset: SoundPresetName) => void;
  onSetCustom: (priority: NotificationPriority, entry: CustomAudioEntry) => void;
  onRemoveCustom: (priority: NotificationPriority) => void;
}

export const SoundConfigPanel = ({
  prefs,
  onToggleMaster,
  onSetSound,
  onSetCustom,
  onRemoveCustom,
}: SoundConfigPanelProps) => {
  const [playing, setPlaying] = useState<NotificationPriority | null>(null);
  const [dragOver, setDragOver] = useState<NotificationPriority | null>(null);
  const fileRefs = useRef<Partial<Record<NotificationPriority, HTMLInputElement>>>({});

  const handlePlay = (priority: NotificationPriority) => {
    if (!prefs.masterOn) return;
    const custom = prefs.customAudios[priority];
    if (custom?.url) playCustomAudio(custom.url);
    else playNotificationPreset(prefs.sounds[priority]);
    setPlaying(priority);
    setTimeout(() => setPlaying(null), 900);
  };

  const handleFile = (priority: NotificationPriority, file: File | null | undefined) => {
    if (!file) return;
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !/\.(mp3|wav|ogg)$/i.test(file.name)) {
      alert("Formato não suportado. Use MP3, WAV ou OGG.");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      alert("Arquivo muito grande. Máximo 2 MB.");
      return;
    }
    onSetCustom(priority, { name: file.name, url: URL.createObjectURL(file) });
  };

  return (
    <div className="border-t border-outlineSoft/50 bg-panel">
      {/* Header com master toggle */}
      <div className="flex items-center gap-2 border-b border-outlineSoft/50 px-4 py-2.5">
        <span className="text-xs font-medium text-textMain">Sons por prioridade</span>
        <button
          onClick={onToggleMaster}
          className="ml-auto flex items-center gap-2"
          aria-label={prefs.masterOn ? "Desativar sons" : "Ativar sons"}
        >
          <div
            className={`relative h-4 w-7 rounded-full transition-colors ${prefs.masterOn ? "bg-success" : "bg-outlineSoft"}`}
          >
            <div
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${prefs.masterOn ? "translate-x-3" : "translate-x-0.5"}`}
            />
          </div>
          <span className="text-xs text-textMuted">{prefs.masterOn ? "Ativo" : "Silencioso"}</span>
        </button>
      </div>

      {PRIORITIES.map((priority) => {
        const custom = prefs.customAudios[priority];
        const isPlaying = playing === priority;
        const isDragging = dragOver === priority;
        const isSilent = !custom && prefs.sounds[priority] === "Silêncio";

        return (
          <div
            key={priority}
            className={`border-b border-outlineSoft/50 last:border-0 ${prefs.masterOn ? "" : "opacity-50"}`}
          >
            {/* Linha principal */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-xs text-textMuted">
                {PRIORITY_LABELS[priority]}
              </span>

              {custom ? (
                <div className="flex max-w-[140px] items-center gap-1.5 rounded-lg border border-outlineSoft/60 bg-panelAlt px-2 py-1 text-xs text-textMuted">
                  <span className="flex-1 truncate" title={custom.name}>
                    ♪ {custom.name}
                  </span>
                  <button
                    onClick={() => onRemoveCustom(priority)}
                    className="shrink-0 text-textMuted hover:text-danger"
                    aria-label="Remover toque personalizado"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <select
                  disabled={!prefs.masterOn}
                  value={prefs.sounds[priority]}
                  onChange={(e) => onSetSound(priority, e.target.value as SoundPresetName)}
                  className="rounded-lg border border-outlineSoft/60 bg-panelAlt px-2 py-1 text-xs text-textMain"
                >
                  {SOUND_OPTIONS[priority].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              <button
                disabled={!prefs.masterOn || isSilent}
                onClick={() => handlePlay(priority)}
                aria-label="Testar som"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-outlineSoft/60 bg-panelAlt text-xs text-textMuted transition hover:bg-surfaceHigh disabled:cursor-default disabled:opacity-40"
              >
                {isPlaying ? "🔊" : "▶"}
              </button>
            </div>

            {/* Área de upload */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(priority); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                if (prefs.masterOn) handleFile(priority, e.dataTransfer.files[0]);
              }}
              onClick={() => prefs.masterOn && fileRefs.current[priority]?.click()}
              className={`mx-4 mb-2.5 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs transition ${
                isDragging
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-outlineSoft/60 bg-panelAlt text-textMuted hover:border-outlineSoft"
              } ${!prefs.masterOn ? "pointer-events-none opacity-40" : ""}`}
            >
              <span>♪</span>
              <span className="flex-1">
                {isDragging
                  ? "Solte o arquivo aqui"
                  : custom
                    ? `Trocar: ${custom.name}`
                    : "Toque personalizado — clique ou arraste (MP3, WAV, OGG · máx 2 MB)"}
              </span>
              {custom && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveCustom(priority); }}
                  className="text-textMuted hover:text-danger"
                >
                  Remover
                </button>
              )}
            </div>

            <input
              ref={(el) => { if (el) fileRefs.current[priority] = el; }}
              type="file"
              accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
              className="hidden"
              onChange={(e) => {
                handleFile(priority, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
