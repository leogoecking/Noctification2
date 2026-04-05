import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { playCustomAudio, playNotificationPreset } from "../lib/reminderAudio";
import {
  DEFAULT_SOUNDS,
  soundPrefsFromApi,
  soundPrefsToApi,
  type CustomAudioEntry,
  type SoundPrefsState,
  type SoundPresetName,
} from "../lib/notificationSoundPrefs";
import type { NotificationPriority } from "../types";

const SETTINGS_KEY = "notification_sound_prefs";
const PERSIST_DEBOUNCE_MS = 1000;

export interface NotificationSoundPrefsHandle {
  prefs: SoundPrefsState;
  toggleMaster: () => void;
  setSound: (priority: NotificationPriority, preset: SoundPresetName) => void;
  setCustom: (priority: NotificationPriority, entry: CustomAudioEntry) => void;
  removeCustom: (priority: NotificationPriority) => void;
  playSoundForPriority: (priority: NotificationPriority) => void;
}

export const useNotificationSoundPrefs = (): NotificationSoundPrefsHandle => {
  const [prefs, setPrefs] = useState<SoundPrefsState>({
    masterOn: true,
    sounds: { ...DEFAULT_SOUNDS },
    customAudios: {},
  });

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPrefs = useRef(prefs);
  latestPrefs.current = prefs;

  useEffect(() => {
    let cancelled = false;
    void api.getMySettings(SETTINGS_KEY).then((res) => {
      if (!cancelled) {
        setPrefs(soundPrefsFromApi(res.value));
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const schedulePersist = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void api.updateMySettings(SETTINGS_KEY, soundPrefsToApi(latestPrefs.current)).catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  const toggleMaster = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, masterOn: !prev.masterOn };
      latestPrefs.current = next;
      schedulePersist();
      return next;
    });
  }, [schedulePersist]);

  const setSound = useCallback((priority: NotificationPriority, preset: SoundPresetName) => {
    setPrefs((prev) => {
      const next = { ...prev, sounds: { ...prev.sounds, [priority]: preset } };
      latestPrefs.current = next;
      schedulePersist();
      return next;
    });
  }, [schedulePersist]);

  const setCustom = useCallback((priority: NotificationPriority, entry: CustomAudioEntry) => {
    setPrefs((prev) => {
      const old = prev.customAudios[priority];
      if (old?.url) URL.revokeObjectURL(old.url);
      return { ...prev, customAudios: { ...prev.customAudios, [priority]: entry } };
    });
  }, []);

  const removeCustom = useCallback((priority: NotificationPriority) => {
    setPrefs((prev) => {
      const old = prev.customAudios[priority];
      if (old?.url) URL.revokeObjectURL(old.url);
      const next = { ...prev.customAudios };
      delete next[priority];
      return { ...prev, customAudios: next };
    });
  }, []);

  const playSoundForPriority = useCallback((priority: NotificationPriority) => {
    const current = latestPrefs.current;
    if (!current.masterOn) return;
    const custom = current.customAudios[priority];
    if (custom?.url) {
      playCustomAudio(custom.url);
    } else {
      playNotificationPreset(current.sounds[priority]);
    }
  }, []);

  return { prefs, toggleMaster, setSound, setCustom, removeCustom, playSoundForPriority };
};
