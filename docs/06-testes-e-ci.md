# 6. Testes e integração contínua

## 6.1 Estratégia

A validação do projeto combina:
- testes unitários/Node;
- ESLint;
- geração de tipos do Next.js;
- TypeScript;
- build de produção;
- testes HTTP;
- typecheck do worker;
- testes SQL de integração em PostgreSQL/Supabase local.

## 6.2 Comandos locais

```bash
npm test
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npm run test:http
npm run worker:typecheck
```

## 6.3 Testes de banco

O workflow de CI:
1. inicia Supabase local sem aplicar migrations automaticamente;
2. prepara schema estrutural base sem dados reais;
3. aplica migrations versionadas;
4. executa `tests/database.sql`.

Os testes descritos nas PRs cobrem, entre outros:
- seleção de profissionais vinculados ao serviço;
- criação de agendamento;
- validação de datas e disponibilidade;
- remarcação;
- cancelamento;
- deduplicação de mensagens;
- claim/lease da fila outbox;
- registro de mensagens;
- privilégios de leitura por coluna, incluindo a chave `clients.id`;
- bloqueio de acesso anônimo a dados privados.

## 6.4 CI — resultado registrado

- A PR #4 foi mesclada em 24/11/2026.
- Execução CI #112 (ID `45509220207`) passou nos checks de aplicação e no job de banco de dados, conforme registro operacional.
- A mudança do worker para `npm ci` respeita o lockfile e melhora a reprodutibilidade.
- CI #167 (execução 45545275291), no HEAD `f7fd0c5abc641245abd452d9b6dab14a29de2971`, passou nos jobs `checks` e `database`, incluindo build, testes HTTP, worker e PostgreSQL.

## 6.5 Teste manual da agenda local — 24/11/2026

Sintoma inicial:
- endpoint REST `/rest/v1/appointments` respondia HTTP 403;
- PostgreSQL retornava `42501 permission denied for table appointments`.

Diagnóstico e correção:
- sessão do usuário estava autenticada;
- leitura das colunas operacionais de `appointments` passou em teste SQL;
- relacionamento falhava por falta de `SELECT(id)` em `clients`;
- concessão local `GRANT SELECT (id) ON public.clients TO authenticated`;
- JOIN com clientes, serviços e profissionais passou;
- interface exibiu nome do paciente, serviço, profissional, horário e status.

**Atualização na branch `feat/sae-simple-admin`:** a migration `202611240006_reception_client_join_permission.sql` foi validada pelo CI #167 e aplicada ao Supabase remoto em 25/11/2026. A verificação remota confirmou `authenticated_can_select_client_id=true`, `authenticated_can_select_client_name=true`, `authenticated_can_select_client_phone=false`, `authenticated_can_select_client_email=false`, `anon_can_select_client_id=false`, `anon_can_select_client_name=false` e `authenticated_can_select_appointment_notes=false`.

## 6.6 O que não foi validado

- Teste ponta a ponta com credenciais reais da Meta não foi confirmado.
- Deploy público do painel não foi confirmado.
- Fluxo de produção com cadastros oficiais do SAE não foi confirmado.
- Testes de carga e recuperação operacional de produção não foram registrados.
- O teste da API PostgREST com uma sessão real de funcionário ainda precisa ser executado; a verificação atual confirmou os privilégios SQL, mas não substitui o teste HTTP autenticado.

## 6.7 Critério de conclusão

Uma alteração só deve ser marcada como concluída quando:
- código e migration estão versionados;
- testes relevantes passam;
- comportamento via API/PostgREST foi verificado;
- segurança e privilégios foram revisados;
- CI passa;
- ambiente remoto é alterado somente após autorização;
- documentação reflete o estado real.
