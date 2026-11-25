"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const [status, setStatus] = useState("Testando conexão...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from("services")
        .select("id")
        .limit(1);

      if (error) {
        console.log("Supabase:", error);

        setStatus(
          "Não foi possível consultar os serviços. Verifique a configuração e as permissões do Supabase."
        );

        return;
      }

      setStatus("Supabase conectado com sucesso!");
    }

    testConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-8 text-center shadow-sm">
        <h1 className="mb-4 text-2xl font-bold">
          WhatsApp Agendamento
        </h1>

        <p>{status}</p>
      </div>
    </main>
  );
}

