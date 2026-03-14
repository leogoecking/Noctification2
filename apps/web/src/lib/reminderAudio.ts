const RECENT_PLAYBACK_MS = 5000;
const GLOBAL_PLAYBACK_GAP_MS = 1200;
const recentPlaybacks = new Map<number, number>();
let lastGlobalPlaybackAt = 0;
let sharedAudioContext: AudioContext | null = null;
let unlockListenersRegistered = false;

type AudioContextCtor = typeof AudioContext;
export type ReminderAudioProfile = "default" | "retry" | "critical";

interface ToneStep {
  frequency: number;
  durationMs: number;
  delayMs: number;
  gain: number;
  type: OscillatorType;
}

const AUDIO_PROFILES: Record<ReminderAudioProfile, ToneStep[]> = {
  default: [
    { frequency: 880, durationMs: 180, delayMs: 0, gain: 0.032, type: "triangle" },
    { frequency: 960, durationMs: 200, delayMs: 260, gain: 0.036, type: "triangle" }
  ],
  retry: [{ frequency: 690, durationMs: 320, delayMs: 0, gain: 0.026, type: "sine" }],
  critical: [
    { frequency: 1180, durationMs: 170, delayMs: 0, gain: 0.048, type: "square" },
    { frequency: 1180, durationMs: 170, delayMs: 260, gain: 0.05, type: "square" },
    { frequency: 1260, durationMs: 200, delayMs: 520, gain: 0.055, type: "square" }
  ]
};

const getAudioCtor = (): AudioContextCtor | undefined => {
  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
};

const getOrCreateAudioContext = (): AudioContext | null => {
  if (sharedAudioContext) {
    return sharedAudioContext;
  }

  const AudioCtor = getAudioCtor();
  if (!AudioCtor) {
    return null;
  }

  try {
    sharedAudioContext = new AudioCtor();
    return sharedAudioContext;
  } catch {
    return null;
  }
};

const canPlayForOccurrence = (occurrenceId: number, now: number): boolean => {
  const lastPlayedAt = recentPlaybacks.get(occurrenceId);
  if (lastPlayedAt !== undefined && now - lastPlayedAt < RECENT_PLAYBACK_MS) {
    return false;
  }

  if (lastGlobalPlaybackAt === 0) {
    return true;
  }

  return now - lastGlobalPlaybackAt >= GLOBAL_PLAYBACK_GAP_MS;
};

const markPlayback = (occurrenceId: number, now: number) => {
  recentPlaybacks.set(occurrenceId, now);
  lastGlobalPlaybackAt = now;
};

const warmUpAudioContext = (context: AudioContext) => {
  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 440;
    gainNode.gain.value = 0.00001;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.01);
  } catch {
    // Ignore warm-up failures. Playback will still try normally later.
  }
};

const scheduleToneStep = (context: AudioContext, step: ToneStep) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startAt = context.currentTime + step.delayMs / 1000;
  const endAt = startAt + step.durationMs / 1000;

  oscillator.type = step.type;
  oscillator.frequency.setValueAtTime(step.frequency, startAt);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.linearRampToValueAtTime(step.gain, startAt + 0.02);
  gainNode.gain.setValueAtTime(step.gain, Math.max(startAt + 0.02, endAt - 0.04));
  gainNode.gain.linearRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt);
};

const resumeReminderAudioContext = async (): Promise<AudioContext | null> => {
  const context = getOrCreateAudioContext();
  if (!context) {
    return null;
  }

  if (typeof context.resume === "function" && context.state !== "running") {
    try {
      await context.resume();
    } catch {
      return context;
    }
  }

  return context;
};

export const primeReminderAudio = () => {
  if (typeof window === "undefined" || unlockListenersRegistered) {
    return;
  }

  const unlock = () => {
    void (async () => {
      const context = await resumeReminderAudioContext();
      if (context) {
        warmUpAudioContext(context);
      }
    })();
  };

  const options: AddEventListenerOptions = { passive: true };
  window.addEventListener("pointerdown", unlock, options);
  window.addEventListener("click", unlock, options);
  window.addEventListener("keydown", unlock, options);
  window.addEventListener("touchstart", unlock, options);
  unlockListenersRegistered = true;
};

export const playReminderAlert = async (
  occurrenceId: number,
  profile: ReminderAudioProfile = "default"
): Promise<boolean> => {
  const now = Date.now();
  if (!canPlayForOccurrence(occurrenceId, now)) {
    return true;
  }

  const context = await resumeReminderAudioContext();
  if (!context || context.state === "closed" || context.state === "suspended") {
    return false;
  }

  try {
    for (const step of AUDIO_PROFILES[profile]) {
      scheduleToneStep(context, step);
    }
    markPlayback(occurrenceId, now);
    return true;
  } catch {
    return false;
  }
};

export const resetReminderAudioStateForTests = () => {
  recentPlaybacks.clear();
  lastGlobalPlaybackAt = 0;
  sharedAudioContext = null;
  unlockListenersRegistered = false;
};
