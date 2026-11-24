# Worker WhatsApp (Baileys)

Processo Node.js independente do Next.js. O Supabase continua sendo a fonte de verdade para sessões, agendamentos e fila de respostas. Este guia inclui primeiro os testes no computador; a instalação na VPS pode ser feita depois.

## Pré-requisitos

- Node.js 22 ou superior.
- Projeto Supabase existente com as tabelas originais do chatbot.
- Migração `202611040001_chatbot_integration.sql` aplicada uma única vez nesse projeto.
- Um WhatsApp que você tenha autorização para conectar e usar nos testes.

> Baileys é uma biblioteca não oficial, sem vínculo com a Meta/WhatsApp. O uso pode estar sujeito a instabilidade e às regras do serviço. Não é uma forma garantida de remover restrições de uma conta.

## Teste local no computador

Na raiz do repositório, instale as dependências da aplicação e do worker:

```bash
npm ci
npm run worker:install
```

Configure o Next.js:

```bash
cp .env.example .env.local
```

No arquivo `.env.local`, preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Mantenha `WHATSAPP_TRANSPORT=baileys` e o fuso correto.

Configure o worker:

```bash
cp worker/.env.example worker/.env
```

No arquivo `worker/.env`, coloque o mesmo `NEXT_PUBLIC_SUPABASE_URL` e a mesma `SUPABASE_SERVICE_ROLE_KEY` usados pela aplicação. Mantenha `WHATSAPP_TRANSPORT=baileys`. O caminho `BAILEYS_AUTH_DIR=./.baileys-auth` guarda a sessão no seu computador.

Abra dois terminais na raiz do repositório.

**Terminal 1 — iniciar o worker:**

```bash
npm run worker:start
```

Na primeira execução, será exibido um QR Code. No WhatsApp, abra **Aparelhos conectados → Conectar aparelho** e escaneie o código. Mantenha esse terminal aberto.

**Terminal 2 — iniciar o Next.js:**

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`. Envie uma mensagem de texto para o WhatsApp conectado usando outro telefone de teste. A mensagem deverá ser registrada no Supabase, processada pelo chatbot e respondida pelo worker.

Para validar apenas os tipos do worker:

```bash
npm run worker:typecheck
```

Para encerrar, pressione `Ctrl+C` nos dois terminais. A autenticação fica salva em `worker/.baileys-auth`, então normalmente não será necessário escanear o QR Code novamente.

## Banco Supabase: pré-requisito antes de enviar mensagens

O worker não cria tabelas nem executa migrações automaticamente. Ele utiliza estas funções do banco:

- `chatbot_receive`
- `chatbot_claim_reply`
- `chatbot_finish_reply`

Elas e a tabela `chatbot_outbox` são criadas por `supabase/migrations/202611040001_chatbot_integration.sql`. Confirme no Supabase se essa migração já foi aplicada. Caso contrário, aplique-a uma única vez pelo fluxo de migrações do projeto, após confirmar que as tabelas-base necessárias já existem. Não execute novamente se já estiver aplicada. Este worker não faz alterações no banco ao iniciar.

## Transporte Meta e Baileys

Quando `WHATSAPP_TRANSPORT=baileys`:

- O webhook Meta retorna HTTP 409 e não processa mensagens.
- O endpoint HTTP de outbox retorna HTTP 409 e não envia respostas pela Meta.
- O worker Baileys recebe textos individuais e consome a mesma fila `chatbot_outbox`.

Assim não ficam dois transportes respondendo ao mesmo tempo. Para voltar à Meta, pare o worker e defina `WHATSAPP_TRANSPORT=meta` no `.env.local`. Não inicie simultaneamente o envio Meta e o worker Baileys.

## Segurança da sessão

A pasta `worker/.baileys-auth` contém credenciais de sessão sensíveis. Não a envie, não a publique e não a adicione ao Git. O arquivo `worker/.gitignore` já exclui essa pasta e o arquivo `.env` do worker.

Use um número de teste autorizado e não faça os primeiros testes com conversas de clientes reais. Não compartilhe sua chave `SUPABASE_SERVICE_ROLE_KEY`.

## Limitações atuais

- Somente mensagens de texto recebidas em chats individuais com JID `@s.whatsapp.net` são processadas.
- JIDs LID, grupos, canais, status, mídia e mensagens interativas são ignorados. Não se presume que um LID seja um número de telefone.
- O worker usa `useMultiFileAuthState`, que a documentação do Baileys não recomenda como armazenamento ideal de produção. Para operação prolongada, substitua por armazenamento de credenciais criptografado e com backup protegido.
- Uma queda entre o envio ao WhatsApp e a confirmação no Supabase pode causar repetição. Não há garantia de entrega exatamente uma vez.
- Execute apenas uma instância do worker por sessão/diretório de autenticação.

## VPS

A configuração de VPS e do serviço `systemd` está no arquivo `whatsapp-worker.service.example`. Não é necessária para testar no computador.
