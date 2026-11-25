# 8. Pendências, limitações e decisões

## 8.1 Pendências prioritárias

### P0 — Permissão de relacionamento na agenda
- [ ] Formalizar em migration a concessão mínima `SELECT(id)` em `public.clients` para `authenticated`.
- [ ] Confirmar que a migration mantém bloqueados `phone` e `email`.
- [ ] Confirmar que `appointments.notes` permanece inacessível.
- [ ] Testar o endpoint PostgREST autenticado, não somente SQL direto.
- [ ] Executar testes SQL e CI.
- [ ] Aplicar ao remoto somente após revisão e autorização explícita, caso a mudança seja necessária naquele ambiente.

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
- [ ] Reconciliar HEAD remoto e local das branches relevantes.
- [ ] Revisar estado e destino das PRs #1–#3.
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
- A correção local de `clients.id` ainda precisa ser versionada.

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
