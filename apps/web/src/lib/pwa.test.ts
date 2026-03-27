import { describe, expect, it, vi } from "vitest";
import {
  canRegisterServiceWorker,
  registerAppServiceWorker,
  type ServiceWorkerLike
} from "./pwa";

describe("pwa", () => {
  it("permite service worker em https", () => {
    expect(
      canRegisterServiceWorker({
        protocol: "https:",
        hostname: "noctification.lan",
        isSecureContext: true
      })
    ).toBe(true);
  });

  it("permite service worker em localhost http", () => {
    expect(
      canRegisterServiceWorker({
        protocol: "http:",
        hostname: "localhost",
        isSecureContext: false
      })
    ).toBe(true);
  });

  it("bloqueia registro em http fora de localhost", () => {
    expect(
      canRegisterServiceWorker({
        protocol: "http:",
        hostname: "192.168.0.12",
        isSecureContext: false
      })
    ).toBe(false);
  });

  it("registra o service worker quando o contexto e compativel", async () => {
    const register = vi.fn(async () => ({ scope: "/" }));

    const result = await registerAppServiceWorker(
      { register } as unknown as ServiceWorkerLike,
      {
        protocol: "https:",
        hostname: "noctification.lan",
        isSecureContext: true
      }
    );

    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(result.status).toBe("registered");
  });
});
