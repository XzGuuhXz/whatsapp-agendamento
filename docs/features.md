# Funcionalidades implementadas

**Data de referência:** 24/11/2026

## 1. Chatbot WhatsApp

### Fluxos disponíveis no código

- Agendar atendimento.
- Consultar agendamentos futuros associados ao telefone.
- Cancelar agendamento, com confirmação.
- Remarcar agendamento, com confirmação e preservação da reserva anterior até a conclusão do novo horário.
- Reiniciar o diálogo com `menu`.

### Regras de conversa e disponibilidade

- Seleção de serviço, profissional, data e horário.
- Profissionais apresentados conforme vínculo explícito com o serviço.
- Somente serviços e profissionais ativos são elegíveis.
- Slots gerados em intervalos de 15 minutos.
- Duração do horário conforme duração cadastrada do serviço.
- Validação do expediente, bloqueios globais e agendamentos existentes.
- Fuso padrão `America/Campo_Grande`.
- Horizonte de agendamento de até 90 dias.
- Sessões reiniciadas após 30 minutos de inatividade.
- Deduplicação por identificador de mensagem do WhatsApp.
- Serialização transacional por telefone.

A disponibilidade é revalidada no banco durante a confirmação para reduzir risco de concorrência.

## 2. Painel de recepção

O painel está implementado na branch documentada. Não confundir a mensagem histórica do README antigo, que dizia que o painel não existia, com o estado atual desta branch.

### Autenticação e perfis

- Login por Supabase Auth.
- Perfil interno em `public.staff_profiles`.
- Papéis previstos: `admin` e `recepcao`.
- Acesso condicionado a perfil ativo.
- Sem cadastro público de funcionários.

### Catálogo de serviços

- Consultar, cadastrar, editar e desativar serviços, conforme permissões.
- Campos operacionais incluem nome, duração, preço e estado ativo.
- O chatbot considera somente serviços ativos.

### Catálogo de profissionais

- Consultar, cadastrar, editar e desativar profissionais.
- O chatbot considera somente profissionais ativos e vinculados ao serviço escolhido.

## 3. Agenda diária — `/agenda`

- Seleção de data.
- Exibição de horário, paciente, serviço, profissional e status.
- Atualização do status do agendamento.
- Estados de status previstos na interface: pendente/agendado, confirmado, concluído, cancelado e não compareceu.
- Exibição de nome e dados operacionais necessários ao atendimento.
- Não deve exibir telefone, e-mail ou observações clínicas.

A leitura está sujeita a autenticação, RLS e privilégios por coluna.

## 4. Expediente — `/horarios`

- Configuração do expediente semanal global.
- Os dias ficam desativados quando não há configuração confirmada.
- Nenhum horário padrão é presumido automaticamente.
- O expediente configurado é consumido pela função de disponibilidade do chatbot.

Limitações: o modelo atual não representa pausas no meio do dia nem jornadas distintas por profissional.

## 5. Vínculos — `/vinculos`

- Tela protegida para relacionar serviços e profissionais.
- Relação persistida em `public.service_professionals`.
- O chatbot passa a oferecer somente profissionais vinculados ao serviço selecionado.
- A função de disponibilidade valida o vínculo antes de gerar horários.
- Não há vínculos automáticos: a coordenação precisa cadastrar as relações reais.

Sem vínculo ativo entre um serviço e um profissional, o chatbot não deve oferecer horários para essa combinação.

## 6. Integração Meta

Implementado no código:

- Verificação GET do webhook.
- Validação HMAC SHA-256 no POST.
- Filtragem por número empresarial.
- Processamento de lotes de mensagens.
- Envio de respostas pela fila persistente.

Pendente para ativação real: credenciais válidas, webhook HTTPS público, inscrição no campo `messages`, destinatários de teste autorizados e agendador externo para o endpoint de outbox.

## 7. Worker Baileys

Implementado no código:

- Processo independente.
- Conexão, pareamento QR e reconexão.
- Recepção de mensagens de texto individuais.
- Resolução de alguns casos de LID por JID alternativo/mapeamento.
- Consumo da fila de respostas do Supabase.
- Encerramento controlado por SIGINT/SIGTERM.

Limites atuais: mensagens de texto apenas; sem grupos, status, canais, mídia ou mensagens interativas. O transporte é não oficial e deve ser avaliado conforme as regras e riscos do serviço.

## 8. Cadastros e dados operacionais

As migrations não criam automaticamente serviços, profissionais, clientes, expediente ou vínculos reais. Esses dados precisam ser validados e cadastrados pela equipe responsável. Testes automatizados usam fixtures temporárias e transações revertidas.