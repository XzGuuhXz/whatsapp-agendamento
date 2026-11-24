import { flushOutbox } from "./outbox.js";
import { runConnectionLoop } from "./connection.js";

if (process.env.WHATSAPP_TRANSPORT?.trim().toLowerCase() !== "baileys") {
  throw new Error("Worker não iniciado: defina WHATSAPP_TRANSPORT=baileys no ambiente.");
}

let stopping = false;

async function runOutboxLoop(): Promise<void> {
  while (!stopping) {
    try {
      const sent = await flushOutboxSocket();
      if (sent > 0) console.log(`Respostas enviadas: ${sent}`);
    } catch (error) {
      console.error("Falha ao processar a fila de respostas:", error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

// A conexão é inicializada antes do consumidor da fila para evitar claims
// enquanto não existe um transporte disponível.
let activeSocket: Awaited<ReturnType<typeof import("./connection.js").connectBaileys>> | null = null;

async function flushOutboxSocket(): Promise<number> {
  if (!activeSocket) return 0;
  return flushOutbox(activeSocket, 10);
}

const shutdown = () => {
  if (stopping) return;
  stopping = true;
  activeSocket?.end(undefined);
  console.log("Encerrando worker...");
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

async function main(): Promise<void> {
  const { connectBaileys } = await import("./connection.js");

  while (!stopping) {
    try {
      activeSocket = await connectBaileys();
      const outboxTask = runOutboxLoop();

      await new Promise<void>((resolve) => {
        activeSocket!.ev.on("connection.update", ({ connection }) => {
          if (connection === "close") resolve();
        });
      });

      activeSocket = null;
      stopping = true;
      await outboxTask;
    } catch (error) {
      activeSocket = null;
      console.error("Falha na conexão:", error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

void main().catch((error) => {
  console.error("Erro fatal no worker:", error);
  process.exitCode = 1;
});
