import { getAdmin } from "./supabase/admin";
import { type IncomingMessage, sendText } from "./whatsapp";
import { requiredEnv } from "./env";
export async function receiveMessage(message: IncomingMessage): Promise<void> {
  const { error } = await getAdmin().rpc("chatbot_receive", {
    p_message_id: message.id, p_phone: message.phone, p_text: message.text,
    p_name: message.name, p_timezone: requiredEnv("BUSINESS_TIMEZONE"),
  });
  if (error) throw new Error(`Processamento do chatbot: ${error.code ?? "erro"}`);
}
export async function flushOutbox(phone: string | null = null, limit = 20): Promise<number> {
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { data, error } = await getAdmin().rpc("chatbot_claim_reply", { p_phone: phone });
    if (error) throw new Error(`Fila de respostas: ${error.code}`);
    const reply = data?.[0];
    if (!reply) break;
    try {
      const whatsappId = await sendText(reply.phone, reply.content);
      const { error: finishError } = await getAdmin().rpc("chatbot_finish_reply", {
        p_id: reply.id, p_claim: reply.claim_token, p_whatsapp_id: whatsappId, p_error: null,
      });
      if (finishError) throw new Error(`Registro de envio: ${finishError.code}`);
      sent++;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Falha de envio";
      const { error: finishError } = await getAdmin().rpc("chatbot_finish_reply", {
        p_id: reply.id, p_claim: reply.claim_token, p_whatsapp_id: null, p_error: reason.slice(0, 200),
      });
      if (finishError) console.error("Falha ao liberar tentativa", finishError.code);
      throw error;
    }
  }
  return sent;
}
