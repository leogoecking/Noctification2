import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useNotificationSocket } from "./hooks/useNotificationSocket";
import { useSessionBootstrap } from "./hooks/useSessionBootstrap";
import { useThemePreference } from "./hooks/useThemePreference";
import { useToastQueue } from "./hooks/useToastQueue";
import { useWebPushSubscription } from "./hooks/useWebPushSubscription";
import { primeReminderAudio } from "./lib/reminderAudio";
import { isAprModuleEnabled, isKmlPosteModuleEnabled } from "./lib/featureFlags";
import type { AuthUser } from "./types";
import {
  AppHeader,
  AppToastStack,
  getPageTitle,
  UserWorkspace,
  type AppPath
} from "./components/app/appShell";

export default function App() {
  const aprModuleEnabled = isAprModuleEnabled();
  const kmlPosteModuleEnabled = isKmlPosteModuleEnabled();
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const { currentPath, navigate } = useAppNavigation();
  const { currentUser, setCurrentUser, loadingSession } = useSessionBootstrap();
  const { darkMode, toggleDarkMode } = useThemePreference();
  const { toasts, pushToast } = useToastQueue();

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
    [navigate, pushToast, setCurrentUser]
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
    [navigate, pushToast, setCurrentUser]
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
  }, [navigate, pushToast, setCurrentUser]);

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
          onToggleDarkMode={toggleDarkMode}
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
