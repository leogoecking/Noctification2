import type { AuthUser } from "../../types";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

interface AppHeaderProps {
  currentUser: AuthUser | null;
  pageTitle: string;
  darkMode: boolean;
  onLogout: () => void;
  onToggleDarkMode: () => void;
}

const ThemeToggle = ({
  darkMode,
  onToggle
}: {
  darkMode: boolean;
  onToggle: () => void;
}) => {
  const label = darkMode ? "Ativar modo claro" : "Ativar modo escuro";
  const trackClass = darkMode ? "bg-surfaceHighest" : "bg-panelAlt";
  const thumbClass = darkMode ? "translate-x-5 bg-textMain" : "translate-x-0 bg-accent";
  const icon = darkMode ? (
    <svg aria-hidden="true" className="h-3.5 w-3.5 text-canvas" fill="none" viewBox="0 0 24 24">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" fill="currentColor" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 text-white"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );

  return (
    <button
      aria-label={label}
      className="flex items-center rounded-full border border-outlineSoft/80 bg-panel px-1 py-1 transition hover:border-accent/40"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <span className="sr-only">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${trackClass}`}
      >
        <span
          className={`absolute left-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${thumbClass}`}
        >
          {icon}
        </span>
      </span>
    </button>
  );
};

const UserBadge = ({
  user,
  onLogout
}: {
  user: AuthUser;
  onLogout: () => void;
}) => {
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = user.role === "admin" ? "Admin" : "Usuário";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-outlineSoft/70 bg-panel px-3 py-1.5 shadow-xs">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
          {initial}
        </div>
        <div className="hidden sm:block">
          <p className="max-w-[10rem] truncate text-sm font-semibold leading-tight text-textMain">
            {user.name}
          </p>
          <p className="text-xs leading-tight text-textMuted">{roleLabel}</p>
        </div>
      </div>
      <button
        aria-label="Sair da sessão"
        className="rounded-xl border border-outlineSoft/70 bg-panel px-3 py-2 text-sm font-medium text-textMuted transition hover:border-danger/40 hover:text-danger"
        onClick={onLogout}
        type="button"
      >
        Sair
      </button>
    </div>
  );
};

export const AppHeader = ({
  currentUser,
  pageTitle,
  darkMode,
  onLogout,
  onToggleDarkMode
}: AppHeaderProps) => (
  <header className="sticky top-0 z-30 mb-6 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-outlineSoft/40 bg-canvas/90 px-2 py-2.5 backdrop-blur">
    <div className="flex items-center gap-3">
      <img
        alt="Noctification"
        className="h-7 w-7 shrink-0 opacity-80"
        src="/icons/icon-192.svg"
      />
      <div>
        <h1 className="font-display text-xl font-bold leading-tight text-textMain">{pageTitle}</h1>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
      {currentUser ? <UserBadge user={currentUser} onLogout={onLogout} /> : null}
    </div>
  </header>
);

export const AppToastStack = ({ toasts }: { toasts: Toast[] }) => (
  <aside
    aria-label="Notificações do sistema"
    aria-live="polite"
    className="fixed bottom-4 right-4 z-50 space-y-2"
  >
    {toasts.map((toast) => (
      <div
        key={toast.id}
        role="alert"
        className={`flex w-80 animate-rise-in items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-md ${
          toast.tone === "ok"
            ? "border-success/25 bg-success/12 text-textMain"
            : "border-danger/25 bg-danger/12 text-textMain"
        }`}
      >
        {toast.tone === "ok" ? (
          <svg
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-success"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-danger"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        )}
        <span>{toast.message}</span>
      </div>
    ))}
  </aside>
);
