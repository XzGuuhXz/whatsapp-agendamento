# 1. Visão geral e arquitetura

## 1.1 Propósito

O sistema automatiza o atendimento de agendamento por WhatsApp e oferece uma interface interna para funcionários autorizados do SAE acompanharem a agenda e manterem cadastros operacionais.

O sistema é composto por duas superfícies principais:

1. **Canal conversacional:** recebe mensagens, conduz a pessoa por serviço, profissional, data e horário, e confirma operações de agendamento.
2. **Painel interno:** permite que funcionários autenticados mantenham serviços, profissionais, vínculos e expediente, consultem a agenda e atualizem o status dos atendimentos.

O sistema não substitui o sistema clínico institucional nem deve ser usado para registrar informações clínicas desnecessárias.

## 1.2 Tecnologias identificadas

| Camada | Tecnologia |
|---|---|
| Aplicação web | Next.js 16, React 19, TypeScript |
| API e persistência | Supabase |
| Banco relacional | PostgreSQL |
| Autenticação | Supabase Auth |
| Autorização de dados | PostgreSQL RLS e privilégios por tabela/coluna |
| Cliente de dados | `@supabase/supabase-js` |
| Integração oficial WhatsApp | Meta WhatsApp Cloud API / Webhooks |
| Transporte alternativo | Worker independente com Baileys |
| Qualidade | ESLint, TypeScript, testes Node, testes HTTP e SQL |
| CI | GitHub Actions |

Versões e scripts devem ser conferidos nos arquivos `package.json`, `worker/package.json` e no workflow de CI. Não use esta tabela como substituta dos lockfiles.

## 1.3 Componentes lógicos

### Aplicação Next.js

Responsável pelo painel web, autenticação do funcionário, páginas protegidas e rotas HTTP auxiliares. A configuração pública do Supabase utiliza URL e chave publishable. Chaves privilegiadas não podem ser expostas ao navegador.

### Supabase

Responsável por:
- autenticação e identidade;
- armazenamento relacional;
- políticas RLS;
- funções transacionais/RPC usadas pelo chatbot;
- sessões e mensagens;
- fila persistente de respostas;
- dados de catálogo, expediente, vínculos e agendamentos.

### Webhook Meta

Recebe eventos do WhatsApp Cloud API, valida a assinatura da requisição e encaminha mensagens ao fluxo de negócio. A verificação GET é usada no handshake do webhook.

### Worker Baileys

Processo independente para um transporte WhatsApp alternativo. Mantém sessão de conexão, recebe mensagens e consome a fila de respostas. É um componente separado da aplicação Next.js e usa variáveis próprias.

### GitHub Actions

Executa verificações de aplicação e testes de banco em ambiente isolado. O CI não representa um deploy.

## 1.4 Fluxo simplificado — mensagem recebida

1. O provedor entrega um evento ao webhook ou o worker recebe uma mensagem.
2. O sistema identifica o remetente e a mensagem.
3. O identificador externo da mensagem é usado para deduplicação.
4. O processamento serializa operações por telefone para evitar concorrência indevida.
5. O estado da conversa determina a próxima pergunta ou operação.
6. O banco revalida serviço, profissional, vínculo, expediente, bloqueios e disponibilidade.
7. A operação é confirmada de forma transacional.
8. A resposta é registrada em fila persistente.
9. O transporte envia a resposta e registra o resultado.

A confirmação deve depender da validação no banco, e não apenas da disponibilidade previamente mostrada na conversa.

## 1.5 Fluxo simplificado — painel de recepção

1. Funcionário autentica-se pelo Supabase Auth.
2. A aplicação verifica a existência de perfil ativo em `staff_profiles`.
3. O papel deve ser compatível com a operação, por exemplo `admin` ou `recepcao`.
4. A consulta é executada com a sessão do usuário.
5. RLS limita as linhas e privilégios por coluna limitam os campos acessíveis.
6. A interface mostra somente dados necessários à rotina de atendimento.

## 1.6 Domínio funcional

Entidades centrais identificadas:
- `staff_profiles`: vínculo entre usuário Auth e perfil funcional.
- `services`: catálogo de serviços.
- `professionals`: catálogo de profissionais.
- `service_professionals`: relação entre serviços e profissionais.
- `business_hours`: expediente semanal.
- `clients`: cadastro mínimo de clientes/pacientes.
- `appointments`: reservas de atendimento.
- `conversation_sessions`: estado conversacional.
- `messages`: histórico de mensagens processadas.
- `chatbot_outbox`: fila persistente de respostas.
- tabelas auxiliares de bloqueios e configurações, conforme migrations.

Consulte as migrations para o schema exato. Esta lista é conceitual, não um DDL completo.

## 1.7 Ambientes

| Ambiente | Finalidade | Observação |
|---|---|---|
| Desenvolvimento local | Desenvolvimento e testes manuais | Supabase executado em Docker; URL local observada: `http://127.0.0.1:54321` |
| Supabase remoto | Banco conectado ao projeto | Alterações devem ser controladas por migration e autorização |
| CI | Validação automatizada | Banco efêmero preparado pelo workflow |
| Produção/hospedagem | Disponibilização pública | Nenhum deploy de aplicação está confirmado neste registro |

## 1.8 Limites de escopo

Não assumir como implementados sem evidência:
- prontuário ou gestão clínica;
- cadastro público de funcionários;
- notificações/lembretes por templates;
- atendimento humano integrado;
- horários individuais e pausas por profissional;
- disponibilidade institucional em produção;
- deploy público do painel;
- validação ponta a ponta com credenciais reais da Meta.
