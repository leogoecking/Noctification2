import { useMemo, useState } from "react";

interface LoginScreenProps {
  onLogin: (login: string, password: string) => Promise<void>;
  onRegister?: (name: string, login: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export const LoginScreen = ({ onLogin, onRegister, isLoading }: LoginScreenProps) => {
  const [formMode, setFormMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isRegisterMode = formMode === "register";

  const heading = useMemo(
    () => (isRegisterMode ? "Criar conta" : "Acesso interno"),
    [isRegisterMode]
  );

  return (
    <div className="mx-auto max-w-md animate-rise-in rounded-3xl bg-panel/95 p-6 shadow-md backdrop-blur ring-1 ring-outlineSoft/50">
      <div className="mb-5 flex items-center gap-3">
        <img alt="Noctification" className="h-9 w-9" src="/icons/icon-192.svg" />
        <div>
          <p className="text-xs font-medium text-textMuted">Noctification</p>
          <h1 className="font-display text-2xl font-bold leading-tight text-textMain">{heading}</h1>
        </div>
      </div>

      <p className="mb-5 text-sm text-textMuted">
        {isRegisterMode
          ? "Informe nome, login e senha para criar seu acesso"
          : "Entre com seu login institucional"}
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-panelAlt p-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${formMode === "login" ? "bg-panel text-textMain shadow-xs" : "text-textMuted hover:text-textMain"}`}
          onClick={() => setFormMode("login")}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${formMode === "register" ? "bg-panel text-textMain shadow-xs" : "text-textMuted hover:text-textMain"}`}
          onClick={() => setFormMode("register")}
        >
          Criar conta
        </button>
      </div>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (isRegisterMode) {
            if (!onRegister) return;
            await onRegister(name, login, password);
            return;
          }
          await onLogin(login, password);
        }}
      >
        {isRegisterMode && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-textMuted">Nome</span>
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
          <span className="text-xs font-medium text-textMuted">Login</span>
          <input
            className="input"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-textMuted">Senha</span>
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
              className="rounded-lg border border-outlineSoft bg-panelAlt px-3 text-sm text-textMuted transition hover:text-textMain"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>

        <button type="submit" className="btn-primary w-full" disabled={isLoading}>
          {isLoading
            ? isRegisterMode ? "Criando..." : "Entrando..."
            : isRegisterMode ? "Criar conta" : "Entrar"}
        </button>
      </form>
    </div>
  );
};
