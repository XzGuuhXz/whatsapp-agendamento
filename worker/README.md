# Worker WhatsApp (Baileys)

Processo Node.js independente do Next.js. O Supabase continua sendo a fonte de verdade para sessões, agendamentos e fila de respostas.

## Pré-requisitos

- Node.js 20 ou superior (preferencialmente uma versão LTS suportada).
- A migration `202611040001_chatbot_integration.sql` já aplicada no Supabase.
- Um número WhatsApp autorizado para conectar e testar.
- VPS com armazenamento persistente para a sessão.

> Baileys é uma biblioteca não oficial, sem vínculo com a Meta/WhatsApp. O uso pode estar sujeito a instabilidade e às regras do serviço. Não é uma forma garantida de remover restrições de uma conta.

## Instalação

Na raiz do repositório:

```bash
cd worker
npm install
cp .env.example .env
```

Preencha o ambiente de forma privada. Não coloque a chave `SUPABASE_SERVICE_ROLE_KEY` no frontend, no GitHub ou em logs. Em produção, prefira um arquivo de ambiente protegido pelo sistema de serviços em vez de manter segredos em `.env`.

O diretório definido em `BAILEYS_AUTH_DIR` precisa existir em armazenamento persistente e ser gravável apenas pelo usuário Linux que executa o worker. A autenticação contém material sensível; não copie a pasta para o Git e não a exponha por HTTP.

## Primeiro pareamento

Execute o worker em terminal:

```bash
npm start
```

Leia o QR Code pelo WhatsApp em **Aparelhos conectados**. Depois que a conexão abrir, mantenha o processo ativo. O estado de autenticação fica no diretório configurado.

## Seleção do transporte

Defina `WHATSAPP_TRANSPORT=baileys` no ambiente do Next.js e no ambiente do worker. Com essa seleção:

- O POST do webhook Meta responde HTTP 409 e não processa mensagens.
- O endpoint HTTP de outbox responde HTTP 409 e não envia pela Meta.
- O worker Baileys recebe mensagens e consome a mesma `chatbot_outbox` do Supabase.

Isso evita manter Meta e Baileys enviando respostas simultaneamente. Para voltar à Meta, pare o worker e defina `WHATSAPP_TRANSPORT=meta` (ou remova a variável) no Next.js. Reative o webhook e o agendador Meta somente depois.

## Limitações atuais

- Somente mensagens de texto recebidas em chats individuais com JID `@s.whatsapp.net` são processadas.
- JIDs LID, grupos, canais, status, mídia e mensagens interativas são ignorados. Não se presume que um LID seja um número de telefone.
- O worker usa `useMultiFileAuthState`, que a própria documentação do Baileys não recomenda como armazenamento ideal de produção. Para operação prolongada, substitua por armazenamento de credenciais criptografado e com backup protegido.
- A entrega da outbox é resiliente, mas uma queda entre o envio ao WhatsApp e a confirmação no Supabase pode causar repetição. Não há garantia de entrega exatamente uma vez.
- Execute apenas uma instância do worker por sessão/diretório de autenticação.

## Verificação

```bash
npm run typecheck
```

Faça os primeiros testes com um número de teste autorizado e sem enviar mensagens para clientes reais.
