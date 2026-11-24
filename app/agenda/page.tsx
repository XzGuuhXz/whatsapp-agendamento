"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Related<T> = T | T[] | null;
type Appointment = {
  id: string; starts_at: string; ends_at: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  clients: Related<{ name: string }>;
  services: Related<{ name: string }>;
  professionals: Related<{ name: string }>;
};
const statusLabels: Record<Appointment["status"], string> = {
  scheduled: "Pendente", confirmed: "Confirmado", completed: "Concluído",
  cancelled: "Cancelado", no_show: "Não compareceu",
};
function relatedName<T extends { name: string }>(value: Related<T>): string {
  if (Array.isArray(value)) return value[0]?.name ?? "—";
  return value?.name ?? "—";
}
function todayLocal() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}
function localDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande", dateStyle: "short", timeStyle: "short" });
}
export default function AgendaPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [date, setDate] = useState(todayLocal);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const checkAccess = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) { setAuthorized(false); setChecking(false); return; }
    const { data, error: profileError } = await supabase.from("staff_profiles")
      .select("active, role").eq("user_id", sessionData.session.user.id).maybeSingle();
    setAuthorized(!profileError && Boolean(data?.active));
    setChecking(false);
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoading(true); setError("");
    const start = new Date(date + "T00:00:00-04:00").toISOString();
    const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase.from("appointments")
      .select("id, starts_at, ends_at, status, clients(name), services(name), professionals(name)")
      .gte("starts_at", start).lt("starts_at", end).order("starts_at", { ascending: true });
    if (queryError) {
      setError("Não foi possível carregar a agenda. Confirme se a migration de acesso à agenda foi aplicada.");
      setAppointments([]);
    } else setAppointments((data ?? []) as unknown as Appointment[]);
    setLoading(false);
  }, [date]);

  useEffect(() => { void Promise.resolve().then(checkAccess); }, [checkAccess]);
  useEffect(() => { if (authorized) void Promise.resolve().then(loadAppointments); }, [authorized, loadAppointments]);

  async function updateStatus(id: string, status: Appointment["status"]) {
    setError(""); setMessage("");
    const { error: updateError } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (updateError) setError("Não foi possível atualizar o status. Verifique as permissões.");
    else { setMessage("Status do agendamento atualizado."); await loadAppointments(); }
  }
  async function logout() { await supabase.auth.signOut(); router.replace("/"); }

  if (checking) return <main className="auth-screen"><section className="auth-card">Verificando acesso...</section></main>;
  if (!authorized) return <main className="auth-screen"><section className="auth-card"><h1>Acesso restrito</h1><p>Entre pelo painel com uma conta de funcionário autorizada.</p><Link className="primary-button" href="/">Ir para o login</Link></section></main>;

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div><Link href="/" className="agenda-back">← Painel SAE</Link><h1>Agenda de atendimentos</h1><p>Consulta interna dos agendamentos do dia.</p></div>
        <button className="secondary-button" onClick={() => void logout()}>Sair</button>
      </header>
      <section className="surface-card agenda-card">
        <div className="agenda-toolbar">
          <label htmlFor="agenda-date">Data da agenda</label>
          <input id="agenda-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <button className="secondary-button" onClick={() => void loadAppointments()} disabled={loading}>Atualizar</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        {loading ? <p className="list-empty">Carregando agendamentos...</p> : appointments.length === 0 ? (
          <div className="list-empty"><strong>Nenhum agendamento nesta data</strong><p>Quando houver agendamentos, eles aparecerão aqui.</p></div>
        ) : (
          <div className="service-table-wrap">
            <table className="service-table agenda-table">
              <thead><tr><th>Horário</th><th>Paciente</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Atualizar status</th></tr></thead>
              <tbody>{appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td><strong>{localDateTime(appointment.starts_at)}</strong></td>
                  <td>{relatedName(appointment.clients)}</td><td>{relatedName(appointment.services)}</td><td>{relatedName(appointment.professionals)}</td>
                  <td><span className={"service-status " + (appointment.status === "confirmed" || appointment.status === "completed" ? "active" : appointment.status === "cancelled" ? "inactive" : "")}>{statusLabels[appointment.status]}</span></td>
                  <td><select aria-label={"Status do agendamento de " + relatedName(appointment.clients)} value={appointment.status} onChange={(event) => void updateStatus(appointment.id, event.target.value as Appointment["status"])}>
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      <p className="agenda-privacy">Acesso restrito a funcionários autorizados. Consulte somente os dados necessários ao atendimento.</p>
    </main>
  );
}
