"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Related<T> = T | T[] | null;
type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  clients: Related<{ name: string }>;
  services: Related<{ name: string }>;
  professionals: Related<{ name: string }>;
};

const statusLabels: Record<Appointment["status"], string> = {
  scheduled: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

function relatedName<T extends { name: string }>(value: Related<T>): string {
  if (Array.isArray(value)) return value[0]?.name ?? "—";
  return value?.name ?? "—";
}

function todayLocal() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Campo_Grande",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function localTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: "America/Campo_Grande",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgendaPage() {
  const [date, setDate] = useState(todayLocal);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    const start = new Date(date + "T00:00:00-04:00").toISOString();
    const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, clients(name), services(name), professionals(name)")
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true });

    if (queryError) {
      setError("Não foi possível carregar a agenda. " + queryError.message);
      setAppointments([]);
    } else {
      setAppointments((data ?? []) as unknown as Appointment[]);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAppointments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAppointments]);

  async function updateStatus(id: string, status: Appointment["status"]) {
    setError("");
    setMessage("");
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setError("Não foi possível atualizar o status. " + updateError.message);
    } else {
      setMessage("Status do agendamento atualizado.");
      await loadAppointments();
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Agenda de atendimentos</h1>
          <p>Consulte os agendamentos e atualize o status.</p>
        </div>
      </header>

      <section className="surface-card">
        <div className="filter-row">
          <label htmlFor="agenda-date">Data da agenda</label>
          <input
            id="agenda-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void loadAppointments()}
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
              onClick={() => void loadAppointments()}
              disabled={loading}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {message && <p className="success-message" role="status">{message}</p>}

        {loading ? (
          <p className="state-message">Carregando agendamentos...</p>
        ) : error ? null : appointments.length === 0 ? (
          <p className="state-message">Nenhum agendamento nesta data.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table agenda-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Paciente</th>
                  <th>Serviço</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td><strong>{localTime(appointment.starts_at)}</strong></td>
                    <td>{relatedName(appointment.clients)}</td>
                    <td>{relatedName(appointment.services)}</td>
                    <td>{relatedName(appointment.professionals)}</td>
                    <td>
                      <select
                        className={"status-select status-" + appointment.status}
                        aria-label={"Status do agendamento de " + relatedName(appointment.clients)}
                        value={appointment.status}
                        onChange={(event) =>
                          void updateStatus(appointment.id, event.target.value as Appointment["status"])
                        }
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
