import { timingSafeEqual } from "node:crypto";
import { flushOutbox } from "@/lib/chatbot";
export const runtime = "nodejs";
// Agendador externo: POST com Authorization: Bearer <CRON_SECRET>.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  try { return Response.json({ sent: await flushOutbox() }); }
  catch { return Response.json({ error: "Falha temporária no envio" }, { status: 503 }); }
}
