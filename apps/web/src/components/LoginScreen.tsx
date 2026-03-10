import { useMemo, useState } from "react";

interface LoginScreenProps {
  mode: "user" | "admin";
  onLogin: (login: string, password: string) => Promise<void>;
  onRegister?: (name: string, login: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export const LoginScreen = ({ mode, onLogin, onRegister, isLoading }: LoginScreenProps) => {
  const [formMode, setFormMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [login, setLogin] = useState(mode === "admin" ? "admin" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isRegisterMode = mode === "user" && formMode === "register";

  const heading = useMemo(() => {
    if (mode === "admin") {
      return "Acesso administrativo";
    }

    return isRegisterMode ? "Criar conta" : "Acesso interno";
  }, [isRegisterMode, mode]);

  return (
    <div className="mx-auto max-w-md animate-rise-in rounded-3xl border border-slate-700 bg-panel/95 p-6 shadow-glow backdrop-blur">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Noctification</p>
      <h1 className="mt-2 font-display text-3xl text-textMain">{heading}</h1>
      <p className="mt-1 text-sm text-textMuted">
        {mode === "admin"
          ? "Use as credenciais fixas admin/admin"
          : isRegisterMode
            ? "Informe nome, login e senha para criar seu acesso"
            : "Entre com seu login institucional"}
      </p>

      {mode === "user" && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-panelAlt p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${formMode === "login" ? "bg-accent text-slate-900" : "text-textMuted"}`}
            onClick={() => setFormMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${formMode === "register" ? "bg-accent text-slate-900" : "text-textMuted"}`}
            onClick={() => setFormMode("register")}
          >
            Criar conta
          </button>
        </div>
      )}

      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();

          if (isRegisterMode) {
            if (!onRegister) {
              return;
            }

            await onRegister(name, login, password);
            return;
          }

          await onLogin(login, password);
        }}
      >
        {isRegisterMode && (
          <label className="block space-y-1">
            <span className="text-xs text-textMuted">Nome</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs text-textMuted">Login</span>
          <input
            className="input"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoComplete="username"
            readOnly={mode === "admin"}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-textMuted">Senha</span>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
              required
            />
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-3 text-sm text-textMuted"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>

        <button type="submit" className="btn-accent w-full" disabled={isLoading}>
          {isLoading
            ? isRegisterMode
              ? "Criando..."
              : "Entrando..."
            : isRegisterMode
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>
    </div>
  );
};
