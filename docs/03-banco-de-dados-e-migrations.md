# 3. Banco de dados e migrations

## 3.1 Princípios

- PostgreSQL é a fonte de verdade para reservas e disponibilidade.
- Alterações estruturais devem ser versionadas em `supabase/migrations/`.
- RLS controla quais linhas podem ser vistas ou alteradas.
- Privilégios SQL controlam se uma role pode acessar tabelas e colunas.
- RLS e privilégios são camadas distintas e ambas precisam estar corretas.
- Não conceder acesso amplo apenas para eliminar erros do PostgREST.
- Nunca executar migrations novamente em um banco sem conferir o histórico de migrations.

## 3.2 Entidades

| Entidade | Responsabilidade |
|---|---|
| `staff_profiles` | Papel e estado ativo dos funcionários |
| `services` | Catálogo de serviços e duração |
| `professionals` | Cadastro de profissionais |
| `service_professionals` | Vínculos entre serviços e profissionais |
| `business_hours` | Expediente semanal global |
| `clients` | Dados mínimos do paciente/cliente |
| `appointments` | Reservas, horários e status |
| `conversation_sessions` | Estado do diálogo |
| `messages` | Registro de mensagens |
| `chatbot_outbox` | Fila de envio e controle de tentativas |
| tabelas auxiliares | Bloqueios, configurações e estado transacional |

Consulte os arquivos SQL para tipos, índices, constraints, funções e triggers exatos.

## 3.3 Sequência de migrations conhecida

Os nomes abaixo foram identificados nas descrições das PRs e nos arquivos referenciados. Antes de aplicar, confira a lista real em `supabase/migrations/` e o histórico do banco.

| Migration | Escopo | Observação |
|---|---|---|
| `202611240001_reception_staff_access.sql` | Perfis de funcionários e acesso ao catálogo | Descrita na documentação do painel |
| `202611240002_reception_agenda_access.sql` | Acesso à agenda e expediente | Funcionários ativos; atualização limitada ao status |
| `202611240003_service_professional_links.sql` | Relação serviço-profissional | Aplicada ao projeto conectado conforme PR #3 |
| `202611240004_service_professional_reverse_lookup.sql` | Índice/consulta reversa dos vínculos | Complementa a relação serviço-profissional |
| `202611240005_reception_patient_data_minimization.sql` | Minimização de dados pessoais na recepção | Aplicada ao remoto em 24/11/2026 conforme registro operacional |
| `202611240006_reception_client_join_permission.sql` | Permissão mínima para resolver o JOIN com o nome do paciente | Criada na branch `feat/dashboard-liquid-glass`; ainda não aplicada ao remoto |

Pode haver migrations anteriores da integração WhatsApp/Supabase. Não inferir a lista completa somente a partir desta tabela.

## 3.4 Migration 005 — minimização de dados

Arquivo: `202611240005_reception_patient_data_minimization.sql`

Objetivos:
- revogar leitura ampla das tabelas `appointments` e `clients`;
- conceder às contas autenticadas somente as colunas necessárias à agenda;
- permitir acesso ao nome do paciente sem expor telefone e e-mail;
- impedir leitura de observações de agendamento;
- restringir linhas de clientes a registros vinculados a agendamentos e funcionários ativos.

A migration concede:
- em `appointments`: `id`, `client_id`, `service_id`, `professional_id`, `starts_at`, `ends_at`, `status`;
- em `clients`: `name`.

O teste automatizado incluído verifica que campos pessoais e observações não sejam acessíveis às roles inadequadas.

## 3.5 Diagnóstico local de 24/11/2026

Sintoma: a agenda retornava HTTP 403 e erro PostgreSQL `42501 permission denied for table appointments`.

Diagnóstico:
1. A requisição do navegador continha sessão Bearer com role `authenticated`.
2. O teste SQL de leitura das colunas permitidas em `appointments` passou.
3. O JOIN como role `authenticated` falhou em `clients`.
4. A role tinha `SELECT(name)`, mas não `SELECT(id)` em `clients`.
5. O relacionamento usa `clients.id` como chave referenciada.

Correção aplicada **somente no banco local**:
```sql
GRANT SELECT (id) ON public.clients TO authenticated;
```

Verificação:
- o JOIN entre `appointments`, `clients`, `services` e `professionals` passou;
- a agenda local exibiu o nome do paciente, serviço, profissional, horário e status.

A concessão foi formalizada no repositório na migration `202611240006_reception_client_join_permission.sql`, na branch `feat/dashboard-liquid-glass`. Ela concede somente `SELECT(id)` a `authenticated` e revoga essa coluna de `PUBLIC` e `anon`. A migration 005 continua limitando a leitura de dados pessoais.

**Estado:** implementada na branch e coberta por asserções em `tests/database.sql`; ainda depende do CI, revisão e aplicação autorizada no ambiente remoto.

## 3.6 Migration 006 — chave de relacionamento do paciente

Arquivo: `202611240006_reception_client_join_permission.sql`

- Concede `SELECT(id)` em `public.clients` à role `authenticated`, necessário para o PostgREST resolver `appointments -> clients(name)`.
- Revoga leitura de `id` de `PUBLIC` e `anon`.
- Não concede acesso a `phone`, `email` ou observações de agendamento.
- Não altera políticas RLS nem concede leitura irrestrita de linhas.

A migration está versionada na branch de interface, mas não foi aplicada no Supabase remoto.

## 3.7 Ambientes e aplicação

### Local
- Supabase em Docker.
- REST API observada: `http://127.0.0.1:54321`.
- PostgreSQL local observado na porta `54322`.
- Container observado: `supabase_db_whatsapp-agendamento`.

### Remoto
- Projeto Supabase conectado identificado nos registros operacionais.
- Migration 005 aplicada e verificada em 24/11/2026.
- Não há autorização para reaplicar migrations remotamente sem revisão e aprovação específicas.

### CI
- O workflow prepara schema-base sem dados e aplica migrations no banco efêmero.
- Testes SQL são executados após a aplicação.

## 3.8 Procedimento seguro de migration

1. Conferir a branch e o estado do working tree.
2. Conferir migrations existentes e histórico local/remoto.
3. Criar migration usando o mecanismo oficial do Supabase CLI.
4. Revisar SQL e impacto em RLS/privilégios.
5. Aplicar primeiro no banco local.
6. Executar testes SQL e testes de API/PostgREST.
7. Revisar advisors e políticas de segurança quando aplicável.
8. Submeter a alteração ao CI.
9. Aplicar ao remoto somente com autorização explícita.
10. Verificar o registro da migration e o comportamento real.

Nunca usar `GRANT SELECT ON TABLE` como atalho quando o requisito é conceder acesso somente a colunas específicas.
