import { useCallback, useState } from "react";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export const useToastQueue = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  return {
    toasts,
    pushToast
  };
};
