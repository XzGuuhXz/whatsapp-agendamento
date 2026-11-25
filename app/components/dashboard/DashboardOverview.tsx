"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
type Relation<T> = T | T[] | null;

type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  clients: Relation<{ name: string }>;
  services: Relation<{ name: string }>;
  professionals: Relation<{ name: string }>;
};

const TIME_ZONE = "America/Campo_Grande";
const UTC_OFFSET = "-04:00";

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function shiftDay(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + amount));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function dayStartIso(day: string): string {
  return new Date(day + "T00:00:00" + UTC_OFFSET).toISOString();
}

function relatedName<T extends { name: string }>(value: Relation<T>): string {
  if (Array.isArray(value)) return value[0]?.name ?? "Não informado";
  return value?.name ?? "Não informado";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function AppointmentTable({
  appointments,
  showDate = false,
}: {
  appointments: Appointment[];
  showDate?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table appointment-table">
        <thead>
          <tr>
            <th>{showDate ? "Data e hora" : "Hora"}</th>
            <th>Paciente</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td>
                {showDate ? (
                  <span className="date-time-cell">
                    <strong>{formatDate(appointment.starts_at)}</strong>
                    <span>{formatTime(appointment.starts_at)}</span>
                  </span>
                ) : (
                  <strong>{formatTime(appointment.starts_at)}</strong>
                )}
              </td>
              <td>{relatedName(appointment.clients)}</td>
              <td>{relatedName(appointment.services)}</td>
              <td>{relatedName(appointment.professionals)}</td>
              <td>
                <span className={"status-text status-" + appointment.status}>
                  {statusLabels[appointment.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardOverview() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [activeServices, setActiveServices] = useState<number | null>(null);
  const [activeProfessionals, setActiveProfessionals] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = dateKey(new Date());

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const start = dayStartIso(today);
    const end = dayStartIso(shiftDay(today, 7));

    const [appointmentResult, serviceResult, professionalResult] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, clients(name), services(name), professionals(name)")
        .gte("starts_at", start)
        .lt("starts_at", end)
        .order("starts_at", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, duration_minutes, price, active")
        .order("name", { ascending: true }),
      supabase
        .from("professionals")
        .select("id, name, active")
        .order("name", { ascending: true }),
    ]);

    const firstError =
      appointmentResult.error ?? serviceResult.error ?? professionalResult.error;

    setAppointments(
      appointmentResult.error
        ? null
        : ((appointmentResult.data ?? []) as unknown as Appointment[])
    );
    setActiveServices(
      serviceResult.error
        ? null
        : (serviceResult.data ?? []).filter((service) => service.active).length
    );
    setActiveProfessionals(
      professionalResult.error
        ? null
        : (professionalResult.data ?? []).filter((professional) => professional.active).length
    );

    if (firstError) {
      setError("Não foi possível carregar todos os dados do início. " + firstError.message);
    }

    setLoading(false);
  }, [today]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const todayAppointments = useMemo(
    () =>
      (appointments ?? [])
        .filter((item) => dateKey(new Date(item.starts_at)) === today)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [appointments, today]
  );

  const upcomingAppointments = useMemo(
    () =>
      (appointments ?? [])
        .filter((item) => {
          const appointmentDay = dateKey(new Date(item.starts_at));
          return (
            appointmentDay > today &&
            (item.status === "scheduled" || item.status === "confirmed")
          );
        })
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 8),
    [appointments, today]
  );

  const totals = useMemo(
    () => ({
      total: todayAppointments.length,
      pending: todayAppointments.filter((item) => item.status === "scheduled").length,
      confirmed: todayAppointments.filter((item) => item.status === "confirmed").length,
    }),
    [todayAppointments]
  );

  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const showCatalogWarning =
    !loading &&
    ((activeServices === 0) || (activeProfessionals === 0));

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Início</h1>
          <p>Atendimentos de hoje e próximos agendamentos.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </header>

      <div className="day-summary" aria-live="polite">
        <span className="summary-date">Hoje, {todayLabel}</span>
        <span>Total <strong>{loading || appointments === null ? "—" : totals.total}</strong></span>
        <span>Pendentes <strong>{loading || appointments === null ? "—" : totals.pending}</strong></span>
        <span>Confirmados <strong>{loading || appointments === null ? "—" : totals.confirmed}</strong></span>
      </div>

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {showCatalogWarning && (activeServices === 0 || activeProfessionals === 0) && (
        <p className="help-text">
          {activeServices === 0 && activeProfessionals === 0
            ? "Não há serviços ou profissionais ativos. Cadastre somente os itens confirmados pela coordenação."
            : activeServices === 0
              ? "Não há serviços ativos. Cadastre somente os serviços confirmados pela coordenação."
              : "Não há profissionais ativos. Cadastre somente os profissionais confirmados pela coordenação."}
        </p>
      )}

      <section className="surface-card">
        <div className="section-header">
          <h2>Atendimentos de hoje</h2>
          <span>{loading || appointments === null ? "—" : todayAppointments.length}</span>
        </div>
        {loading ? (
          <p className="state-message">Carregando atendimentos...</p>
        ) : appointments === null ? (
          <p className="state-message">A lista está indisponível enquanto a consulta falha.</p>
        ) : todayAppointments.length === 0 ? (
          <p className="state-message">Nenhum atendimento para hoje.</p>
        ) : (
          <AppointmentTable appointments={todayAppointments} />
        )}
      </section>

      <section className="surface-card">
        <div className="section-header">
          <h2>Próximos atendimentos</h2>
          <span>{loading || appointments === null ? "—" : upcomingAppointments.length}</span>
        </div>
        {loading ? (
          <p className="state-message">Carregando próximos atendimentos...</p>
        ) : appointments === null ? (
          <p className="state-message">A lista está indisponível enquanto a consulta falha.</p>
        ) : upcomingAppointments.length === 0 ? (
          <p className="state-message">Nenhum próximo atendimento no período consultado.</p>
        ) : (
          <AppointmentTable appointments={upcomingAppointments} showDate />
        )}
      </section>
    </div>
  );
}
