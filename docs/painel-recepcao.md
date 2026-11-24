# Painel da recepção — configuração

O painel usa Supabase Auth para autenticação individual e RLS para limitar o catálogo de serviços a funcionários autorizados.

## 1. Aplicar a migration

No projeto Supabase correto, abra **SQL Editor** e execute o arquivo:

`supabase/migrations/202611240001_reception_staff_access.sql`

A migration cria `public.staff_profiles`, libera a leitura do próprio perfil e permite que funcionários ativos consultem e gerenciem `public.services`. Ela não cadastra serviços, funcionários nem altera agendamentos.

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
- Sair e entrar novamente para confirmar a persistência.
- Tentar inserir/alterar `services` com uma sessão autenticada sem perfil: a operação deve ser negada por RLS.
- Confirmar que a chave anon não consegue inserir, atualizar ou excluir serviços.

## Observações

- Não existe cadastro público de funcionários.
- Nenhum serviço fictício foi inserido.
- A migration precisa ser aplicada no Supabase antes de o login e o catálogo funcionarem.
- Esta etapa ainda não expõe dados de pacientes ou agendamentos no painel.
- Não foi feito deploy.
