# Documentação oficial — WhatsApp Agendamento

**Projeto:** Chatbot de agendamentos via WhatsApp e painel interno de recepção do SAE  
**Repositório:** [XzGuuhXz/whatsapp-agendamento](https://github.com/XzGuuhXz/whatsapp-agendamento)  
**Data de referência:** 25 de novembro de 2026  
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

## Estado executivo em 25/11/2026

- A PR #1 foi mesclada em `main` no commit `e545161a68c8eb91141be261fc6e56044cf7794a`.
- A branch `feat/sae-simple-admin` reúne o chatbot, worker Baileys, painel de recepção, agenda, expediente, catálogos, vínculos e documentação oficial.
- O CI #167 da branch atual passou nos jobs de aplicação e banco: testes, lint, typegen, TypeScript, build, HTTP, worker e PostgreSQL.
- As PRs #2 e #3 continuam abertas como drafts e estão sendo substituídas por uma consolidação única da versão atual do painel.
- A PR #4 foi mesclada na branch de vínculos e sua correção de privacidade está incorporada à versão atual.
- As migrations 005 e 006 foram aplicadas ao projeto Supabase remoto. A migration 006 foi registrada em 25/11/2026 e os privilégios por coluna foram verificados via SQL.
- Os advisors de segurança do Supabase retornaram zero avisos. O advisor de performance mantém índices sem uso observado e um aviso de políticas permissivas múltiplas em `services`, que precisam de avaliação, não de remoção automática.
- O teste ponta a ponta com credenciais reais do WhatsApp, os cadastros oficiais do SAE e o deploy público ainda não foram confirmados.

## Como interpretar os estados

- **Implementado:** há código ou migration correspondente no repositório.
- **Testado:** existe execução observada com resultado registrado.
- **Aplicado localmente:** alteração feita no banco local Docker.
- **Aplicado remotamente:** alteração confirmada no projeto Supabase conectado.
- **Publicado:** existe implantação de aplicação confirmada. Não confundir com merge no GitHub.

## Política de atualização

Atualize estes documentos quando houver alteração de arquitetura, schema, políticas de acesso, fluxos, variáveis de ambiente, branches relevantes, PRs, CI ou implantação. Registre a data e o ambiente afetado. Nunca inclua tokens, senhas, chaves privadas, JWTs, dados reais de pacientes ou conteúdo de arquivos `.env`.
