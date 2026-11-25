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

**Atualização na branch `feat/dashboard-liquid-glass`:** a permissão mínima foi formalizada na migration `202611240006_reception_client_join_permission.sql`; `tests/database.sql` agora exige `SELECT(id)` para `authenticated` e confirma ausência desse privilégio para `anon`. O resultado do CI desta revisão deve ser conferido antes de considerar a correção validada.

## 6.6 O que não foi validado

- Teste ponta a ponta com credenciais reais da Meta não foi confirmado.
- Deploy público do painel não foi confirmado.
- Fluxo de produção com cadastros oficiais do SAE não foi confirmado.
- Testes de carga e recuperação operacional de produção não foram registrados.
- A migration 006 está somente na branch de dashboard e ainda não foi aplicada ao Supabase remoto.

## 6.7 Critério de conclusão

Uma alteração só deve ser marcada como concluída quando:
- código e migration estão versionados;
- testes relevantes passam;
- comportamento via API/PostgREST foi verificado;
- segurança e privilégios foram revisados;
- CI passa;
- ambiente remoto é alterado somente após autorização;
- documentação reflete o estado real.
