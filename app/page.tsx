const navigation = [
  { label: "Visão geral", href: "#inicio", icon: "▦", active: true },
  { label: "Agendamentos", href: "#agendamentos", icon: "▣" },
  { label: "Serviços", href: "#servicos", icon: "✳" },
  { label: "Profissionais", href: "#profissionais", icon: "♙" },
];

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">⌁</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="SAE Agenda - início">
          <span className="brand-mark">S</span>
          <span className="brand-copy">
            <strong>SAE Agenda</strong>
            <small>Painel da recepção</small>
          </span>
        </a>

        <div className="sidebar-label">MENU PRINCIPAL</div>
        <nav className="sidebar-nav" aria-label="Menu principal">
          {navigation.map((item) => (
            <a
              className={item.active ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.label}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">i</span>
            <strong>Ambiente em preparação</strong>
            <p>O painel está em fase inicial de configuração.</p>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" />
            Prévia de desenvolvimento
          </div>
        </div>
      </aside>

      <section className="main-area" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">SAE <span>/</span> Painel da recepção</div>
          <div className="topbar-right">
            <span className="environment-pill"><span /> Ambiente de desenvolvimento</span>
            <div className="profile-placeholder" aria-label="Usuário não autenticado">?</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">CENTRAL DE ATENDIMENTO</div>
              <h1>Visão geral</h1>
              <p className="page-description">Acompanhe a organização dos atendimentos e da agenda.</p>
            </div>
            <div className="date-chip"><span aria-hidden="true">◷</span> Agenda do SAE</div>
          </div>

          <div className="notice" role="status">
            <span className="notice-icon">!</span>
            <div>
              <strong>Prévia visual — dados ainda não conectados</strong>
              <p>Esta tela não consulta nem altera dados reais. O acesso será ativado após a configuração do login dos funcionários e das permissões no Supabase.</p>
            </div>
          </div>

          <section className="stats-grid" aria-label="Resumo da agenda">
            <article className="stat-card">
              <div className="stat-top"><span>Agendamentos de hoje</span><span className="stat-icon lavender">▣</span></div>
              <div className="stat-value">—</div>
              <div className="stat-foot">Aguardando conexão com a agenda</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Aguardando confirmação</span><span className="stat-icon amber">◷</span></div>
              <div className="stat-value">—</div>
              <div className="stat-foot">Aguardando conexão com a agenda</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Serviços ativos</span><span className="stat-icon mint">✳</span></div>
              <div className="stat-value">—</div>
              <div className="stat-foot">Catálogo ainda não carregado</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Profissionais</span><span className="stat-icon blue">♙</span></div>
              <div className="stat-value">—</div>
              <div className="stat-foot">Cadastro ainda não conectado</div>
            </article>
          </section>

          <section className="panel-section" id="agendamentos">
            <div className="section-heading">
              <div>
                <h2>Agenda do dia</h2>
                <p>Os próximos atendimentos aparecerão aqui.</p>
              </div>
              <span className="section-tag">Sem dados</span>
            </div>
            <div className="surface-card">
              <EmptyState
                title="A agenda será exibida aqui"
                description="Quando a autenticação e a integração estiverem prontas, a recepção poderá acompanhar os horários por profissional."
              />
            </div>
          </section>

          <div className="lower-grid">
            <section className="panel-section" id="servicos">
              <div className="section-heading">
                <div>
                  <h2>Serviços cadastrados</h2>
                  <p>Catálogo de serviços disponíveis para agendamento.</p>
                </div>
                <span className="section-tag">Não conectado</span>
              </div>
              <div className="surface-card compact-card">
                <EmptyState
                  title="Nenhum serviço exibido"
                  description="Os serviços reais do SAE serão cadastrados pela equipe responsável. Nenhum serviço fictício foi adicionado."
                />
              </div>
            </section>

            <section className="panel-section" id="profissionais">
              <div className="section-heading">
                <div>
                  <h2>Profissionais</h2>
                  <p>Equipe e disponibilidade.</p>
                </div>
                <span className="section-tag">Não conectado</span>
              </div>
              <div className="surface-card compact-card">
                <EmptyState
                  title="Cadastro ainda não disponível"
                  description="A lista será carregada após a definição dos acessos e da integração com o banco."
                />
              </div>
            </section>
          </div>

          <footer className="page-footer">
            <span>SAE Agenda <span className="footer-separator">·</span> Painel interno</span>
            <span>Versão inicial de interface</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
