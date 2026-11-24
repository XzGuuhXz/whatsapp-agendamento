"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type StaffProfile = {
  user_id: string;
  display_name: string;
  role: "admin" | "recepcao";
  active: boolean;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  active: boolean;
};

type Professional = { id: string; name: string; active: boolean };

type View = "overview" | "services" | "professionals";

const navigation: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Visão geral", icon: "▦" },
  { id: "services", label: "Serviços", icon: "✳" },
  { id: "professionals", label: "Profissionais", icon: "♙" },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [view, setView] = useState<View>("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [professionalError, setProfessionalError] = useState("");
  const [professionalMessage, setProfessionalMessage] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [editingProfessionalId, setEditingProfessionalId] = useState<string | null>(null);
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [serviceMessage, setServiceMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [savingService, setSavingService] = useState(false);

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
      if (alive) setLoading(false);
    }

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setProfile(null);
        setServices([]);
        setProfessionals([]);
        setView("overview");
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setLoading(true);
        window.setTimeout(() => {
          if (alive) {
            void loadProfile(session.user.id).finally(() => {
              if (alive) setLoading(false);
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

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServiceError("");
    const { data, error } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, active")
      .order("name", { ascending: true });

    if (error) {
      setServiceError("Não foi possível carregar os serviços. Verifique a migração e as permissões do Supabase.");
      setServices([]);
    } else {
      setServices((data ?? []) as Service[]);
    }
    setServicesLoading(false);
  }, []);

  const loadProfessionals = useCallback(async () => {
    setProfessionalsLoading(true);
    setProfessionalError("");
    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, active")
      .order("name", { ascending: true });

    if (error) {
      setProfessionalError("Não foi possível carregar os profissionais. Verifique as permissões do Supabase.");
      setProfessionals([]);
    } else {
      setProfessionals((data ?? []) as Professional[]);
    }
    setProfessionalsLoading(false);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const timer = window.setTimeout(() => {
      void loadServices();
      void loadProfessionals();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [profile, loadServices, loadProfessionals]);

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
    await supabase.auth.signOut();
    setProfile(null);
    setServices([]);
  }

  function resetServiceForm() {
    setEditingId(null);
    setServiceName("");
    setDuration("30");
    setPrice("");
  }

  function startEdit(service: Service) {
    setEditingId(service.id);
    setServiceName(service.name);
    setDuration(String(service.duration_minutes));
    setPrice(service.price == null ? "" : String(service.price));
    setServiceMessage("");
    setServiceError("");
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServiceError("");
    setServiceMessage("");

    const minutes = Number(duration);
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));

    if (serviceName.trim().length < 2) {
      setServiceError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
      setServiceError("A duração deve ser um número inteiro entre 5 e 480 minutos.");
      return;
    }
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setServiceError("Informe um valor válido ou deixe o campo em branco.");
      return;
    }

    setSavingService(true);
    const payload = {
      name: serviceName.trim(),
      duration_minutes: minutes,
      price: parsedPrice,
    };

    const result = editingId
      ? await supabase.from("services").update(payload).eq("id", editingId)
      : await supabase.from("services").insert(payload);

    if (result.error) {
      setServiceError("Não foi possível salvar. Confira as permissões e os campos da tabela services.");
    } else {
      setServiceMessage(editingId ? "Serviço atualizado." : "Serviço cadastrado.");
      resetServiceForm();
      await loadServices();
    }
    setSavingService(false);
  }

  async function toggleService(service: Service) {
    setServiceError("");
    setServiceMessage("");
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);

    if (error) {
      setServiceError("Não foi possível alterar o status do serviço.");
    } else {
      setServiceMessage(service.active ? "Serviço desativado." : "Serviço reativado.");
      await loadServices();
    }
  }

  async function saveProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfessionalError("");
    setProfessionalMessage("");
    if (professionalName.trim().length < 2) {
      setProfessionalError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    setSavingProfessional(true);
    const result = editingProfessionalId
      ? await supabase.from("professionals").update({ name: professionalName.trim() }).eq("id", editingProfessionalId)
      : await supabase.from("professionals").insert({ name: professionalName.trim() });

    if (result.error) {
      setProfessionalError("Não foi possível salvar. Verifique as permissões e a estrutura da tabela professionals.");
    } else {
      setProfessionalMessage(editingProfessionalId ? "Profissional atualizado." : "Profissional cadastrado.");
      setProfessionalName("");
      setEditingProfessionalId(null);
      await loadProfessionals();
    }
    setSavingProfessional(false);
  }

  async function toggleProfessional(professional: Professional) {
    setProfessionalError("");
    setProfessionalMessage("");
    const { error } = await supabase
      .from("professionals")
      .update({ active: !professional.active })
      .eq("id", professional.id);

    if (error) {
      setProfessionalError("Não foi possível alterar o status do profissional.");
    } else {
      setProfessionalMessage(professional.active ? "Profissional desativado." : "Profissional reativado.");
      await loadProfessionals();
    }
  }

  if (loading) {
    return <main className="auth-screen"><div className="auth-card"><span className="brand-mark">S</span><p>Verificando acesso...</p></div></main>;
  }

  if (!profile) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark">S</span>
            <div><strong>SAE Agenda</strong><small>Painel da recepção</small></div>
          </div>
          <div className="auth-heading">
            <span className="eyebrow">ACESSO RESTRITO</span>
            <h1>Entrar no painel</h1>
            <p>Use sua conta individual de funcionário para acessar a agenda.</p>
          </div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label htmlFor="email">E-mail institucional ou autorizado</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <button className="primary-button full-button" type="submit" disabled={authBusy}>
              {authBusy ? "Verificando..." : "Entrar"}
            </button>
          </form>
          <p className="auth-footnote">O acesso é individual. Se ainda não possui uma conta autorizada, procure o administrador do sistema.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="SAE Agenda - início">
          <span className="brand-mark">S</span>
          <span className="brand-copy"><strong>SAE Agenda</strong><small>Painel da recepção</small></span>
        </a>
        <div className="sidebar-label">MENU PRINCIPAL</div>
        <nav className="sidebar-nav" aria-label="Menu principal">
          {navigation.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-link active" : "nav-link"} onClick={() => setView(item.id)}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
          <a className="nav-link" href="/agenda"><span className="nav-icon" aria-hidden="true">▣</span>Agenda</a>
          <a className="nav-link" href="/horarios"><span className="nav-icon" aria-hidden="true">◷</span>Horários</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">i</span><strong>Acesso protegido</strong><p>Seus dados são exibidos conforme as permissões da sua conta.</p></div>
          <div className="sidebar-footer"><span className="status-dot" />Sessão autenticada</div>
        </div>
      </aside>

      <section className="main-area" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">SAE <span>/</span> {view === "overview" ? "Visão geral" : "Serviços"}</div>
          <div className="topbar-right">
            <span className="staff-name">{profile.display_name} <small>{profile.role === "admin" ? "Administrador" : "Recepção"}</small></span>
            <button className="logout-button" onClick={handleLogout}>Sair</button>
          </div>
        </header>

        <div className="content">
          {view === "overview" ? (
            <>
              <div className="welcome-row">
                <div><div className="eyebrow">CENTRAL DE ATENDIMENTO</div><h1>Visão geral</h1><p className="page-description">Bem-vindo(a), {profile.display_name}. Este é o painel interno do SAE.</p></div>
                <div className="date-chip"><span aria-hidden="true">◷</span> Agenda do SAE</div>
              </div>
              <div className="notice"><span className="notice-icon">!</span><div><strong>Agenda em desenvolvimento</strong><p>O próximo módulo será a visualização e o gerenciamento dos agendamentos. Nenhum dado de paciente é exibido nesta etapa.</p></div></div>
              <section className="stats-grid" aria-label="Resumo da agenda">
                <article className="stat-card"><div className="stat-top"><span>Agendamentos de hoje</span><span className="stat-icon lavender">▣</span></div><div className="stat-value">—</div><div className="stat-foot">Módulo em desenvolvimento</div></article>
                <article className="stat-card"><div className="stat-top"><span>Aguardando confirmação</span><span className="stat-icon amber">◷</span></div><div className="stat-value">—</div><div className="stat-foot">Módulo em desenvolvimento</div></article>
                <article className="stat-card"><div className="stat-top"><span>Serviços ativos</span><span className="stat-icon mint">✳</span></div><div className="stat-value">{services.filter((service) => service.active).length}</div><div className="stat-foot">Abra Serviços para consultar o catálogo</div></article>
                <article className="stat-card"><div className="stat-top"><span>Profissionais ativos</span><span className="stat-icon blue">♙</span></div><div className="stat-value">{professionals.filter((professional) => professional.active).length}</div><div className="stat-foot">Equipe cadastrada no painel</div></article>
              </section>
              <section className="panel-section"><div className="section-heading"><div><h2>Próximas etapas</h2><p>Os módulos serão liberados conforme a configuração segura do sistema.</p></div></div><div className="surface-card"><div className="next-steps"><div><span>01</span><strong>Catálogo de serviços</strong><small>Cadastro e ativação de serviços reais</small></div><div><span>02</span><strong>Profissionais</strong><small>Equipe e disponibilidade</small></div><div><span>03</span><strong>Agenda</strong><small>Consulta e gerenciamento de horários</small></div></div></div></section>
            </>
          ) : view === "services" ? (
            <>
              <div className="welcome-row"><div><div className="eyebrow">CONFIGURAÇÃO DO ATENDIMENTO</div><h1>Serviços</h1><p className="page-description">Cadastre os serviços que poderão ser selecionados no fluxo de agendamento.</p></div><span className="section-tag">Catálogo do SAE</span></div>
              <div className="notice"><span className="notice-icon">i</span><div><strong>Cadastre somente serviços confirmados pela coordenação</strong><p>Os serviços cadastrados e ativos poderão aparecer como opções no chatbot. Não inclua informações sensíveis de pacientes.</p></div></div>
              <div className="service-layout">
                <section className="surface-card service-form-card">
                  <div className="form-card-heading"><h2>{editingId ? "Editar serviço" : "Novo serviço"}</h2><p>Preencha os dados do catálogo.</p></div>
                  <form className="service-form" onSubmit={saveService}>
                    <label htmlFor="service-name">Nome do serviço</label>
                    <input id="service-name" value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: nome confirmado pela coordenação" required maxLength={120} />
                    <label htmlFor="service-duration">Duração (minutos)</label>
                    <input id="service-duration" type="number" min="5" max="480" step="5" value={duration} onChange={(event) => setDuration(event.target.value)} required />
                    <label htmlFor="service-price">Valor (opcional)</label>
                    <input id="service-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Deixe em branco se não se aplica" />
                    {serviceError && <p className="form-error" role="alert">{serviceError}</p>}
                    {serviceMessage && <p className="form-success" role="status">{serviceMessage}</p>}
                    <div className="form-actions"><button className="primary-button" type="submit" disabled={savingService}>{savingService ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar serviço"}</button>{editingId && <button className="secondary-button" type="button" onClick={resetServiceForm}>Cancelar</button>}</div>
                  </form>
                </section>
                <section className="surface-card service-list-card">
                  <div className="form-card-heading list-heading"><div><h2>Catálogo cadastrado</h2><p>{services.length} serviço(s) encontrado(s)</p></div><button className="secondary-button" onClick={() => void loadServices()} disabled={servicesLoading}>Atualizar</button></div>
                  {servicesLoading ? <div className="list-empty">Carregando serviços...</div> : services.length === 0 ? <div className="list-empty"><span className="empty-state-icon">✳</span><strong>Nenhum serviço cadastrado</strong><p>Adicione os serviços confirmados pela coordenação para começar a montar o catálogo.</p></div> : (
                    <div className="service-table-wrap"><table className="service-table"><thead><tr><th>Serviço</th><th>Duração</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong></td><td>{service.duration_minutes} min</td><td>{service.price == null ? "—" : service.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><span className={service.active ? "service-status active" : "service-status inactive"}>{service.active ? "Ativo" : "Inativo"}</span></td><td><div className="table-actions"><button onClick={() => startEdit(service)}>Editar</button><button onClick={() => void toggleService(service)}>{service.active ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table></div>
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="welcome-row"><div><div className="eyebrow">EQUIPE DE ATENDIMENTO</div><h1>Profissionais</h1><p className="page-description">Cadastre e mantenha atualizada a equipe que poderá receber agendamentos.</p></div><span className="section-tag">Equipe do SAE</span></div>
              <div className="notice"><span className="notice-icon">i</span><div><strong>Cadastre somente profissionais autorizados</strong><p>Os profissionais ativos poderão ser associados aos serviços no fluxo de agendamento.</p></div></div>
              <div className="service-layout">
                <section className="surface-card service-form-card">
                  <div className="form-card-heading"><h2>{editingProfessionalId ? "Editar profissional" : "Novo profissional"}</h2><p>Informe o nome conforme cadastro institucional.</p></div>
                  <form className="service-form" onSubmit={saveProfessional}>
                    <label htmlFor="professional-name">Nome do profissional</label>
                    <input id="professional-name" value={professionalName} onChange={(event) => setProfessionalName(event.target.value)} placeholder="Nome completo" required maxLength={100} />
                    {professionalError && <p className="form-error" role="alert">{professionalError}</p>}
                    {professionalMessage && <p className="form-success" role="status">{professionalMessage}</p>}
                    <div className="form-actions"><button className="primary-button" type="submit" disabled={savingProfessional}>{savingProfessional ? "Salvando..." : editingProfessionalId ? "Salvar alterações" : "Cadastrar profissional"}</button>{editingProfessionalId && <button className="secondary-button" type="button" onClick={() => { setEditingProfessionalId(null); setProfessionalName(""); }}>Cancelar</button>}</div>
                  </form>
                </section>
                <section className="surface-card service-list-card">
                  <div className="form-card-heading list-heading"><div><h2>Equipe cadastrada</h2><p>{professionals.length} profissional(is) encontrado(s)</p></div><button className="secondary-button" onClick={() => void loadProfessionals()} disabled={professionalsLoading}>Atualizar</button></div>
                  {professionalsLoading ? <div className="list-empty">Carregando profissionais...</div> : professionals.length === 0 ? <div className="list-empty"><span className="empty-state-icon">♙</span><strong>Nenhum profissional cadastrado</strong><p>Adicione somente os profissionais confirmados pela coordenação.</p></div> : (
                    <div className="service-table-wrap"><table className="service-table"><thead><tr><th>Profissional</th><th>Status</th><th>Ações</th></tr></thead><tbody>{professionals.map((professional) => <tr key={professional.id}><td><strong>{professional.name}</strong></td><td><span className={professional.active ? "service-status active" : "service-status inactive"}>{professional.active ? "Ativo" : "Inativo"}</span></td><td><div className="table-actions"><button onClick={() => { setEditingProfessionalId(professional.id); setProfessionalName(professional.name); setProfessionalMessage(""); setProfessionalError(""); }}>Editar</button><button onClick={() => void toggleProfessional(professional)}>{professional.active ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table></div>
                  )}
                </section>
              </div>
            </>
          )}
          <footer className="page-footer"><span>SAE Agenda <span className="footer-separator">·</span> Painel interno</span><span>Sessão individual protegida</span></footer>
        </div>
      </section>
    </main>
  );
}
