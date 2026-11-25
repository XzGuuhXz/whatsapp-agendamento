# Documentação oficial — WhatsApp Agendamento

**Projeto:** Chatbot de agendamentos via WhatsApp e painel interno de recepção do SAE  
**Repositório:** [XzGuuhXz/whatsapp-agendamento](https://github.com/XzGuuhXz/whatsapp-agendamento)  
**Data de referência:** 24 de novembro de 2026  
**Idioma:** Português (Brasil)

## Objetivo

Este diretório reúne a documentação técnica e operacional do projeto. Ele registra arquitetura, funcionalidades, segurança, banco de dados, execução local, validação, histórico de branches e decisões conhecidas.

> **Regra de rastreabilidade:** “implementado no código”, “testado localmente”, “aplicado no Supabase remoto” e “publicado em produção” são estados diferentes. A documentação identifica cada um separadamente e não presume deploy.

## Índice

| Documento | Conteúdo |
|---|---|
| [Visão geral e arquitetura](./01-visao-geral-e-arquitetura.md) | Objetivo, componentes, fluxos e limites arquiteturais |
| [Funcionalidades](./02-funcionalidades.md) | Chatbot, painel, agenda, expediente, vínculos e worker |
| [Banco de dados e migrations](./03-banco-de-dados-e-migrations.md) | Entidades, ordem das migrations, ambientes e estado conhecido |
| [Segurança e privacidade](./04-seguranca-e-privacidade.md) | Auth, RLS, privilégios, dados pessoais e práticas seguras |
| [Instalação e operação](./05-instalacao-e-operacao.md) | Pré-requisitos, ambiente local, variáveis e execução |
| [Testes e CI](./06-testes-e-ci.md) | Comandos, cobertura, CI e resultados confirmados |
| [Histórico Git e branches](./07-historico-git-e-branches.md) | Branches, PRs, commits relevantes e ressalvas de rastreabilidade |
| [Pendências e decisões](./08-pendencias-e-decisoes.md) | Próximos passos, limitações e decisões em aberto |

## Estado executivo em 24/11/2026

- O código contém um fluxo de chatbot de agendamento, integração Supabase, painel de recepção, agenda, expediente e vínculo entre serviços e profissionais.
- A branch de integração WhatsApp/Supabase contém o processamento transacional, deduplicação e fila de respostas descritos nos documentos.
- As PRs #1, #2 e #3 aparecem abertas no GitHub na consulta de 24/11/2026. A PR #4 foi mesclada em 24/11/2026.
- A migration `202611240005_reception_patient_data_minimization.sql` foi aplicada ao Supabase remoto e verificada conforme registro operacional do projeto.
- O CI da PR #4, execução #112, passou nos checks e no job de banco de dados.
- O ambiente local foi iniciado com Supabase em Docker e Next.js; as rotas principais responderam HTTP 200.
- A agenda local foi validada visualmente com nome, serviço, profissional, horário e status.
- Foi necessário conceder localmente `SELECT (id)` em `public.clients` à role `authenticated` para permitir o relacionamento PostgREST. Essa concessão local ainda precisa ser formalizada em migration e validada no CI antes de ser considerada parte permanente do projeto.
- **Não há deploy de produção confirmado nesta documentação.**

## Como interpretar os estados

- **Implementado:** há código ou migration correspondente no repositório.
- **Testado:** existe execução observada com resultado registrado.
- **Aplicado localmente:** alteração feita no banco local Docker.
- **Aplicado remotamente:** alteração confirmada no projeto Supabase conectado.
- **Publicado:** existe implantação de aplicação confirmada. Não confundir com merge no GitHub.

## Política de atualização

Atualize estes documentos quando houver alteração de arquitetura, schema, políticas de acesso, fluxos, variáveis de ambiente, branches relevantes, PRs, CI ou implantação. Registre a data e o ambiente afetado. Nunca inclua tokens, senhas, chaves privadas, JWTs, dados reais de pacientes ou conteúdo de arquivos `.env`.
