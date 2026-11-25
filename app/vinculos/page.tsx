"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Service = { id: string; name: string; active: boolean };
type Professional = { id: string; name: string; active: boolean };
type LinkRow = { service_id: string; professional_id: string };
type ServiceLink = { serviceId: string; professionalId: string };

export default function ServiceProfessionalLinksPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [links, setLinks] = useState<ServiceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      setError("Não foi possível carregar os vínculos. " + queryError.message);
    } else {
      setServices(serviceResult.data ?? []);
      setProfessionals(professionalResult.data ?? []);
      setLinks(
        (linkResult.data ?? []).map((item: LinkRow) => ({
          serviceId: item.service_id,
          professionalId: item.professional_id,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function isLinked(serviceId: string, professionalId: string) {
    return links.some(
      (link) => link.serviceId === serviceId && link.professionalId === professionalId
    );
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
          .eq("service_id", service.id)
          .eq("professional_id", professional.id);

    if (result.error) {
      setError("Não foi possível atualizar o vínculo. " + result.error.message);
    } else {
      setLinks((current) =>
        checked
          ? [...current, { serviceId: service.id, professionalId: professional.id }]
          : current.filter(
              (link) => !(link.serviceId === service.id && link.professionalId === professional.id)
            )
      );
      setMessage("Vínculo atualizado.");
    }
    setSavingKey("");
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Vínculos</h1>
          <p>Associe os profissionais aos serviços que podem realizar.</p>
        </div>
      </header>

      <p className="help-text">Marque somente os pares confirmados pela coordenação do SAE.</p>

      <section className="surface-card">
        <div className="section-header">
          <h2>Serviços por profissional</h2>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void loadData()}
            disabled={loading || Boolean(savingKey)}
          >
            Atualizar dados
          </button>
        </div>

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void loadData()}
              disabled={loading || Boolean(savingKey)}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <p className="state-message">Carregando serviços, profissionais e vínculos...</p>
        ) : error ? null : services.length === 0 ? (
          <p className="state-message">
            Nenhum serviço cadastrado. Cadastre os serviços confirmados antes de configurar os vínculos.
          </p>
        ) : professionals.length === 0 ? (
          <p className="state-message">
            Nenhum profissional cadastrado. Cadastre os profissionais autorizados antes de configurar os vínculos.
          </p>
        ) : (
          <div className="links-grid">
            {services.map((service) => (
              <article className="link-card" key={service.id}>
                <div className="link-card-heading">
                  <div>
                    <h3>{service.name}</h3>
                    <span className={service.active ? "status-text status-active" : "status-text status-inactive"}>
                      {service.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <small>{links.filter((link) => link.serviceId === service.id).length} vínculo(s)</small>
                </div>

                {!service.active && (
                  <p className="muted-note">Serviço inativo: não será oferecido no chatbot.</p>
                )}

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
                          onChange={(event) =>
                            void updateLink(service, professional, event.target.checked)
                          }
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
      </section>
    </div>
  );
}
