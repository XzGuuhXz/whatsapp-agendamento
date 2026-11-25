# 4. Segurança e privacidade

## 4.1 Objetivo

O painel de recepção deve mostrar somente as informações necessárias à organização do atendimento. Dados de contato e observações potencialmente sensíveis não devem ser expostos por conveniência de interface.

## 4.2 Autenticação e autorização

- Autenticação por Supabase Auth.
- Perfil funcional em `public.staff_profiles`.
- Acesso condicionado a perfil ativo.
- Papéis documentados: `admin` e `recepcao`.
- Não existe cadastro público de funcionários.
- A role PostgreSQL `authenticated` não é, por si só, autorização suficiente: as policies também verificam perfil e papel.

## 4.3 RLS e privilégios

RLS define quais registros são visíveis. Privilégios SQL definem quais tabelas e colunas podem ser consultadas.

Acesso mínimo esperado para a recepção:
- campos operacionais do agendamento;
- nome do paciente relacionado a um agendamento;
- catálogos necessários para identificar serviço e profissional.

Campos que não devem ser expostos diretamente pela agenda:
- `clients.phone`;
- `clients.email`;
- `appointments.notes`.

A migration 005 aplica minimização de privilégios. A correção local adicional de `clients.id` precisa ser registrada e testada para manter o relacionamento sem conceder acesso amplo.

## 4.4 Chaves e variáveis

- `NEXT_PUBLIC_SUPABASE_URL`: pública.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: pública; RLS é obrigatória.
- `SUPABASE_SERVICE_ROLE_KEY`: segredo de servidor, nunca em código de navegador ou variável `NEXT_PUBLIC_*`.
- Tokens da Meta e segredos de webhook: somente servidor.
- Segredos do worker: arquivo local protegido e fora do Git.

Não copiar valores de `.env.local`, `worker/.env`, JWTs, cookies ou cabeçalhos Authorization para issues, commits, logs públicos ou documentação.

## 4.5 Segurança do webhook

A integração oficial descrita no projeto valida assinatura HMAC SHA-256 e processa somente eventos do número configurado. A validação deve ocorrer antes de processar conteúdo recebido.

O endpoint de outbox deve exigir autenticação própria por segredo e não pode ficar publicamente acionável sem proteção.

## 4.6 Dados de teste

- Preferir fixtures sintéticas.
- Não copiar dados reais de pacientes para testes.
- Reverter fixtures transacionais com `ROLLBACK` quando aplicável.
- Não usar dumps de produção em desenvolvimento sem autorização e processo de anonimização.
- Não registrar telefones, e-mails, mensagens ou dados clínicos em logs desnecessários.

## 4.7 Checklist antes de liberar o painel

- [ ] Conta pertence a funcionário autorizado.
- [ ] Perfil está ativo.
- [ ] Papel é o necessário à função.
- [ ] Usuário anônimo não lê agenda nem pacientes.
- [ ] Funcionário não lê clientes sem vínculo com agendamento.
- [ ] Telefone e e-mail não são legíveis pela recepção.
- [ ] Observações não são legíveis pela recepção.
- [ ] Atualização de status não permite alterar outros campos.
- [ ] Chaves privilegiadas não aparecem no bundle do navegador.
- [ ] Logs e testes não contêm dados reais.
- [ ] Policies e privilégios foram testados via PostgREST, não somente via SQL como postgres.

## 4.8 Incidente de exposição de token de teste

Durante o diagnóstico local de 24/11/2026, um JWT de sessão de teste foi compartilhado em uma mensagem de suporte. Tratar esse token como exposto: encerrar a sessão correspondente e autenticar novamente. Não registrar o valor do token na documentação, histórico de commits ou logs.
