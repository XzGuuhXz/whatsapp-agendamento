# Painel da recepção — configuração

O painel usa Supabase Auth para autenticação individual e RLS para limitar o catálogo de serviços a funcionários autorizados.

## 1. Aplicar a migration

No projeto Supabase correto, abra **SQL Editor** e execute o arquivo:

`supabase/migrations/202611240001_reception_staff_access.sql`

A migration cria `public.staff_profiles`, libera a leitura do próprio perfil e permite que funcionários ativos consultem e gerenciem `public.services` e `public.professionals`. Ela não cadastra serviços, funcionários nem altera agendamentos.

## 2. Criar a primeira conta de funcionário

1. No Supabase, abra **Authentication → Users**.
2. Crie manualmente uma conta com o e-mail autorizado e uma senha temporária forte.
3. Copie o UUID do usuário criado.
4. No SQL Editor, associe a conta ao perfil de funcionário:

```sql
INSERT INTO public.staff_profiles (user_id, display_name, role, active)
VALUES (
  'UUID_DO_USUARIO_AUTH',
  'Nome do funcionário',
  'admin',
  true
);
```

Use `admin` somente para quem realmente administrará os acessos. Para a equipe da recepção, use `recepcao`.

A tabela não permite que o próprio usuário crie ou altere seu perfil pela aplicação. A inclusão, desativação e mudança de função devem ser feitas por um administrador autorizado.

## 3. Variáveis de ambiente

A aplicação continua usando as variáveis públicas já existentes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A chave `SUPABASE_SERVICE_ROLE_KEY` não é usada no navegador e não deve receber prefixo `NEXT_PUBLIC_`.

## 4. Testes manuais recomendados

- Entrar com uma conta que tenha perfil ativo.
- Entrar com uma conta Auth sem linha em `staff_profiles`: deve permanecer sem acesso ao painel.
- Cadastrar um serviço de teste, editar duração/nome e desativá-lo.
- Cadastrar um profissional de teste, editar o nome e desativá-lo.
- Sair e entrar novamente para confirmar a persistência.
- Tentar inserir/alterar `services` com uma sessão autenticada sem perfil: a operação deve ser negada por RLS.
- Confirmar que a chave anon não consegue inserir, atualizar ou excluir serviços.

## Observações

- Não existe cadastro público de funcionários.
- Nenhum serviço fictício foi inserido.
- As migrations de acesso, agenda e vínculos já foram aplicadas ao projeto Supabase conectado em 24/11/2026. Nenhuma conta de funcionário foi criada automaticamente.
- Esta etapa ainda não expõe dados de pacientes ou agendamentos no painel.
- O painel carrega os catálogos após confirmar o perfil do funcionário; os módulos clínicos permanecem bloqueados até a próxima etapa.
- Não foi feito deploy.


## Módulos de agenda e expediente

A branch `feat/agenda-recepcao` adiciona as rotas protegidas:

- `/agenda`: consulta os agendamentos por dia e permite atualizar somente o status.
- `/horarios`: configura os horários semanais usados pelo mecanismo de disponibilidade do chatbot.

Antes de usar essas telas no Supabase remoto, aplique as migrations nesta ordem, caso ainda não estejam registradas:

1. `202611240001_reception_staff_access.sql`
2. `202611240002_reception_agenda_access.sql`

A segunda migration concede leitura dos agendamentos e dos nomes dos clientes somente a funcionários ativos; permite atualizar apenas a coluna `status` dos agendamentos; e permite gerenciar `business_hours` por funcionários ativos. O papel `anon` não recebe acesso às tabelas privadas.

O expediente semanal é global para o estabelecimento e usa `America/Campo_Grande`. A tabela atual não oferece pausas no meio do dia nem horários individuais por profissional. Esses recursos exigem uma evolução posterior do modelo e da função de disponibilidade.

A agenda exibe nome do paciente, serviço, profissional, horário e status. Não exibe telefone nem observações clínicas. O acesso continua protegido por autenticação e RLS. Use apenas contas de funcionários autorizados e evite dados reais em testes.

## Testes das telas

1. Entre com uma conta de funcionário ativa.
2. Abra `/horarios`, configure um expediente de teste e salve.
3. Confira no Table Editor se existem no máximo sete registros, um por dia da semana.
4. Abra `/agenda` e escolha uma data com agendamento de teste.
5. Atualize o status e confirme a alteração no banco.
6. Tente abrir as rotas sem autenticação e confirme que o acesso é bloqueado.

Não foi aplicado nenhum seed de serviços, profissionais ou pacientes. As migrations alteraram somente a estrutura, funções e políticas do banco; não foram criados cadastros operacionais.


Se a tabela `business_hours` estiver vazia, a tela de horários apresenta todos os dias desativados. Isso é intencional: nenhum expediente deve ser presumido. A coordenação precisa confirmar e habilitar os dias e horários corretos antes de liberar agendamentos.


## Vínculo entre serviços e profissionais

A branch `feat/service-professional-links` adiciona a rota protegida `/vinculos` e a migration `202611240003_service_professional_links.sql`. A migration já foi aplicada no projeto Supabase conectado.

A tabela `service_professionals` registra explicitamente quais profissionais podem atender cada serviço. O chatbot passa a listar somente profissionais vinculados ao serviço escolhido, e a função de disponibilidade também valida esse vínculo antes de oferecer horários.

A migration não cria vínculos automaticamente. A equipe deve cadastrar os serviços e profissionais reais e configurar cada relação conforme orientação da coordenação. Sem vínculo, o serviço não oferecerá horários pelo chatbot.

Ordem das migrations do painel:

1. `202611240001_reception_staff_access.sql`
2. `202611240002_reception_agenda_access.sql`
3. `202611240003_service_professional_links.sql`

A migration 003 e a migration adicional de índice reverso já estão aplicadas no Supabase remoto. O CI está sendo ajustado para reproduzir o schema-base antigo em banco local vazio antes de executar a cadeia completa de migrations.
