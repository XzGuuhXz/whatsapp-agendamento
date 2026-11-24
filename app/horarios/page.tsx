"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type BusinessHour = { id?: string; day_of_week: number; opens_at: string; closes_at: string; active: boolean };
const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const defaults = (): BusinessHour[] => days.map((_, day_of_week) => ({ day_of_week, opens_at: "08:00", closes_at: "17:00", active: false }));

export default function HoursPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hours, setHours] = useState<BusinessHour[]>(defaults());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const loadHours = useCallback(async () => {
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("business_hours")
      .select("id, day_of_week, opens_at, closes_at, active").order("day_of_week");
    if (queryError) setError("Não foi possível carregar os horários. Confirme se a migration de acesso à agenda foi aplicada.");
    else {
      const rows = defaults();
      for (const item of data ?? []) rows[item.day_of_week] = { ...item, opens_at: item.opens_at.slice(0, 5), closes_at: item.closes_at.slice(0, 5) };
      setHours(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(checkAccess); }, [checkAccess]);
  useEffect(() => { if (authorized) void Promise.resolve().then(loadHours); }, [authorized, loadHours]);

  function change(day: number, patch: Partial<BusinessHour>) {
    setHours((current) => current.map((item) => item.day_of_week === day ? { ...item, ...patch } : item));
  }
  async function save() {
    setError(""); setMessage("");
    for (const item of hours) {
      if (item.active && (!item.opens_at || !item.closes_at || item.closes_at <= item.opens_at)) {
        setError("Em cada dia ativo, o fechamento precisa ser posterior à abertura.");
        return;
      }
    }
    setSaving(true);
    const payload = hours.map(({ day_of_week, opens_at, closes_at, active }) => ({ day_of_week, opens_at: opens_at || "08:00", closes_at: closes_at || "17:00", active }));
    const { error: saveError } = await supabase.from("business_hours").upsert(payload, { onConflict: "day_of_week" });
    if (saveError) setError("Não foi possível salvar o expediente. Verifique as permissões do Supabase.");
    else { setMessage("Horários de funcionamento salvos."); await loadHours(); }
    setSaving(false);
  }
  async function logout() { await supabase.auth.signOut(); router.replace("/"); }

  if (checking) return <main className="auth-screen"><section className="auth-card">Verificando acesso...</section></main>;
  if (!authorized) return <main className="auth-screen"><section className="auth-card"><h1>Acesso restrito</h1><p>Entre pelo painel com uma conta de funcionário autorizada.</p><Link className="primary-button" href="/">Ir para o login</Link></section></main>;

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div><Link href="/" className="agenda-back">← Painel SAE</Link><h1>Horários de funcionamento</h1><p>Configure o expediente usado pelo chatbot para oferecer horários.</p></div>
        <button className="secondary-button" onClick={() => void logout()}>Sair</button>
      </header>
      <section className="surface-card agenda-card">
        <div className="form-card-heading"><h2>Expediente semanal</h2><p>Os horários são considerados no fuso America/Campo_Grande.</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        {loading ? <p className="list-empty">Carregando expediente...</p> : (
          <div className="hours-list">
            {hours.map((item) => (
              <div className={"hours-row " + (!item.active ? "hours-disabled" : "")} key={item.day_of_week}>
                <label className="hours-day"><input type="checkbox" checked={item.active} onChange={(event) => change(item.day_of_week, { active: event.target.checked })} />{days[item.day_of_week]}</label>
                <label className="hours-time">Abertura<input type="time" value={item.opens_at} disabled={!item.active} onChange={(event) => change(item.day_of_week, { opens_at: event.target.value })} /></label>
                <label className="hours-time">Fechamento<input type="time" value={item.closes_at} disabled={!item.active} onChange={(event) => change(item.day_of_week, { closes_at: event.target.value })} /></label>
                <span className="hours-state">{item.active ? "Aberto" : "Fechado"}</span>
              </div>
            ))}
          </div>
        )}
        <div className="form-actions"><button className="primary-button" onClick={() => void save()} disabled={saving || loading}>{saving ? "Salvando..." : "Salvar expediente"}</button><button className="secondary-button" onClick={() => void loadHours()} disabled={loading || saving}>Recarregar</button></div>
      </section>
      <p className="agenda-privacy">Antes de ativar o chatbot para o público, confirme os dias e horários com a coordenação do SAE.</p>
    </main>
  );
}
