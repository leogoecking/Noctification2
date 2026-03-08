import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { UserDashboard } from "./components/UserDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import type { AuthUser } from "./types";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  };

  const loadSession = async () => {
    try {
      const response = await api.me();
      setCurrentUser(response.user as AuthUser);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = async (loginValue: string, password: string) => {
    setSubmittingLogin(true);

    try {
      const response = await api.login(loginValue, password);
      setCurrentUser(response.user as AuthUser);
      pushToast("Login realizado com sucesso", "ok");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha no login";
      pushToast(message, "error");
    } finally {
      setSubmittingLogin(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      pushToast("Sessao encerrada", "ok");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao sair";
      pushToast(message, "error");
    }
  };

  const pageTitle = useMemo(() => {
    if (!currentUser) {
      return "Sistema de Notificacao Interna";
    }

    return currentUser.role === "admin" ? "Console Administrativo" : "Painel Operacional";
  }, [currentUser]);

  return (
    <main className="min-h-screen bg-canvas text-textMain">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Plataforma interna</p>
            <h1 className="font-display text-2xl text-textMain">{pageTitle}</h1>
          </div>

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

        {!loadingSession && !currentUser && <LoginScreen onSubmit={login} isLoading={submittingLogin} />}

        {!loadingSession && currentUser?.role === "user" && (
          <UserDashboard
            user={currentUser}
            onError={(message) => pushToast(message, "error")}
            onToast={(message) => pushToast(message, "ok")}
          />
        )}

        {!loadingSession && currentUser?.role === "admin" && (
          <AdminDashboard
            onError={(message) => pushToast(message, "error")}
            onToast={(message) => pushToast(message, "ok")}
          />
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
