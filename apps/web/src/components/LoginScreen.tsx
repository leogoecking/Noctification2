import { useState } from "react";

interface LoginScreenProps {
  onSubmit: (login: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export const LoginScreen = ({ onSubmit, isLoading }: LoginScreenProps) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto max-w-md animate-rise-in rounded-3xl border border-slate-700 bg-panel/95 p-6 shadow-glow backdrop-blur">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Noctification</p>
      <h1 className="mt-2 font-display text-3xl text-textMain">Acesso interno</h1>
      <p className="mt-1 text-sm text-textMuted">Entre com seu login institucional</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(login, password);
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs text-textMuted">Login</span>
          <input
            className="input"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoComplete="username"
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
              autoComplete="current-password"
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
          {isLoading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
};
