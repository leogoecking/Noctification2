import { describe, expect, it } from "vitest";
import { resolveRuntimeApiBase, resolveRuntimeSocketUrl } from "./runtimeUrls";

describe("runtimeUrls", () => {
  it("keeps the direct API port while running on the Vite dev server", () => {
    expect(
      resolveRuntimeApiBase(undefined, {
        protocol: "http:",
        hostname: "192.168.0.10",
        port: "5173",
        origin: "http://192.168.0.10:5173"
      })
    ).toBe("http://192.168.0.10:4000/api/v1");

    expect(
      resolveRuntimeSocketUrl(undefined, {
        protocol: "http:",
        hostname: "192.168.0.10",
        port: "5173",
        origin: "http://192.168.0.10:5173"
      })
    ).toBe("http://192.168.0.10:4000");
  });

  it("uses same-origin paths behind nginx when no explicit env is set", () => {
    expect(
      resolveRuntimeApiBase(undefined, {
        protocol: "https:",
        hostname: "app.example.com",
        port: "",
        origin: "https://app.example.com"
      })
    ).toBe("https://app.example.com/api/v1");

    expect(
      resolveRuntimeSocketUrl(undefined, {
        protocol: "https:",
        hostname: "app.example.com",
        port: "",
        origin: "https://app.example.com"
      })
    ).toBe("https://app.example.com");
  });

  it("rewrites localhost env values to the current host when opened remotely", () => {
    expect(
      resolveRuntimeApiBase("http://127.0.0.1:4000/api/v1", {
        protocol: "http:",
        hostname: "10.0.0.20",
        port: "",
        origin: "http://10.0.0.20"
      })
    ).toBe("http://10.0.0.20:4000/api/v1");

    expect(
      resolveRuntimeSocketUrl("http://localhost:4000", {
        protocol: "http:",
        hostname: "10.0.0.20",
        port: "",
        origin: "http://10.0.0.20"
      })
    ).toBe("http://10.0.0.20:4000/");
  });

  it("rewrites ipv6 loopback env values to the current host when opened remotely", () => {
    expect(
      resolveRuntimeApiBase("http://[::1]:4000/api/v1", {
        protocol: "http:",
        hostname: "10.0.0.20",
        port: "",
        origin: "http://10.0.0.20"
      })
    ).toBe("http://10.0.0.20:4000/api/v1");

    expect(
      resolveRuntimeSocketUrl("http://[::1]:4000", {
        protocol: "http:",
        hostname: "10.0.0.20",
        port: "",
        origin: "http://10.0.0.20"
      })
    ).toBe("http://10.0.0.20:4000/");
  });
});
