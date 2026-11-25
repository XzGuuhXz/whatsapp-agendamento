"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  active: boolean;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, active")
      .order("name", { ascending: true });

    if (queryError) {
      setError("Não foi possível carregar os serviços. " + queryError.message);
      setServices([]);
    } else {
      setServices((data ?? []) as Service[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadServices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadServices]);

  function resetForm() {
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
    setMessage("");
    setError("");
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const minutes = Number(duration);
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));

    if (serviceName.trim().length < 2) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
      setError("A duração deve ser um número inteiro entre 5 e 480 minutos.");
      return;
    }
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError("Informe um valor válido ou deixe o campo em branco.");
      return;
    }

    setSaving(true);
    const payload = {
      name: serviceName.trim(),
      duration_minutes: minutes,
      price: parsedPrice,
    };

    const result = editingId
      ? await supabase.from("services").update(payload).eq("id", editingId)
      : await supabase.from("services").insert(payload);

    if (result.error) {
      setError("Não foi possível salvar. Confira as permissões e os campos da tabela services.");
    } else {
      setMessage(editingId ? "Serviço atualizado." : "Serviço cadastrado.");
      resetForm();
      await loadServices();
    }
    setSaving(false);
  }

  async function toggleService(service: Service) {
    setError("");
    setMessage("");
    const { error: updateError } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);

    if (updateError) {
      setError("Não foi possível alterar o status do serviço. " + updateError.message);
    } else {
      setMessage(service.active ? "Serviço desativado." : "Serviço reativado.");
      await loadServices();
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Serviços</h1>
          <p>Consulte e mantenha os serviços disponíveis para agendamento.</p>
        </div>
      </header>

      <p className="help-text">
        Cadastre somente os serviços confirmados pela coordenação. Não inclua dados de pacientes.
      </p>

      <div className="management-grid">
        <section className="surface-card">
          <div className="section-header">
            <h2>Serviços cadastrados</h2>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void loadServices()}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>

          {error && (
            <div className="error-box" role="alert">
              <p>{error}</p>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void loadServices()}
                disabled={loading}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <p className="state-message">Carregando serviços...</p>
          ) : error ? null : services.length === 0 ? (
            <p className="state-message">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table catalog-table">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Duração</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td><strong>{service.name}</strong></td>
                      <td>{service.duration_minutes} min</td>
                      <td>
                        {service.price == null
                          ? "—"
                          : service.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td>
                        <span className={service.active ? "status-text status-active" : "status-text status-inactive"}>
                          {service.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" onClick={() => startEdit(service)}>Editar</button>
                          <button type="button" onClick={() => void toggleService(service)}>
                            {service.active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="surface-card compact-form-card">
          <div className="section-header">
            <h2>{editingId ? "Editar serviço" : "Novo serviço"}</h2>
          </div>
          <form className="compact-form" onSubmit={saveService}>
            <label htmlFor="service-name">Nome do serviço</label>
            <input
              id="service-name"
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              placeholder="Nome confirmado"
              required
              maxLength={120}
            />
            <label htmlFor="service-duration">Duração (minutos)</label>
            <input
              id="service-duration"
              type="number"
              min="5"
              max="480"
              step="5"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              required
            />
            <label htmlFor="service-price">Valor (opcional)</label>
            <input
              id="service-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Deixe em branco se não se aplica"
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="success-message" role="status">{message}</p>}
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar serviço"}
              </button>
              {editingId && (
                <button className="button button-secondary" type="button" onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
