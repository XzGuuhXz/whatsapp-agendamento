# WhatsApp Agendamento

Chatbot de agendamento em português com Next.js, TypeScript, Supabase e WhatsApp Cloud API da Meta.

## O que está implementado

- Webhook GET de verificação e POST autenticado por HMAC SHA-256 sobre o corpo bruto.
- Processamento de todas as mensagens do lote e filtragem pelo ID do número da empresa.
- Menu: agendar, consultar, cancelar e remarcar; confirmação antes de gravar ou cancelar.
- Serviço → profissional → data → horário → nome → confirmação.
- Consulta ao expediente, bloqueios globais, profissionais/serviços ativos e reservas existentes.
- Horários em intervalos de 15 minutos, duração conforme serviço, até 90 dias à frente.
- Sessões por telefone, reinício após 30 minutos e comando `menu` a qualquer momento.
- Transação por mensagem, bloqueio por telefone e deduplicação por ID do WhatsApp.
- Fila persistente de respostas com tentativas, lease de envio e registro de mensagens enviadas.

## Atualizar e executar

Requer Node.js 22 ou superior.

```bash
cd ~/whatsapp-agendamento
git fetch origin
git switch feat/whatsapp-supabase-integration
npm ci
cp .env.example .env.local
```

Se você já tem `.env.local`, preserve-o e acrescente apenas as variáveis novas do exemplo.
Preencha as credenciais localmente. Em seguida:

```bash
npm run dev
```

Para produção: `npm run build` e `npm start`, ou publique em uma hospedagem compatível com Next.js.
Configure todas as variáveis também nessa hospedagem. Uma URL HTTPS pública é necessária para o webhook.
O site inicial continua sendo um teste de conexão; o painel administrativo não foi implementado.

## Entrar na Meta e pegar os dados

1. Acesse [Meta for Developers — Meus aplicativos](https://developers.facebook.com/apps/) e faça login.
2. Abra/crie um aplicativo com o produto/caso de uso do WhatsApp.
3. Na configuração da API do WhatsApp, obtenha o token de acesso, o **Phone number ID** e a versão da Graph API mostrada no exemplo de requisição.
4. Use esses dados em `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_API_VERSION`.
5. Em configurações básicas do aplicativo, obtenha o **App secret** para `WHATSAPP_APP_SECRET`.
6. Crie um valor aleatório para `WHATSAPP_VERIFY_TOKEN`; ele não é fornecido pela Meta.
7. Para os testes, adicione/verifique o telefone destinatário permitido no painel da Meta. Tokens temporários expiram: para produção, configure um token apropriado de usuário do sistema com as permissões necessárias.

Os nomes das telas podem variar. Referência: [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).
Nunca envie tokens em chats ou commits. A chave `service_role` também fica exclusivamente no servidor.

## Configurar o webhook

No aplicativo da Meta, configure:

- Callback URL: `https://SEU-DOMINIO/api/webhook`.
- Verify token: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
- Inscrição no campo `messages` da conta WhatsApp Business correspondente.

Mensagens de status não geram respostas. Áudio, imagem e outros tipos recebem orientação para enviar texto.
Não há modo que desative a verificação de assinatura.

## Supabase

A integração usa o projeto existente `dylipirsdywzitppzjjh`. A migração de integração deste repositório **já foi aplicada nesse projeto** durante a implementação; não a execute novamente nele.

Os arquivos em `supabase/migrations/` documentam os ajustes de acesso e a integração. A migração de integração requer as oito tabelas originais, a unicidade de `conversation_sessions.phone` e o acesso de servidor já configurados. Não é um instalador completo para um banco vazio.

As funções `chatbot_receive`, `chatbot_claim_reply` e `chatbot_finish_reply` são acessíveis somente ao `service_role`. As tabelas com dados pessoais ficam inacessíveis ao cliente público; o site pode ler somente serviços ativos.

Antes de testar pelo WhatsApp, cadastre no Table Editor:

- `services`: nome, duração positiva, preço e `active=true`.
- `professionals`: nome e `active=true`.
- `business_hours`: confirme os horários existentes (segunda a sexta 08h–18h; sábado 08h–12h).

O fuso padrão é `America/Campo_Grande`; ajuste `BUSINESS_TIMEZONE` ao estabelecimento. Os bloqueios de `blocked_times` afetam todos os profissionais. Atualmente todos os profissionais podem atender todos os serviços; especialidades e agendas individuais exigem uma ampliação do modelo.

O banco impede sobreposição para o mesmo profissional. A RPC revalida a disponibilidade na confirmação e preserva a reserva antiga até concluir a remarcação.

## Reenvio de respostas

Configure um agendador externo para chamar **a cada minuto**:

```text
POST https://SEU-DOMINIO/api/outbox
Authorization: Bearer VALOR_DE_CRON_SECRET
```

Esse agendamento é necessário para recuperar falhas de rede sem depender de uma nova mensagem do cliente. O código do endpoint está pronto, mas nenhum agendador externo foi criado automaticamente.

O webhook tenta enviar imediatamente; falhas ficam na fila. Há espera de 30 segundos após falha e lease de 2 minutos para recuperar workers interrompidos. Respostas são expiradas após 23 horas; lembretes fora da janela de atendimento exigem templates e não foram implementados.

O agendamento é idempotente por mensagem. O envio externo é **pelo menos uma vez**: se a Meta aceitar o envio e a conexão cair antes da confirmação local, uma resposta pode ser repetida. O banco não recria o agendamento nesse caso. `sent` significa aceito pela API, não confirmação de entrega ou leitura.

## Validação

```bash
npm test
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npm run test:http
```

`tests/database.sql` testa o fluxo no SQL Editor e descarta os dados com `ROLLBACK`. Use em ambiente de desenvolvimento, com nomes de teste e pelo menos um dia de funcionamento disponível. Não envia mensagens pela Meta.

Teste real após configurar: envie `oi`, percorra um agendamento, consulte, remarque e cancele. Confira `messages`, `appointments`, `conversation_sessions` e `chatbot_outbox` no Supabase.

## Fora desta entrega

Painel administrativo, lembretes por template, integração com atendente humano e relatórios. A conexão real com a Meta depende das credenciais, do cadastro do número e da publicação do webhook.
