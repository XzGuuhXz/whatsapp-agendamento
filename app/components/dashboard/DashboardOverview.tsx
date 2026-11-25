"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
type Props = { displayName: string; activeServices: number; activeProfessionals: number };
type Metric = {
  id: string;
  label: string;
  value: number;
  previous: number;
  values: number[];
  accent: "cyan" | "violet" | "green" | "rose";
  icon: "calendar" | "check" | "completed" | "cancelled";
};

const TIME_ZONE = "America/Campo_Grande";
const UTC_OFFSET = "-04:00";

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
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

function relationName<T extends { name: string }>(value: Relation<T>): string {
  if (Array.isArray(value)) return value[0]?.name ?? "Não informado";
  return value?.name ?? "Não informado";
}

function initials(value: string): string {
  return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase("pt-BR") || "SA";
}

function statusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    scheduled: "Pendente", confirmed: "Confirmado", completed: "Concluído",
    cancelled: "Cancelado", no_show: "Não compareceu",
  };
  return labels[status];
}

function formatAppointmentDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE, day: "2-digit", month: "short",
  }).format(new Date(value));
}

function formatAppointmentTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(day: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE, weekday: "short", day: "2-digit",
  }).format(new Date(day + "T12:00:00" + UTC_OFFSET));
}

function Sparkline({ values, accent }: { values: number[]; accent: Metric["accent"] }) {
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: values.length <= 1 ? 2 : (index / (values.length - 1)) * 112 + 2,
    y: 30 - (value / maximum) * 24,
  }));
  const path = points.map((point, index) => (index === 0 ? "M" : "L") + " " + point.x + " " + point.y).join(" ");
  return <svg className={"sae-sparkline sae-sparkline-" + accent} viewBox="0 0 116 34" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MetricIcon({ kind }: { kind: Metric["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {kind === "calendar" && <><rect {...common} x="3.5" y="5" width="17" height="15" rx="3" /><path {...common} d="M8 3.5v3M16 3.5v3M4 9.5h16M8 13h3M8 16.5h6" /></>}
      {kind === "check" && <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="m8.3 12.1 2.4 2.4 5-5.2" /></>}
      {kind === "completed" && <><path {...common} d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" /><path {...common} d="m7.5 12 2.6 2.6 6.4-6.2" /></>}
      {kind === "cancelled" && <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="m9 9 6 6m0-6-6 6" /></>}
    </svg>
  );
}

function Trend({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  if (previous === 0) return <span className="sae-trend sae-trend-neutral">Sem base anterior</span>;
  const change = Math.round(((current - previous) / previous) * 100);
  const isUp = change > 0;
  const isDown = change < 0;
  const favorable = inverse ? isDown : isUp;
  const tone = change === 0 ? "neutral" : favorable ? "positive" : "negative";
  const symbol = isUp ? "↑" : isDown ? "↓" : "→";
  return <span className={"sae-trend sae-trend-" + tone}>{symbol} {Math.abs(change)}% <small>vs. semana anterior</small></span>;
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5V5.5M4 18.5h16M7 15l4-4 3 2 5-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function DashboardOverview({ displayName, activeServices, activeProfessionals }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const today = dateKey(new Date());

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    const start = dayStartIso(shiftDay(today, -13));
    const end = dayStartIso(shiftDay(today, 7));
    const { data, error: queryError } = await supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, clients(name), services(name), professionals(name)")
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: false });

    if (queryError) {
      setAppointments([]);
      setError("Não foi possível carregar os indicadores. Confira a conexão e as permissões da agenda no Supabase.");
    } else {
      setAppointments((data ?? []) as unknown as Appointment[]);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, [today]);

  useEffect(() => { void loadAppointments(); }, [loadAppointments]);

  const computed = useMemo(() => {
    const currentStart = shiftDay(today, -6);
    const previousStart = shiftDay(today, -13);
    const tomorrow = shiftDay(today, 1);
    const currentWeek = appointments.filter((item) => {
      const key = dateKey(new Date(item.starts_at));
      return key >= currentStart && key < tomorrow;
    });
    const previousWeek = appointments.filter((item) => {
      const key = dateKey(new Date(item.starts_at));
      return key >= previousStart && key < currentStart;
    });
    const days = Array.from({ length: 7 }, (_, index) => shiftDay(currentStart, index));
    const metrics: Metric[] = [
      {
        id: "total", label: "Agendamentos", value: currentWeek.length, previous: previousWeek.length,
        values: days.map((day) => currentWeek.filter((item) => dateKey(new Date(item.starts_at)) === day).length),
        accent: "cyan", icon: "calendar",
      },
      {
        id: "confirmed", label: "Confirmados",
        value: currentWeek.filter((item) => item.status === "confirmed").length,
        previous: previousWeek.filter((item) => item.status === "confirmed").length,
        values: days.map((day) => currentWeek.filter((item) => item.status === "confirmed" && dateKey(new Date(item.starts_at)) === day).length),
        accent: "violet", icon: "check",
      },
      {
        id: "completed", label: "Concluídos",
        value: currentWeek.filter((item) => item.status === "completed").length,
        previous: previousWeek.filter((item) => item.status === "completed").length,
        values: days.map((day) => currentWeek.filter((item) => item.status === "completed" && dateKey(new Date(item.starts_at)) === day).length),
        accent: "green", icon: "completed",
      },
      {
        id: "cancelled", label: "Cancelados",
        value: currentWeek.filter((item) => item.status === "cancelled").length,
        previous: previousWeek.filter((item) => item.status === "cancelled").length,
        values: days.map((day) => currentWeek.filter((item) => item.status === "cancelled" && dateKey(new Date(item.starts_at)) === day).length),
        accent: "rose", icon: "cancelled",
      },
    ];
    const chart = days.map((day) => ({
      key: day, label: formatDay(day),
      value: currentWeek.filter((item) => dateKey(new Date(item.starts_at)) === day).length,
    }));
    const completed = metrics.find((metric) => metric.id === "completed")?.value ?? 0;
    const completionRate = currentWeek.length ? Math.round((completed / currentWeek.length) * 100) : 0;
    const now = Date.now();
    const upcoming = appointments.filter((item) => {
      const key = dateKey(new Date(item.starts_at));
      return key >= tomorrow && key < shiftDay(today, 7);
    }).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const recent = currentWeek.filter((item) => new Date(item.starts_at).getTime() < now)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    const agendaItems = [...upcoming, ...recent].slice(0, 5);
    const todayCount = currentWeek.filter((item) => dateKey(new Date(item.starts_at)) === today).length;
    return { metrics, chart, currentWeek, completionRate, agendaItems, todayCount, completed };
  }, [appointments, today]);

  const chartPoints = useMemo(() => {
    const values = computed.chart.map((item) => item.value);
    const maxValue = Math.max(1, ...values);
    const left = 35, right = 690, top = 24, bottom = 174;
    const step = (right - left) / Math.max(1, values.length - 1);
    return values.map((value, index) => ({
      x: left + step * index,
      y: bottom - (value / maxValue) * (bottom - top),
      value,
    }));
  }, [computed.chart]);

  const linePath = chartPoints.reduce((path, point, index) => {
    if (index === 0) return "M " + point.x + " " + point.y;
    const previous = chartPoints[index - 1];
    const middle = (previous.x + point.x) / 2;
    return path + " C " + middle + " " + previous.y + ", " + middle + " " + point.y + ", " + point.x + " " + point.y;
  }, "");
  const areaPath = chartPoints.length
    ? linePath + " L " + chartPoints[chartPoints.length - 1].x + " 190 L " + chartPoints[0].x + " 190 Z"
    : "";
  const selectedPoint = hoveredDay === null ? null : chartPoints[hoveredDay];
  const selectedLabel = hoveredDay === null ? null : computed.chart[hoveredDay];

  return (
    <div className="sae-overview">
      <div className="sae-page-heading">
        <div>
          <span className="sae-eyebrow">CENTRAL DE ATENDIMENTO · SAE</span>
          <h1>Visão geral</h1>
          <p>Olá, {displayName}. Aqui está o panorama da agenda.</p>
        </div>
        <div className="sae-heading-actions">
          <span className="sae-live-indicator"><i /> Dados do Supabase</span>
          <button className="sae-refresh-button" type="button" onClick={() => void loadAppointments()} disabled={loading}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {loading ? "Atualizando" : "Atualizar"}
          </button>
        </div>
      </div>

      {error && <div className="sae-data-error" role="alert">{error}</div>}

      <section className="sae-kpi-grid" aria-label="Indicadores dos últimos sete dias">
        {computed.metrics.map((metric) => (
          <article className={"sae-glass-card sae-kpi-card sae-kpi-" + metric.accent} key={metric.id}>
            <div className="sae-kpi-top">
              <span>{metric.label}</span>
              <span className="sae-kpi-icon"><MetricIcon kind={metric.icon} /></span>
            </div>
            <div className="sae-kpi-value">{loading ? "—" : metric.value.toLocaleString("pt-BR")}</div>
            <div className="sae-kpi-bottom">
              <Trend current={metric.value} previous={metric.previous} inverse={metric.id === "cancelled"} />
              <Sparkline values={metric.values} accent={metric.accent} />
            </div>
          </article>
        ))}
      </section>

      <section className="sae-bento-grid">
        <article className="sae-glass-card sae-chart-card">
          <div className="sae-card-heading">
            <div>
              <span className="sae-card-kicker">DESEMPENHO DA AGENDA</span>
              <h2>Atendimentos por dia</h2>
              <p>Volume de agendamentos nos últimos sete dias</p>
            </div>
            <div className="sae-chart-total"><strong>{loading ? "—" : computed.currentWeek.length}</strong><span>no período</span></div>
          </div>
          <div className="sae-chart-wrap">
            <svg className="sae-main-chart" viewBox="0 0 720 225" role="img" aria-label="Gráfico de linha com a quantidade de atendimentos por dia nos últimos sete dias">
              <defs>
                <linearGradient id="sae-chart-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#53d8e7" stopOpacity=".30" />
                  <stop offset="100%" stopColor="#53d8e7" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sae-chart-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#49d9dc" />
                  <stop offset="100%" stopColor="#9a84ff" />
                </linearGradient>
              </defs>
              {[34, 82, 130, 178].map((y) => <line key={y} x1="35" x2="690" y1={y} y2={y} className="sae-chart-gridline" />)}
              {areaPath && <path d={areaPath} fill="url(#sae-chart-fill)" />}
              {linePath && <path d={linePath} fill="none" stroke="url(#sae-chart-line)" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" />}
              {chartPoints.map((point, index) => (
                <g key={computed.chart[index].key}>
                  <circle cx={point.x} cy={point.y} r={hoveredDay === index ? 8 : 5} className="sae-chart-point-halo" />
                  <circle
                    cx={point.x} cy={point.y} r="3.6" className="sae-chart-point"
                    tabIndex={0} role="button"
                    aria-label={computed.chart[index].label + ": " + point.value + " atendimentos"}
                    onMouseEnter={() => setHoveredDay(index)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onFocus={() => setHoveredDay(index)}
                    onBlur={() => setHoveredDay(null)}
                  />
                  <text x={point.x} y="213" textAnchor="middle" className="sae-chart-label">{computed.chart[index].label}</text>
                </g>
              ))}
            </svg>
            {selectedPoint && selectedLabel && (
              <div className="sae-chart-tooltip" style={{ left: ((selectedPoint.x / 720) * 100) + "%", top: (Math.max(0, (selectedPoint.y / 225) * 100 - 13)) + "%" }}>
                <strong>{selectedPoint.value} atendimentos</strong><span>{selectedLabel.label}</span>
              </div>
            )}
          </div>
          <div className="sae-chart-footer"><span><i className="sae-legend-dot" /> Agendamentos registrados</span><span>Fuso horário: Campo Grande</span></div>
        </article>

        <article className="sae-glass-card sae-insight-card">
          <div className="sae-card-heading sae-card-heading-compact">
            <div><span className="sae-card-kicker">RESUMO OPERACIONAL</span><h2>Conclusão dos atendimentos</h2></div>
            <span className="sae-mini-icon"><ChartIcon /></span>
          </div>
          <div className="sae-progress-block">
            <div className="sae-progress-ring" style={{ background: "conic-gradient(#56d6ce " + (computed.completionRate * 3.6) + "deg, rgba(255,255,255,.08) 0deg)" }}>
              <div><strong>{loading ? "—" : computed.completionRate + "%"}</strong><span>concluídos</span></div>
            </div>
            <div className="sae-progress-copy">
              <strong>{loading ? "—" : computed.completed + " de " + computed.currentWeek.length}</strong>
              <span>atendimentos concluídos nesta semana</span>
            </div>
          </div>
          <div className="sae-operational-stats">
            <div><span className="sae-stat-bullet sae-bullet-violet" /><span>Profissionais ativos</span><strong>{activeProfessionals}</strong></div>
            <div><span className="sae-stat-bullet sae-bullet-cyan" /><span>Serviços ativos</span><strong>{activeServices}</strong></div>
            <div><span className="sae-stat-bullet sae-bullet-green" /><span>Agendamentos de hoje</span><strong>{loading ? "—" : computed.todayCount}</strong></div>
          </div>
          <Link className="sae-text-link" href="/agenda">Abrir agenda completa <span>↗</span></Link>
        </article>

        <article className="sae-glass-card sae-activity-card">
          <div className="sae-card-heading">
            <div><span className="sae-card-kicker">ACOMPANHAMENTO</span><h2>Agenda em destaque</h2><p>Próximos horários e atendimentos recentes do período</p></div>
            <Link className="sae-card-link" href="/agenda">Ver agenda <span>↗</span></Link>
          </div>
          {loading ? <div className="sae-activity-empty">Carregando atendimentos...</div> : computed.agendaItems.length === 0 ? (
            <div className="sae-activity-empty">
              <span className="sae-empty-calendar"><MetricIcon kind="calendar" /></span>
              <strong>Nenhum atendimento neste período</strong>
              <span>Quando houver agendamentos, eles aparecerão aqui.</span>
            </div>
          ) : (
            <div className="sae-activity-list">
              {computed.agendaItems.map((item) => {
                const formattedDate = formatAppointmentDate(item.starts_at);
                const formattedTime = formatAppointmentTime(item.starts_at);
                return (
                  <div className="sae-activity-row" key={item.id}>
                    <div className="sae-activity-date"><strong>{formattedDate}</strong><span>{formattedTime}</span></div>
                    <div className="sae-activity-main"><div className="sae-activity-title"><span className="sae-activity-avatar">{initials(relationName(item.clients))}</span><strong>{relationName(item.clients)}</strong></div><span>{relationName(item.services)} <i>·</i> {relationName(item.professionals)}</span></div>
                    <span className={"sae-status-pill sae-status-" + item.status}>{statusLabel(item.status)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="sae-glass-card sae-shortcuts-card">
          <div className="sae-card-heading sae-card-heading-compact">
            <div><span className="sae-card-kicker">ROTINAS DO SAE</span><h2>Acesso rápido</h2></div>
          </div>
          <Link className="sae-shortcut-row" href="/agenda"><span className="sae-shortcut-icon"><MetricIcon kind="calendar" /></span><span><strong>Agenda diária</strong><small>Consultar e atualizar atendimentos</small></span><b>↗</b></Link>
          <Link className="sae-shortcut-row" href="/horarios"><span className="sae-shortcut-icon">◷</span><span><strong>Horários</strong><small>Expediente semanal</small></span><b>↗</b></Link>
          <Link className="sae-shortcut-row" href="/vinculos"><span className="sae-shortcut-icon">⇄</span><span><strong>Vínculos</strong><small>Serviços por profissional</small></span><b>↗</b></Link>
          <div className="sae-updated-at">{lastUpdated ? "Atualizado às " + lastUpdated.toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }) : "Aguardando atualização"}</div>
        </article>
      </section>
    </div>
  );
}
