const RECENT_PLAYBACK_MS = 5000;
const recentPlaybacks = new Map<number, number>();

export const playReminderAlert = (occurrenceId: number): boolean => {
  const lastPlayedAt = recentPlaybacks.get(occurrenceId) ?? 0;
  if (Date.now() - lastPlayedAt < RECENT_PLAYBACK_MS) {
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

    recentPlaybacks.set(occurrenceId, Date.now());
    return true;
  } catch {
    return false;
  }
};
