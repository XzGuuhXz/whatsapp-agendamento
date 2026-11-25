"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type BusinessHour = {
  id?: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  active: boolean;
};

const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const defaults = (): BusinessHour[] =>
  days.map((_, day_of_week) => ({
    day_of_week,
    opens_at: "08:00",
    closes_at: "17:00",
    active: false,
  }));

export default function HoursPage() {
  const [hours, setHours] = useState<BusinessHour[]>(defaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadHours = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("business_hours")
      .select("id, day_of_week, opens_at, closes_at, active")
      .order("day_of_week");

    if (queryError) {
      setError("Não foi possível carregar os horários. " + queryError.message);
    } else {
      const rows = defaults();
      for (const item of data ?? []) {
        rows[item.day_of_week] = {
          ...item,
          opens_at: item.opens_at.slice(0, 5),
          closes_at: item.closes_at.slice(0, 5),
        };
      }
      setHours(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHours();
  }, [loadHours]);

  function change(day: number, patch: Partial<BusinessHour>) {
    setHours((current) =>
      current.map((item) =>
        item.day_of_week === day ? { ...item, ...patch } : item
      )
    );
  }

  async function save() {
    setError("");
    setMessage("");
    for (const item of hours) {
      if (item.active && (!item.opens_at || !item.closes_at || item.closes_at <= item.opens_at)) {
        setError("Em cada dia ativo, o fechamento precisa ser posterior à abertura.");
        return;
      }
    }

    setSaving(true);
    const payload = hours.map(({ day_of_week, opens_at, closes_at, active }) => ({
      day_of_week,
      opens_at: opens_at || "08:00",
      closes_at: closes_at || "17:00",
      active,
    }));
    const { error: saveError } = await supabase
      .from("business_hours")
      .upsert(payload, { onConflict: "day_of_week" });

    if (saveError) {
      setError("Não foi possível salvar o expediente. " + saveError.message);
    } else {
      setMessage("Horários de funcionamento salvos.");
      await loadHours();
    }
    setSaving(false);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Horários de funcionamento</h1>
          <p>Configure o expediente usado para oferecer horários de atendimento.</p>
        </div>
      </header>

      <section className="surface-card">
        <div className="section-header">
          <div>
            <h2>Expediente semanal</h2>
            <p className="section-description">Fuso horário: America/Campo_Grande.</p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void loadHours()}
            disabled={loading || saving}
          >
            Recarregar
          </button>
        </div>

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void loadHours()}
              disabled={loading || saving}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {message && <p className="success-message" role="status">{message}</p>}

        {loading ? (
          <p className="state-message">Carregando expediente...</p>
        ) : (
          <div className="hours-list">
            {hours.map((item) => (
              <div className={"hours-row" + (!item.active ? " hours-disabled" : "")} key={item.day_of_week}>
                <label className="hours-day">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(event) => change(item.day_of_week, { active: event.target.checked })}
                  />
                  {days[item.day_of_week]}
                </label>
                <label className="hours-field">
                  <span>Abertura</span>
                  <input
                    type="time"
                    value={item.opens_at}
                    disabled={!item.active}
                    onChange={(event) => change(item.day_of_week, { opens_at: event.target.value })}
                  />
                </label>
                <label className="hours-field">
                  <span>Fechamento</span>
                  <input
                    type="time"
                    value={item.closes_at}
                    disabled={!item.active}
                    onChange={(event) => change(item.day_of_week, { closes_at: event.target.value })}
                  />
                </label>
                <span className="hours-state">{item.active ? "Aberto" : "Fechado"}</span>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
          >
            {saving ? "Salvando..." : "Salvar expediente"}
          </button>
        </div>
      </section>
    </div>
  );
}
