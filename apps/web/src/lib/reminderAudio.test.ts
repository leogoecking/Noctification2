import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playReminderAlert, resetReminderAudioStateForTests } from "./reminderAudio";

class FakeOscillator {
  type = "sine";
  frequency = { value: 0 };
  onended: (() => void) | null = null;

  connect(): void {
    // No-op for tests.
  }

  start(): void {
    // No-op for tests.
  }

  stop(): void {
    this.onended?.();
  }
}

class FakeGainNode {
  gain = { value: 0 };

  connect(): void {
    // No-op for tests.
  }
}

class FakeAudioContext {
  static instances = 0;
  currentTime = 0;
  destination = {};

  constructor() {
    FakeAudioContext.instances += 1;
  }

  createOscillator(): FakeOscillator {
    return new FakeOscillator();
  }

  createGain(): FakeGainNode {
    return new FakeGainNode();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

describe("reminderAudio", () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = (
    window as typeof window & { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext;
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetReminderAudioStateForTests();
    FakeAudioContext.instances = 0;
    nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      writable: true,
      value: FakeAudioContext as unknown as typeof AudioContext
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      writable: true,
      value: undefined
    });
  });

  afterEach(() => {
    nowSpy.mockRestore();
    resetReminderAudioStateForTests();
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      writable: true,
      value: originalAudioContext
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      writable: true,
      value: originalWebkitAudioContext
    });
  });

  it("reproduz audio quando o contexto esta disponivel", () => {
    expect(playReminderAlert(10)).toBe(true);
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("nao tenta reproduzir repetidamente para a mesma ocorrencia em curto intervalo", () => {
    expect(playReminderAlert(10)).toBe(true);
    nowSpy.mockReturnValue(1_500);

    expect(playReminderAlert(10)).toBe(true);
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("aplica cooldown global curto entre ocorrencias diferentes para evitar caos sonoro", () => {
    expect(playReminderAlert(10)).toBe(true);
    nowSpy.mockReturnValue(1_500);

    expect(playReminderAlert(11)).toBe(true);
    expect(FakeAudioContext.instances).toBe(1);

    nowSpy.mockReturnValue(2_300);
    expect(playReminderAlert(11)).toBe(true);
    expect(FakeAudioContext.instances).toBe(2);
  });

  it("retorna falso quando nao existe AudioContext disponivel", () => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      writable: true,
      value: undefined
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      writable: true,
      value: undefined
    });

    expect(playReminderAlert(99)).toBe(false);
  });
});
