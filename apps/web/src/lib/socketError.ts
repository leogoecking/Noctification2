const SOCKET_ERROR_COOLDOWN_MS = 4000;
let lastSocketErrorAt = 0;

export const notifySocketErrorOnce = (onError: (message: string) => void, message: string) => {
  const now = Date.now();
  if (now - lastSocketErrorAt < SOCKET_ERROR_COOLDOWN_MS) {
    return;
  }

  lastSocketErrorAt = now;
  onError(message);
};

export const resetSocketErrorStateForTests = () => {
  lastSocketErrorAt = 0;
};
