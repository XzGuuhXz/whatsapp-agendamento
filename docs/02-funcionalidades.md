# 2. Funcionalidades

Este documento consolida as funcionalidades descritas no código e nas pull requests. A existência de uma funcionalidade no código não significa que o ambiente esteja configurado com dados reais ou publicado.

## 2.1 Chatbot WhatsApp

Fluxos de negócio descritos na integração:
- iniciar agendamento;
- selecionar serviço;
- selecionar profissional elegível;
- selecionar data e horário disponível;
- confirmar agendamento;
- consultar agendamentos futuros associados ao telefone;
- cancelar com confirmação;
- remarcar com confirmação;
- reiniciar conversa pelo comando `menu`.

Regras técnicas registradas:
- serviços e profissionais devem estar ativos;
- profissional deve estar vinculado ao serviço escolhido;
- duração é obtida do cadastro do serviço;
- horários são validados contra expediente, bloqueios e reservas existentes;
- disponibilidade é revalidada na transação de confirmação;
- mensagens externas são deduplicadas por identificador;
- processamento é serializado por telefone;
- sessão expira após período de inatividade;
- fuso de negócio documentado: `America/Campo_Grande`;
- horizonte de agendamento documentado: até 90 dias;
- slots documentados em intervalos de 15 minutos.

Os valores acima devem ser mantidos sincronizados com as regras e testes SQL atuais.

## 2.2 Painel de recepção

### Autenticação
- Login por Supabase Auth.
- Perfil funcional associado em `staff_profiles`.
- Papéis previstos: `admin` e `recepcao`.
- Acesso condicionado a perfil ativo.
- Não existe fluxo de auto cadastro público de funcionários.

### Catálogo
- Serviços: consultar, cadastrar, editar e desativar.
- Profissionais: consultar, cadastrar, editar e desativar.
- Vínculos: associar profissionais aos serviços.
- Expediente: configurar os dias e horários globais.

As operações dependem das policies e permissões instaladas no banco.

## 2.3 Agenda — `/agenda`

A agenda diária apresenta:
- horário;
- nome do paciente;
- serviço;
- profissional;
- status.

A interface permite atualização de status conforme as permissões do banco. A lista de status suportados deve ser conferida no tipo e no schema da branch usada para executar a aplicação.

A consulta de 24/11/2026 foi validada visualmente no ambiente local: um agendamento apareceu com data 27/11/2026 às 08:00, nome do paciente, serviço, profissional e status pendente.

## 2.4 Expediente — `/horarios`

- Configuração semanal global.
- Dias sem expediente cadastrado começam desativados.
- O sistema não presume horários de funcionamento.
- A configuração alimenta o cálculo de disponibilidade.

Limitação conhecida: o modelo atual é global; não cobre pausas intradiárias nem expediente individual por profissional.

## 2.5 Vínculos — `/vinculos`

- Tela protegida para relacionar profissionais e serviços.
- Relação persistida em `service_professionals`.
- O chatbot filtra profissionais com base no serviço selecionado.
- A ausência de vínculo deve impedir que a combinação seja oferecida.

Os vínculos reais precisam ser informados e confirmados pela coordenação responsável.

## 2.6 Integração Meta WhatsApp Cloud API

O código descrito na PR #1 inclui:
- handshake GET do webhook;
- validação HMAC SHA-256 da assinatura;
- processamento de lotes;
- filtragem pelo número empresarial configurado;
- processamento de agendar, consultar, cancelar e remarcar;
- fila persistente para respostas;
- endpoint de recuperação/consumo da fila autenticado.

Para ativação real, ainda são necessários credenciais válidas, URL HTTPS pública, configuração do webhook no painel Meta, assinatura do campo `messages`, destinatários de teste autorizados e agendamento externo do endpoint de outbox.

O teste real com a Meta não foi confirmado no registro da PR #1.

## 2.7 Worker Baileys

O worker é um processo separado que usa Baileys. O pacote identificado no manifesto é uma release candidate; verifique compatibilidade e riscos antes de uso institucional.

Capacidades documentadas no projeto:
- pareamento e sessão;
- reconexão;
- recepção de mensagens individuais de texto;
- resolução de identificadores alternativos em casos de LID;
- consumo da fila de respostas;
- encerramento controlado.

Limites descritos: não cobre grupos, status, canais, mídia ou mensagens interativas. O transporte Baileys não é a API oficial da Meta e envolve riscos operacionais e de conformidade.

## 2.8 Cadastros reais

As migrations não criam automaticamente:
- serviços;
- profissionais;
- vínculos;
- expediente;
- pacientes;
- funcionários de recepção.

Os dados devem ser inseridos somente após validação pela equipe responsável. Não usar dados reais de pacientes em testes automatizados ou documentação.
