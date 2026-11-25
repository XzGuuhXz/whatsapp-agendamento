# 8. Pendências, limitações e decisões

## 8.1 Pendências prioritárias

### P0 — Permissão de relacionamento na agenda
- [x] Formalizar na branch `feat/sae-simple-admin` a concessão mínima `SELECT(id)` em `public.clients` para `authenticated`, via migration 006.
- [x] Manter `phone` e `email` sem leitura para `authenticated`.
- [x] Manter `appointments.notes` inacessível conforme migration 005.
- [x] Confirmar testes SQL/CI da migration 006 (CI #167).
- [ ] Testar o endpoint PostgREST com uma sessão real de funcionário.
- [x] Aplicar migration 006 ao Supabase remoto em 25/11/2026 e verificar os privilégios por coluna.

### P1 — Dados operacionais do SAE
- [ ] Confirmar lista oficial de serviços e respectivas durações.
- [ ] Confirmar lista de profissionais e situação ativa.
- [ ] Cadastrar vínculos serviço-profissional aprovados.
- [ ] Confirmar expediente semanal e eventuais exceções.
- [ ] Validar a agenda com dados de teste antes de qualquer operação real.

### P1 — Integração WhatsApp
- [ ] Confirmar configuração do webhook Meta em URL HTTPS pública.
- [ ] Validar assinatura e recebimento com credenciais de teste autorizadas.
- [ ] Confirmar execução periódica do endpoint de outbox.
- [ ] Definir monitoramento, alertas e procedimento de recuperação.
- [ ] Decidir oficialmente se o transporte será Meta Cloud API ou Baileys.

### P2 — Evolução do modelo
- [ ] Avaliar pausas intradiárias.
- [ ] Avaliar expediente e disponibilidade individual por profissional.
- [ ] Definir feriados, bloqueios excepcionais e regras de capacidade.
- [ ] Definir retenção e minimização do histórico de mensagens.
- [ ] Definir procedimento administrativo de criação, desativação e revisão de funcionários.

### P2 — Entrega
- [x] Reconciliar o HEAD remoto das branches relevantes.
- [x] Mesclar PR #1 em `main`.
- [ ] Consolidar a versão atual do painel em um único PR para `main` e encerrar os PRs #2 e #3 substituídos.
- [ ] Definir ambiente de hospedagem e processo de deploy.
- [ ] Executar teste ponta a ponta em ambiente controlado.
- [ ] Preparar plano de rollback e operação.

## 8.2 Decisões já registradas

| Tema | Decisão/estado |
|---|---|
| Autenticação do painel | Supabase Auth |
| Perfis | `admin` e `recepcao`, condicionados a perfil ativo |
| Cadastro de funcionários | Sem cadastro público; associação administrativa |
| Identificação de login | E-mail cadastrado, pessoal ou institucional |
| Agenda da recepção | Exibe dados mínimos operacionais |
| Expediente | Sem horário presumido; configuração semanal global |
| Vínculos | Profissionais oferecidos conforme vínculo com serviço |
| Segurança de pacientes | Minimização por coluna e RLS |
| Deploy | Não confirmado |
| Transporte WhatsApp | Meta Cloud API e worker Baileys existem no histórico; decisão operacional final ainda deve ser registrada |

## 8.3 Limitações conhecidas

- O expediente é global, sem pausas intradiárias ou agenda individual por profissional.
- Serviços, profissionais, vínculos e horários reais precisam ser cadastrados e confirmados.
- A integração Meta depende de credenciais e configuração externa.
- Baileys é um transporte não oficial e tem limitações funcionais e riscos próprios.
- Não há deploy público confirmado.
- A documentação histórica de `main` pode estar desatualizada em relação às branches de desenvolvimento.
- A migration 006 foi aplicada ao Supabase remoto em 25/11/2026; falta somente validar o relacionamento via PostgREST usando uma sessão real de funcionário.

## 8.4 Critérios para considerar o projeto pronto para operação

- [ ] Branch/release estável definida e PRs integradas conforme decisão do responsável.
- [ ] CI passa.
- [ ] Migrations aplicadas e verificadas no ambiente correto.
- [ ] RLS e privilégios testados com usuário real de recepção e role anônima.
- [ ] Cadastros operacionais validados pelo SAE.
- [ ] Expediente e vínculos confirmados.
- [ ] Teste ponta a ponta concluído.
- [ ] Segredos e credenciais armazenados adequadamente.
- [ ] Deploy e monitoramento configurados.
- [ ] Procedimento de suporte, rollback e resposta a incidentes documentado.
