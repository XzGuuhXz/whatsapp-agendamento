"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type Professional = {
  id: string;
  name: string;
  active: boolean;
};

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("professionals")
      .select("id, name, active")
      .order("name", { ascending: true });

    if (queryError) {
      setError("Não foi possível carregar os profissionais. " + queryError.message);
      setProfessionals([]);
    } else {
      setProfessionals((data ?? []) as Professional[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfessionals();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProfessionals]);

  function resetForm() {
    setProfessionalName("");
    setEditingId(null);
  }

  function startEdit(professional: Professional) {
    setProfessionalName(professional.name);
    setEditingId(professional.id);
    setMessage("");
    setError("");
  }

  async function saveProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (professionalName.trim().length < 2) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    setSaving(true);
    const result = editingId
      ? await supabase.from("professionals").update({ name: professionalName.trim() }).eq("id", editingId)
      : await supabase.from("professionals").insert({ name: professionalName.trim() });

    if (result.error) {
      setError("Não foi possível salvar. Verifique as permissões e a estrutura da tabela professionals.");
    } else {
      setMessage(editingId ? "Profissional atualizado." : "Profissional cadastrado.");
      resetForm();
      await loadProfessionals();
    }
    setSaving(false);
  }

  async function toggleProfessional(professional: Professional) {
    setError("");
    setMessage("");
    const { error: updateError } = await supabase
      .from("professionals")
      .update({ active: !professional.active })
      .eq("id", professional.id);

    if (updateError) {
      setError("Não foi possível alterar o status do profissional. " + updateError.message);
    } else {
      setMessage(professional.active ? "Profissional desativado." : "Profissional reativado.");
      await loadProfessionals();
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Profissionais</h1>
          <p>Consulte e mantenha a equipe que poderá receber agendamentos.</p>
        </div>
      </header>

      <p className="help-text">
        Cadastre somente profissionais confirmados pela coordenação. Não inclua dados de pacientes.
      </p>

      <div className="management-grid">
        <section className="surface-card">
          <div className="section-header">
            <h2>Profissionais cadastrados</h2>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void loadProfessionals()}
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
                onClick={() => void loadProfessionals()}
                disabled={loading}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <p className="state-message">Carregando profissionais...</p>
          ) : error ? null : professionals.length === 0 ? (
            <p className="state-message">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table professional-table">
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {professionals.map((professional) => (
                    <tr key={professional.id}>
                      <td><strong>{professional.name}</strong></td>
                      <td>
                        <span className={professional.active ? "status-text status-active" : "status-text status-inactive"}>
                          {professional.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" onClick={() => startEdit(professional)}>Editar</button>
                          <button type="button" onClick={() => void toggleProfessional(professional)}>
                            {professional.active ? "Desativar" : "Ativar"}
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
            <h2>{editingId ? "Editar profissional" : "Novo profissional"}</h2>
          </div>
          <form className="compact-form" onSubmit={saveProfessional}>
            <label htmlFor="professional-name">Nome do profissional</label>
            <input
              id="professional-name"
              value={professionalName}
              onChange={(event) => setProfessionalName(event.target.value)}
              placeholder="Nome conforme cadastro institucional"
              required
              maxLength={100}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="success-message" role="status">{message}</p>}
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar profissional"}
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
