import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { useNotificationSocket } from "./hooks/useNotificationSocket";
import { useWebPushSubscription } from "./hooks/useWebPushSubscription";
import { primeReminderAudio } from "./lib/reminderAudio";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "./lib/featureFlags";
import type { AuthUser } from "./types";
import {
  AppHeader,
  AppToastStack,
  getPageTitle,
  normalizePath,
  UserWorkspace,
  type AppPath
} from "./components/app/appShell";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export default function App() {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentPath, setCurrentPath] = useState<AppPath>(normalizePath(window.location.pathname));
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = window.localStorage.getItem("noctification-theme");
    if (savedTheme === "dark") {
      return true;
    }
    if (savedTheme === "light") {
      return false;
    }
    return typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  });

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
      setCurrentUser(response.user);
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
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("noctification-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

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
      const allowedPaths = new Set<AppPath>(["/"]);
      if (aprModuleEnabled) {
        allowedPaths.add("/apr");
      }
      if (kmlPosteModuleEnabled) {
        allowedPaths.add("/kml-postes");
      }

      if (!allowedPaths.has(currentPath)) {
        navigate("/", true);
      }
      return;
    }

    if (currentUser.role === "user" && currentPath === "/admin/login") {
      navigate("/", true);
      return;
    }

    if (currentUser.role === "user") {
      const allowedPaths = new Set<AppPath>(["/", "/notifications", "/reminders", "/tasks"]);
      if (aprModuleEnabled) {
        allowedPaths.add("/apr");
      }
      if (kmlPosteModuleEnabled) {
        allowedPaths.add("/kml-postes");
      }

      if (!allowedPaths.has(currentPath)) {
        navigate("/", true);
      }
    }
  }, [aprModuleEnabled, currentPath, currentUser, kmlPosteModuleEnabled, loadingSession, navigate]);

  const login = useCallback(
    async (loginValue: string, password: string, expectedRole: AuthUser["role"]) => {
      setSubmittingAuth(true);

      try {
        const response = await api.login(loginValue, password, expectedRole);
        const user = response.user;

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
        setCurrentUser(response.user);
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

  const pageTitle = useMemo(() => getPageTitle(currentPath, currentUser), [currentPath, currentUser]);

  useNotificationSocket({
    enabled: currentUser?.role === "user",
    onError: handleErrorToast
  });

  useWebPushSubscription({
    enabled: currentUser?.role === "user",
    onError: handleErrorToast
  });

  return (
    <main className="min-h-screen bg-canvas text-textMain">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        <AppHeader
          currentPath={currentPath}
          currentUser={currentUser}
          pageTitle={pageTitle}
          darkMode={darkMode}
          onLogout={() => void logout()}
          onNavigate={navigate}
          onToggleDarkMode={() => setDarkMode((current) => !current)}
        />

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
          <UserWorkspace
            currentPath={currentPath}
            currentUser={currentUser}
            onNavigate={navigate}
            onError={handleErrorToast}
            onToast={handleOkToast}
          />
        )}

        {!loadingSession && currentUser?.role === "admin" && (
          <AdminDashboard
            currentPath={currentPath}
            onError={handleErrorToast}
            onNavigate={navigate}
            onLogout={() => void logout()}
            onToast={handleOkToast}
          />
        )}
      </div>

      <AppToastStack toasts={toasts} />
    </main>
  );
}
