"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Service = { id: string; name: string; active: boolean };
type Professional = { id: string; name: string; active: boolean };
type LinkRow = { service_id: string; professional_id: string };
type ServiceLink = { serviceId: string; professionalId: string };

export default function ServiceProfessionalLinksPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [links, setLinks] = useState<ServiceLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const checkAccess = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) { setChecking(false); return; }
    const { data, error: profileError } = await supabase.from("staff_profiles")
      .select("active").eq("user_id", sessionData.session.user.id).maybeSingle();
    setAuthorized(!profileError && Boolean(data?.active));
    setChecking(false);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [serviceResult, professionalResult, linkResult] = await Promise.all([
      supabase.from("services").select("id, name, active").order("name"),
      supabase.from("professionals").select("id, name, active").order("name"),
      supabase.from("service_professionals").select("service_id, professional_id"),
    ]);
    const queryError = serviceResult.error || professionalResult.error || linkResult.error;
    if (queryError) {
      setError("Não foi possível carregar os vínculos. Confirme se as migrations de acesso e de serviços por profissional foram aplicadas.");
    } else {
      setServices(serviceResult.data ?? []);
      setProfessionals(professionalResult.data ?? []);
      setLinks((linkResult.data ?? []).map((item: LinkRow) => ({
        serviceId: item.service_id,
        professionalId: item.professional_id,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void checkAccess(); }, [checkAccess]);
  useEffect(() => { if (authorized) void loadData(); }, [authorized, loadData]);

  function isLinked(serviceId: string, professionalId: string) {
    return links.some((link) => link.serviceId === serviceId && link.professionalId === professionalId);
  }

  async function updateLink(service: Service, professional: Professional, checked: boolean) {
    const key = service.id + ":" + professional.id;
    setSavingKey(key);
    setError("");
    setMessage("");
    const result = checked
      ? await supabase.from("service_professionals").insert({
          service_id: service.id,
          professional_id: professional.id,
        })
      : await supabase.from("service_professionals").delete()
          .eq("service_id", service.id).eq("professional_id", professional.id);

    if (result.error) {
      setError("Não foi possível atualizar o vínculo. Verifique as permissões e tente novamente.");
    } else {
      setLinks((current) => checked
        ? [...current, { serviceId: service.id, professionalId: professional.id }]
        : current.filter((link) => !(link.serviceId === service.id && link.professionalId === professional.id)));
      setMessage("Vínculo atualizado.");
    }
    setSavingKey("");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (checking) return <main className="auth-screen"><section className="auth-card">Verificando acesso...</section></main>;
  if (!authorized) return <main className="auth-screen"><section className="auth-card"><h1>Acesso restrito</h1><p>Entre pelo painel com uma conta de funcionário autorizada.</p><Link className="primary-button" href="/">Ir para o login</Link></section></main>;

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div><Link href="/" className="agenda-back">← Painel SAE</Link><h1>Serviços por profissional</h1><p>Defina quais profissionais podem receber cada tipo de agendamento.</p></div>
        <button className="secondary-button" onClick={() => void logout()}>Sair</button>
      </header>
      <section className="surface-card agenda-card">
        <div className="form-card-heading"><h2>Vínculos de atendimento</h2><p>Marque apenas os pares confirmados pela coordenação do SAE.</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        {loading ? <p className="list-empty">Carregando serviços, profissionais e vínculos...</p> : services.length === 0 ? (
          <div className="list-empty"><strong>Nenhum serviço cadastrado</strong><p>Cadastre os serviços confirmados na seção Serviços antes de configurar os vínculos.</p></div>
        ) : professionals.length === 0 ? (
          <div className="list-empty"><strong>Nenhum profissional cadastrado</strong><p>Cadastre os profissionais autorizados antes de configurar os vínculos.</p></div>
        ) : (
          <div className="links-grid">
            {services.map((service) => (
              <article className="link-card" key={service.id}>
                <div className="link-card-heading">
                  <div><h3>{service.name}</h3><span className={service.active ? "service-status active" : "service-status inactive"}>{service.active ? "Ativo" : "Inativo"}</span></div>
                  <small>{links.filter((link) => link.serviceId === service.id).length} vínculo(s)</small>
                </div>
                {!service.active && <p className="link-warning">Serviço inativo: não será oferecido no chatbot.</p>}
                <div className="link-professionals">
                  {professionals.map((professional) => {
                    const linked = isLinked(service.id, professional.id);
                    const key = service.id + ":" + professional.id;
                    return (
                      <label className="link-professional" key={professional.id}>
                        <input
                          type="checkbox"
                          checked={linked}
                          disabled={savingKey === key || (!professional.active && !linked)}
                          onChange={(event) => void updateLink(service, professional, event.target.checked)}
                        />
                        <span>{professional.name}</span>
                        {!professional.active && <small>Inativo</small>}
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="form-actions"><button className="secondary-button" onClick={() => void loadData()} disabled={loading || Boolean(savingKey)}>Atualizar dados</button></div>
      </section>
      <p className="agenda-privacy">Serviços sem vínculo ativo com profissionais não oferecerão horários no chatbot. Nenhum vínculo é criado automaticamente.</p>
    </main>
  );
}
