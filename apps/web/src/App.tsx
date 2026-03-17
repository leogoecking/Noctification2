import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { UserDashboard } from "./components/UserDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { NotificationAlertCenter } from "./components/NotificationAlertCenter";
import { ReminderUserPanel } from "./components/ReminderUserPanel";
import { ReminderAlertCenter } from "./components/ReminderAlertCenter";
import { useNotificationSocket } from "./hooks/useNotificationSocket";
import { primeReminderAudio } from "./lib/reminderAudio";
import type { AuthUser } from "./types";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

type AppPath = "/" | "/login" | "/admin/login" | "/notifications" | "/reminders";

const normalizePath = (rawPath: string): AppPath => {
  if (rawPath === "/login") {
    return "/login";
  }

  if (rawPath === "/admin/login") {
    return "/admin/login";
  }

  if (rawPath === "/notifications") {
    return "/notifications";
  }

  if (rawPath === "/reminders") {
    return "/reminders";
  }

  return "/";
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentPath, setCurrentPath] = useState<AppPath>(normalizePath(window.location.pathname));

  const navigate = useCallback((path: AppPath, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }

    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await api.me();
      setCurrentUser(response.user as AuthUser);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    primeReminderAudio();
  }, []);

  useEffect(() => {
    if (loadingSession) {
      return;
    }

    if (!currentUser) {
      if (currentPath !== "/login" && currentPath !== "/admin/login") {
        navigate("/login", true);
      }
      return;
    }

    if (currentUser.role === "admin") {
      if (currentPath !== "/") {
        navigate("/", true);
      }
      return;
    }

    if (currentUser.role === "user" && currentPath === "/admin/login") {
      navigate("/", true);
    }
  }, [currentPath, currentUser, loadingSession, navigate]);

  const login = useCallback(
    async (loginValue: string, password: string, expectedRole: AuthUser["role"]) => {
      setSubmittingAuth(true);

      try {
        const response = await api.login(loginValue, password, expectedRole);
        const user = response.user as AuthUser;

        if (user.role !== expectedRole) {
          try {
            await api.logout();
          } catch {
            // Best-effort cleanup for older API behavior that accepted the session.
          }

          setCurrentUser(null);
          throw new ApiError(
            expectedRole === "admin"
              ? "Use /login para acesso de usuario"
              : "Use /admin/login para acesso administrativo",
            403
          );
        }

        setCurrentUser(user);
        navigate("/", true);
        pushToast("Login realizado com sucesso", "ok");
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Falha no login";
        pushToast(message, "error");
      } finally {
        setSubmittingAuth(false);
      }
    },
    [navigate, pushToast]
  );

  const register = useCallback(
    async (name: string, loginValue: string, password: string) => {
      setSubmittingAuth(true);

      try {
        const response = await api.register(name, loginValue, password);
        setCurrentUser(response.user as AuthUser);
        navigate("/", true);
        pushToast("Conta criada com sucesso", "ok");
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Falha ao criar conta";
        pushToast(message, "error");
      } finally {
        setSubmittingAuth(false);
      }
    },
    [navigate, pushToast]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      navigate("/login", true);
      pushToast("Sessao encerrada", "ok");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao sair";
      pushToast(message, "error");
    }
  }, [navigate, pushToast]);

  const handleErrorToast = useCallback(
    (message: string) => {
      pushToast(message, "error");
    },
    [pushToast]
  );

  const handleOkToast = useCallback(
    (message: string) => {
      pushToast(message, "ok");
    },
    [pushToast]
  );

  const pageTitle = useMemo(() => {
    if (!currentUser) {
      return currentPath === "/admin/login" ? "Console Administrativo" : "Acesso de Usuario";
    }

    if (currentUser.role === "admin") {
      return "Console Administrativo";
    }

    if (currentPath === "/notifications") {
      return "Todas as Notificacoes";
    }

    if (currentPath === "/reminders") {
      return "Lembretes";
    }

    return "Painel Operacional";
  }, [currentPath, currentUser]);

  useNotificationSocket({
    enabled: currentUser?.role === "user",
    onError: handleErrorToast
  });

  return (
    <main className="min-h-screen bg-canvas text-textMain">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Plataforma interna</p>
            <h1 className="font-display text-2xl text-textMain">{pageTitle}</h1>
          </div>

          {!currentUser && (
            <div className="flex items-center gap-2">
              <button
                className={`rounded-xl px-3 py-2 text-sm ${currentPath === "/login" ? "bg-accent text-slate-900" : "border border-slate-600 text-textMuted"}`}
                onClick={() => navigate("/login")}
              >
                /login
              </button>
              <button
                className={`rounded-xl px-3 py-2 text-sm ${currentPath === "/admin/login" ? "bg-accent text-slate-900" : "border border-slate-600 text-textMuted"}`}
                onClick={() => navigate("/admin/login")}
              >
                /admin/login
              </button>
            </div>
          )}

          {currentUser && (
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-slate-700 bg-panel px-3 py-2 text-sm text-textMuted">
                {currentUser.name} ({currentUser.role})
              </span>
              <button className="rounded-xl bg-danger px-3 py-2 text-sm font-semibold text-white" onClick={logout}>
                Sair
              </button>
            </div>
          )}
        </header>

        {loadingSession && <p className="text-sm text-textMuted">Carregando sessao...</p>}

        {!loadingSession && !currentUser && currentPath === "/login" && (
          <LoginScreen
            mode="user"
            onLogin={(loginValue, password) => login(loginValue, password, "user")}
            onRegister={register}
            isLoading={submittingAuth}
          />
        )}

        {!loadingSession && !currentUser && currentPath === "/admin/login" && (
          <LoginScreen
            mode="admin"
            onLogin={(loginValue, password) => login(loginValue, password, "admin")}
            isLoading={submittingAuth}
          />
        )}

        {!loadingSession && currentUser?.role === "user" && (
          <>
            <nav className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-panel p-2">
              <button
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  currentPath === "/"
                    ? "bg-accent text-slate-900"
                    : "text-textMuted hover:bg-panelAlt hover:text-textMain"
                }`}
                onClick={() => navigate("/")}
                type="button"
              >
                Painel
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  currentPath === "/notifications"
                    ? "bg-accent text-slate-900"
                    : "text-textMuted hover:bg-panelAlt hover:text-textMain"
                }`}
                onClick={() => navigate("/notifications")}
                type="button"
              >
                Notificacoes
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  currentPath === "/reminders"
                    ? "bg-accent text-slate-900"
                    : "text-textMuted hover:bg-panelAlt hover:text-textMain"
                }`}
                onClick={() => navigate("/reminders")}
                type="button"
              >
                Lembretes
              </button>
            </nav>

            <NotificationAlertCenter
              isVisible
              onError={handleErrorToast}
              onToast={handleOkToast}
              onOpenNotifications={() => navigate("/notifications")}
            />

            <ReminderAlertCenter
              isVisible
              onError={handleErrorToast}
              onToast={handleOkToast}
              onOpenReminders={() => navigate("/reminders")}
            />

            {currentPath === "/reminders" ? (
              <ReminderUserPanel onError={handleErrorToast} onToast={handleOkToast} />
            ) : (
              <UserDashboard
                user={currentUser}
                isNotificationsPage={currentPath === "/notifications"}
                onOpenAllNotifications={() => navigate("/notifications")}
                onBackToDashboard={() => navigate("/")}
                onError={handleErrorToast}
                onToast={handleOkToast}
              />
            )}
          </>
        )}

        {!loadingSession && currentUser?.role === "admin" && (
          <AdminDashboard onError={handleErrorToast} onToast={handleOkToast} />
        )}
      </div>

      <aside className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-80 animate-rise-in rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.tone === "ok"
                ? "border-success/40 bg-success/20 text-green-100"
                : "border-danger/40 bg-danger/20 text-red-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </aside>
    </main>
  );
}
