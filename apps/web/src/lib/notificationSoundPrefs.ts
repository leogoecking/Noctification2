import type { NotificationPriority } from "../types";

export type SoundPresetName =
  | "Alerta alto"
  | "Sino duplo"
  | "Sino único"
  | "Sino triplo"
  | "Pop suave"
  | "Beep"
  | "Silêncio";

export interface CustomAudioEntry {
  name: string;
  url: string; // blob URL — ephemeral
}

export type SoundsByPriority = Record<NotificationPriority, SoundPresetName>;

export interface SoundPrefsState {
  masterOn: boolean;
  sounds: SoundsByPriority;
  customAudios: Partial<Record<NotificationPriority, CustomAudioEntry>>;
}

export const SOUND_OPTIONS: Record<NotificationPriority, SoundPresetName[]> = {
  critical: ["Alerta alto", "Sino duplo", "Beep", "Silêncio"],
  high:     ["Pop suave",   "Sino único", "Beep", "Silêncio"],
  normal:   ["Sino triplo", "Alerta alto", "Pop suave", "Silêncio"],
  low:      ["Pop suave",   "Sino único", "Silêncio"],
};

export const DEFAULT_SOUNDS: SoundsByPriority = {
  critical: "Alerta alto",
  high:     "Pop suave",
  normal:   "Sino triplo",
  low:      "Pop suave",
};

export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  critical: "Urgente (crítica)",
  high:     "Menção (alta)",
  normal:   "Alarme (normal)",
  low:      "Mural (baixa)",
};

const PRIORITIES: NotificationPriority[] = ["critical", "high", "normal", "low"];

const isSoundPresetName = (v: unknown): v is SoundPresetName =>
  typeof v === "string" &&
  ["Alerta alto", "Sino duplo", "Sino único", "Sino triplo", "Pop suave", "Beep", "Silêncio"].includes(v);

export const soundPrefsFromApi = (raw: unknown): SoundPrefsState => {
  const defaults: SoundPrefsState = {
    masterOn: true,
    sounds: { ...DEFAULT_SOUNDS },
    customAudios: {},
  };

  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Record<string, unknown>;

  const masterOn = typeof obj.masterOn === "boolean" ? obj.masterOn : true;

  const sounds = { ...DEFAULT_SOUNDS };
  if (obj.sounds && typeof obj.sounds === "object") {
    const rawSounds = obj.sounds as Record<string, unknown>;
    for (const priority of PRIORITIES) {
      const candidate = rawSounds[priority];
      if (isSoundPresetName(candidate)) {
        sounds[priority] = candidate;
      }
    }
  }

  return { masterOn, sounds, customAudios: {} };
};

export const soundPrefsToApi = (prefs: SoundPrefsState): unknown => ({
  masterOn: prefs.masterOn,
  sounds: prefs.sounds,
});
