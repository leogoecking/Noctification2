import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  playReminderAlert,
  primeReminderAudio,
  resetReminderAudioStateForTests
} from "./reminderAudio";

class FakeOscillator {
  type = "sine";
  frequency = {
    value: 0,
    setValueAtTime: vi.fn()
  };

  connect(): void {
    // No-op for tests.
  }

  start(): void {
    // No-op for tests.
  }

  stop(): void {
    // No-op for tests.
  }
}

class FakeGainNode {
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn()
  };

  connect(): void {
    // No-op for tests.
  }
}

class FakeAudioContext {
  static instances = 0;
  currentTime = 0;
  destination = {};
  state: "suspended" | "running" | "closed" = "running";

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
    this.state = "closed";
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.state = "running";
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

  it("reproduz audio quando o contexto esta disponivel", async () => {
    await expect(playReminderAlert(10)).resolves.toBe(true);
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("nao tenta reproduzir repetidamente para a mesma ocorrencia em curto intervalo", async () => {
    await expect(playReminderAlert(10)).resolves.toBe(true);
    nowSpy.mockReturnValue(1_500);

    await expect(playReminderAlert(10)).resolves.toBe(true);
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("aplica cooldown global curto entre ocorrencias diferentes para evitar caos sonoro", async () => {
    await expect(playReminderAlert(10)).resolves.toBe(true);
    nowSpy.mockReturnValue(1_500);

    await expect(playReminderAlert(11)).resolves.toBe(true);
    expect(FakeAudioContext.instances).toBe(1);

    nowSpy.mockReturnValue(2_300);
    await expect(playReminderAlert(11)).resolves.toBe(true);
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("retorna falso quando nao existe AudioContext disponivel", async () => {
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

    await expect(playReminderAlert(99)).resolves.toBe(false);
  });

  it("registra o priming do contexto para desbloquear audio apos interacao", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    primeReminderAudio();

    expect(addEventListenerSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function), {
      passive: true
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function), {
      passive: true
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function), {
      passive: true
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
      { passive: true }
    );

    addEventListenerSpy.mockRestore();
  });

  it("aceita perfil retry e critical sem quebrar a reproducao", async () => {
    await expect(playReminderAlert(20, "retry")).resolves.toBe(true);
    nowSpy.mockReturnValue(3_000);
    await expect(playReminderAlert(21, "critical")).resolves.toBe(true);
    expect(FakeAudioContext.instances).toBe(1);
  });
});
