import { createHmac, timingSafeEqual } from "node:crypto";
import { requiredEnv } from "./env";
export function validSignature(body: Buffer, signature: string | null, secret: string): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(body).digest(), Buffer.from(signature.slice(7), "hex"));
}
export type IncomingMessage = { id: string; phone: string; text: string; name: string };
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
export function extractMessages(payload: unknown, phoneNumberId: string): IncomingMessage[] {
  const root = record(payload);
  if (root.object !== "whatsapp_business_account") return [];
  const result: IncomingMessage[] = [];
  for (const entry of array(root.entry)) for (const change of array(record(entry).changes)) {
    const value = record(record(change).value);
    if (record(value.metadata).phone_number_id !== phoneNumberId) continue;
    for (const item of array(value.messages)) {
      const message = record(item);
      if (typeof message.id !== "string" || typeof message.from !== "string" || !/^\d{8,15}$/.test(message.from)) continue;
      const contact = array(value.contacts).map(record).find(c => c.wa_id === message.from);
      const name = record(contact?.profile).name;
      result.push({ id: message.id, phone: message.from,
        text: message.type === "text" && typeof record(message.text).body === "string" ? String(record(message.text).body).slice(0, 4096) : "",
        name: typeof name === "string" ? name.slice(0, 100) : "Cliente WhatsApp" });
    }
  }
  return result;
}
export async function sendText(phone: string, text: string): Promise<string> {
  const version = requiredEnv("WHATSAPP_API_VERSION");
  const phoneId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phoneId)) throw new Error("Versão ou ID Meta inválido");
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${requiredEnv("WHATSAPP_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "text", text: { preview_url: false, body: text } }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Meta HTTP ${response.status}; código ${data.error?.code ?? "desconhecido"}`);
  const id = data.messages?.[0]?.id;
  if (typeof id !== "string") throw new Error("Meta retornou resposta sem ID");
  return id;
}
