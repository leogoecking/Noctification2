import type { Response } from "express";

interface LoginAttemptState {
  count: number;
  windowStartedAt: number;
  blockedUntil: number | null;
}

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000;

const normalizeClientIp = (ip: string | undefined): string => {
  if (!ip) {
    return "unknown";
  }

  const trimmed = ip.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
};

const buildAttemptKey = (login: string, ip: string | undefined): string => {
  return `${normalizeClientIp(ip)}:${login.toLowerCase()}`;
};

const cleanupExpiredAttempts = (attempts: Map<string, LoginAttemptState>, now: number): void => {
  for (const [key, state] of attempts) {
    const isBlocked = state.blockedUntil !== null && state.blockedUntil > now;
    const isWindowAlive = now - state.windowStartedAt <= LOGIN_ATTEMPT_WINDOW_MS;

    if (!isBlocked && !isWindowAlive) {
      attempts.delete(key);
    }
  }
};

const getBlockedUntil = (
  attempts: Map<string, LoginAttemptState>,
  key: string,
  now: number
): number | null => {
  const state = attempts.get(key);
  if (!state) {
    return null;
  }

  if (state.blockedUntil !== null && state.blockedUntil > now) {
    return state.blockedUntil;
  }

  if (now - state.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
  }

  return null;
};

const registerFailedAttempt = (
  attempts: Map<string, LoginAttemptState>,
  key: string,
  now: number
): LoginAttemptState => {
  const current = attempts.get(key);

  if (!current || now - current.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    const freshState: LoginAttemptState = {
      count: 1,
      windowStartedAt: now,
      blockedUntil: null
    };
    attempts.set(key, freshState);
    return freshState;
  }

  const nextCount = current.count + 1;
  const shouldBlock = nextCount > MAX_FAILED_LOGIN_ATTEMPTS;
  const nextState: LoginAttemptState = {
    count: nextCount,
    windowStartedAt: current.windowStartedAt,
    blockedUntil: shouldBlock ? now + LOGIN_BLOCK_DURATION_MS : current.blockedUntil
  };

  attempts.set(key, nextState);
  return nextState;
};

const clearFailedAttempts = (attempts: Map<string, LoginAttemptState>, key: string): void => {
  attempts.delete(key);
};

export const respondRateLimited = (res: Response, blockedUntil: number): void => {
  const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({ error: "Muitas tentativas de login. Tente novamente em alguns minutos." });
};

export const createLoginAttemptTracker = () => {
  const attempts = new Map<string, LoginAttemptState>();

  const getAttemptKey = (login: string, ip: string | undefined): string => {
    const now = Date.now();
    cleanupExpiredAttempts(attempts, now);
    return buildAttemptKey(login, ip);
  };

  return {
    getAttemptKey,
    getBlockedUntil: (key: string, now: number) => getBlockedUntil(attempts, key, now),
    registerFailedAttempt: (key: string, now: number) => registerFailedAttempt(attempts, key, now),
    clearFailedAttempts: (key: string) => clearFailedAttempts(attempts, key)
  };
};
