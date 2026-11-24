# Visão geral e arquitetura

**Data de referência:** 24/11/2026  
**Branch documentada:** `feat/service-professional-links`

## 1. Objetivo

O sistema oferece agendamento de atendimentos por WhatsApp e um painel web interno para que funcionários autorizados mantenham o catálogo, o expediente, os vínculos de atendimento e consultem a agenda. O Supabase/PostgreSQL é a fonte persistente de dados e das regras transacionais.

O sistema foi desenvolvido para o contexto do SAE. Os dados operacionais reais (serviços, profissionais, expediente e vínculos) devem ser fornecidos e confirmados pela coordenação responsável; não devem ser presumidos nem preenchidos com dados fictícios em produção.

## 2. Tecnologias identificadas

| Camada | Tecnologia |
|---|---|
| Aplicação web | Next.js 16.3.5, React 19.2.8, TypeScript |
| Persistência | PostgreSQL gerenciado pelo Supabase |
| Autenticação do painel | Supabase Auth |
| Autorização | Row Level Security (RLS) e privilégios PostgreSQL |
| Cliente web | `@supabase/supabase-js` |
| Integração oficial de WhatsApp | WhatsApp Cloud API da Meta |
| Transporte alternativo de desenvolvimento | Baileys em worker Node.js independente |
| Qualidade | ESLint, TypeScript, testes Node.js/HTTP e testes SQL |
| CI | GitHub Actions |

As versões acima refletem os arquivos de dependências consultados nesta branch; devem ser atualizadas quando os manifests forem alterados.

## 3. Componentes

### 3.1 Aplicação Next.js

- `/`: interface inicial/conexão e acesso ao painel.
- `/agenda`: consulta diária de agendamentos e atualização do status.
- `/horarios`: configuração do expediente semanal.
- `/vinculos`: associação entre serviços e profissionais.
- `/api/webhook`: verificação GET e recebimento POST de eventos do WhatsApp Cloud API.
- `/api/outbox`: endpoint autenticado para processar respostas pendentes no transporte Meta.
- `src/lib/supabase/client.ts`: cliente Supabase utilizado no navegador.
- `src/lib/supabase/admin.ts`: cliente privilegiado de servidor; não deve ser importado por componentes client-side.

### 3.2 Banco Supabase

O PostgreSQL armazena clientes, serviços, profissionais, agendamentos, expediente, bloqueios, sessões, mensagens, fila de respostas, perfis internos e vínculos serviço-profissional. Funções RPC executam o fluxo transacional do chatbot.

As migrations pressupõem a existência do schema-base legado do chatbot. A sequência versionada não é um instalador autossuficiente de um banco vazio.

### 3.3 Worker Baileys

O worker em `worker/` é um processo Node.js separado do Next.js. Ele:

- Mantém a conexão WhatsApp via Baileys.
- Encaminha mensagens individuais de texto para `chatbot_receive`.
- Consome a fila persistente `chatbot_outbox`.
- Tenta reconectar após desconexões.
- Usa o mesmo banco e o mesmo fluxo de negócio da integração Meta.

Baileys é uma biblioteca não oficial. Seu uso está documentado para testes locais e eventual operação controlada, não como substituto oficial ou garantia de estabilidade da API da Meta.

## 4. Fluxo de mensagem — transporte Meta

1. A Meta envia um evento ao endpoint HTTPS `/api/webhook`.
2. O endpoint GET responde ao desafio de verificação do webhook.
3. O POST valida a assinatura HMAC SHA-256 sobre o corpo bruto.
4. O código filtra o número empresarial configurado e processa as mensagens recebidas.
5. A aplicação chama a RPC transacional `chatbot_receive`.
6. A RPC serializa o processamento por telefone, evita duplicidade pelo ID da mensagem, registra a mensagem e atualiza a sessão.
7. A resposta é gravada em `chatbot_outbox`.
8. O endpoint `/api/outbox`, acionado por um agendador externo, reivindica itens e envia respostas pela Cloud API.
9. O resultado do envio é registrado por funções de finalização da fila.

O envio de respostas depende de um agendador externo periódico. O endpoint está implementado, mas o agendador de produção não foi criado automaticamente.

## 5. Fluxo de mensagem — Baileys

1. O worker conecta uma sessão autorizada e, na primeira execução, solicita pareamento por QR Code.
2. Mensagens próprias, grupos, broadcast/status e conteúdos que não sejam texto são ignorados.
3. O worker obtém o número a partir do JID de telefone; para LID, tenta o JID alternativo e o mapeamento disponível no Baileys.
4. A mensagem é enviada à RPC `chatbot_receive`, com prefixo de identificação `baileys:`.
5. O loop do worker reivindica e envia respostas da mesma `chatbot_outbox`.

A configuração `WHATSAPP_TRANSPORT` seleciona o transporte. No modo Baileys, os endpoints Meta retornam HTTP 409 para evitar processamento duplicado. Não executar dois transportes de envio simultaneamente para a mesma operação.

## 6. Fluxo de agendamento

1. O usuário seleciona agendar, consultar, cancelar ou remarcar.
2. Para novo agendamento, escolhe serviço.
3. O chatbot apresenta somente profissionais ativos vinculados ao serviço.
4. O usuário escolhe data e horário disponível.
5. O sistema coleta o nome e pede confirmação.
6. Na confirmação, o banco revalida expediente, bloqueios, vínculo e conflito de horário antes de persistir.
7. Consultas, cancelamentos e remarcações são limitados aos agendamentos associados ao telefone da sessão.

A disponibilidade considera o fuso configurado (padrão `America/Campo_Grande`), slots de 15 minutos, duração do serviço e horizonte de até 90 dias. A regra final é validada no banco, não apenas na interface.

## 7. Fluxo do painel interno

1. O funcionário autentica-se com Supabase Auth.
2. A aplicação verifica se existe `staff_profiles` ativo para o usuário.
3. As policies RLS autorizam apenas os papéis internos previstos (`admin` e `recepcao`).
4. O painel carrega catálogos e módulos permitidos.
5. A agenda exibe somente os dados operacionais necessários, conforme privilégios e policies.

Não existe autoinscrição pública de funcionários. A criação e a alteração de perfis internos são operações administrativas controladas.

## 8. Limites arquiteturais conhecidos

- O expediente é global para o estabelecimento, não individual por profissional.
- O modelo atual não contempla pausas intradiárias estruturadas.
- O worker Baileys não processa mídia, grupos ou mensagens interativas.
- O armazenamento de sessão Baileys atual usa `useMultiFileAuthState`; a documentação da biblioteca não o recomenda como solução ideal de produção.
- O envio externo pode ser repetido após falha de rede em janela ambígua; não há garantia de entrega exatamente uma vez.
- Não há deploy de produção confirmado nesta data.