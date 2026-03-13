const RECENT_PLAYBACK_MS = 5000;
const GLOBAL_PLAYBACK_GAP_MS = 1200;
const recentPlaybacks = new Map<number, number>();
let lastGlobalPlaybackAt = 0;

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

export const playReminderAlert = (occurrenceId: number): boolean => {
  const now = Date.now();
  if (!canPlayForOccurrence(occurrenceId, now)) {
    return true;
  }

  const AudioCtor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtor) {
    return false;
  }

  try {
    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.value = 920;
    gainNode.gain.value = 0.05;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
    oscillator.onended = () => {
      void context.close();
    };

    recentPlaybacks.set(occurrenceId, now);
    lastGlobalPlaybackAt = now;
    return true;
  } catch {
    return false;
  }
};

export const resetReminderAudioStateForTests = () => {
  recentPlaybacks.clear();
  lastGlobalPlaybackAt = 0;
};
