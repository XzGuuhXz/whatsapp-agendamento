"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type StaffProfile = {
  user_id: string;
  display_name: string;
  role: "admin" | "recepcao";
  active: boolean;
};

const navigation = [
  { href: "/", label: "Início" },
  { href: "/agenda", label: "Agenda" },
  { href: "/servicos", label: "Serviços" },
  { href: "/profissionais", label: "Profissionais" },
  { href: "/vinculos", label: "Vínculos" },
  { href: "/horarios", label: "Horários" },
];

type Theme = "light" | "dark";

function getThemeSnapshot(): Theme {
  try {
    return window.localStorage.getItem("sae-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("sae-theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("sae-theme-change", onChange);
  };
}

function toggleSavedTheme(current: Theme) {
  const next: Theme = current === "dark" ? "light" : "dark";
  try {
    window.localStorage.setItem("sae-theme", next);
  } catch {
    // O tema continua alternável mesmo quando o navegador bloqueia o armazenamento.
  }
  window.dispatchEvent(new Event("sae-theme-change"));
}

export default function SaeAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("staff_profiles")
      .select("user_id, display_name, role, active")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data || !data.active) {
      setProfile(null);
      setAuthError(
        error
          ? "Não foi possível validar seu acesso. Confira se a migração do painel foi aplicada."
          : "Sua conta ainda não está autorizada. Peça ao administrador para cadastrar seu acesso."
      );
      return;
    }

    setAuthError("");
    setProfile(data as StaffProfile);
  }, []);

  useEffect(() => {
    let alive = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (alive) setChecking(false);
    }

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        setProfile(null);
        setChecking(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setChecking(true);
        window.setTimeout(() => {
          if (alive) {
            void loadProfile(session.user.id).finally(() => {
              if (alive) setChecking(false);
            });
          }
        }, 0);
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthError("Não foi possível entrar. Confira o e-mail e a senha.");
      setAuthBusy(false);
      return;
    }

    if (data.user) await loadProfile(data.user.id);
    setPassword("");
    setAuthBusy(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError("Não foi possível encerrar a sessão. Tente novamente.");
      return;
    }
    setProfile(null);
    router.replace("/");
  }

  if (checking) {
    return (
      <main className="auth-screen">
        <section className="auth-card auth-loading">Verificando acesso...</section>
      </main>
    );
  }

  if (!profile) {
    if (pathname !== "/") {
      return (
        <main className="auth-screen">
          <section className="auth-card">
            <h1>Acesso restrito</h1>
            <p>Entre pelo painel com uma conta de funcionário autorizada.</p>
            <Link className="button button-primary" href="/">Ir para o login</Link>
          </section>
        </main>
      );
    }

    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark">SAE</span>
            <div>
              <strong>SAE Agenda</strong>
              <small>Painel da recepção</small>
            </div>
          </div>
          <div className="auth-heading">
            <h1>Entrar no painel</h1>
            <p>Use sua conta individual de funcionário para acessar a agenda.</p>
          </div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label htmlFor="email">E-mail cadastrado</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <button className="button button-primary button-full" type="submit" disabled={authBusy}>
              {authBusy ? "Verificando..." : "Entrar"}
            </button>
          </form>
          <p className="auth-footnote">O acesso é individual. Use o e-mail cadastrado pelo administrador.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/" aria-label="SAE Agenda - início">
          <span className="brand-mark">SAE</span>
          <span>
            <strong>SAE Agenda</strong>
            <small>Painel da recepção</small>
          </span>
        </Link>
        <nav className="app-nav" aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                className={active ? "nav-link is-active" : "nav-link"}
                href={item.href}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="button button-secondary theme-toggle"
            type="button"
            onClick={() => toggleSavedTheme(theme)}
            aria-pressed={theme === "dark"}
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          >
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
          <div className="account-info">
            <strong>{profile.display_name}</strong>
            <span>{profile.role === "admin" ? "Administrador" : "Recepção"}</span>
          </div>
          <button className="button button-secondary" type="button" onClick={() => void handleLogout()}>
            Sair
          </button>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
