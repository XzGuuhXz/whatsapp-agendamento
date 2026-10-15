# WhatsApp Agendamento

Aplicação em desenvolvimento para integrar agendamentos com WhatsApp. O estado atual é um scaffold: a página verifica a conexão com o Supabase e a rota `/api/webhook` responde à verificação GET da Meta e aceita POSTs, mas ainda não processa eventos nem cria agendamentos.

## Requisitos

- Node.js 20 ou superior
- Projeto Supabase com a tabela `services` para a verificação inicial
- Token de verificação do webhook configurado no servidor

## Desenvolvimento

```bash
npm ci
cp .env.example .env.local
# preencha .env.local localmente; nunca faça commit desse arquivo
npm run dev
```

A aplicação fica em `http://localhost:3000`. Valide alterações com:

```bash
npm run lint
npm run build
```

## Variáveis de ambiente

| Variável | Uso | Exposição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Pública no bundle do navegador |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable do Supabase; restrinja o acesso com políticas RLS | Pública no bundle do navegador |
| `WHATSAPP_VERIFY_TOKEN` | Token definido para validar o handshake do webhook | Somente servidor |

Use `.env.local` para valores reais e não coloque chaves `service_role` no navegador. O arquivo `banco.txt` é local e está ignorado pelo Git.

## Limitações atuais

- O webhook POST ainda não valida assinatura nem processa eventos.
- A aplicação ainda não implementa o fluxo de criação/gestão de agendamentos.
- Não há licença definida para redistribuição neste momento.
