# 7. Histórico Git, branches e pull requests

**Consulta de referência:** 25/11/2026  
**Repositório:** `XzGuuhXz/whatsapp-agendamento`  
**Branch padrão:** `main`

## 7.1 Branches encontradas

A consulta à API do GitHub retornou nove branches de trabalho além de `main`.

| Branch | HEAD observado | Estado e escopo conhecido |
|---|---|---|
| `main` | `e545161` | PR #1 integrada; contém a base do chatbot WhatsApp/Supabase. |
| `feat/whatsapp-supabase-integration` | `aa9504f` | Origem da PR #1, já mesclada em `main`; branch histórica. |
| `feat/painel-recepcao` | `dcb4c1d` | Base antiga do PR #2; substituída pela consolidação atual. |
| `feat/agenda-recepcao` | `0db7caa` | Etapa intermediária do painel e origem da PR #2; substituída pela consolidação atual. |
| `feat/service-professional-links` | `fe6ad1b` | Vínculos serviço-profissional e origem da PR #3; conteúdo preservado na branch atual. |
| `feat/baileys-vps` | `4f59473` | Histórico do worker Baileys/VPS; conteúdo preservado na branch atual. |
| `fix/reception-patient-data-access` | `b24650f` | Origem da PR #4, já mesclada na branch de vínculos; conteúdo preservado na branch atual. |
| `docs/documentacao-oficial` | `aaa2367` | Histórico da documentação oficial; conteúdo preservado na branch atual. |
| `feat/dashboard-liquid-glass` | `d29f062` | Ancestral da simplificação do painel; conteúdo preservado na branch atual. |
| `feat/sae-simple-admin` | `21198f2` | Branch consolidada atual; origem da PR #5 para `main`. |

Os SHAs curtos são referências do snapshot de 25/11/2026. Confirme o HEAD no GitHub antes de operações futuras.

## 7.2 Pull requests

| PR | Título | Estado em 25/11/2026 | Destino / observação |
|---|---|---|---|
| [#1](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/1) | Integra WhatsApp e Supabase com fluxo completo de agendamento | **Mesclada** | Integrada em `main` no commit `e545161a68c8eb91141be261fc6e56044cf7794a`. |
| [#2](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/2) | Agenda da recepção e horários de funcionamento | Aberta, draft | Base antiga `feat/painel-recepcao`; será encerrada como substituída pela PR #5 após a validação da consolidação. |
| [#3](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/3) | Vincular serviços aos profissionais | Aberta, draft | Base antiga `feat/agenda-recepcao`; será encerrada como substituída pela PR #5 após a validação da consolidação. |
| [#4](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/4) | Restringir dados pessoais no painel da recepção | **Mesclada** | Correção de privacidade incorporada na branch de vínculos; migration 005 aplicada ao Supabase remoto. |
| [#5](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/5) | Consolidar chatbot e painel de recepção SAE | Aberta, draft | Única PR planejada da branch `feat/sae-simple-admin` para `main`; aguarda nova validação de CI e revisão final. |

## 7.3 Commits de referência

| SHA | Mensagem / finalidade |
|---|---|
| `3a490e3` | Bootstrap inicial do projeto. |
| `e545161` | Merge da PR #1 em `main`. |
| `f7fd0c5` | Paleta neutra do modo escuro e CI #167 aprovado antes das atualizações documentais. |
| `21198f2` | Estado documental reconciliado após a aplicação da migration 006 e criação da PR #5. |

## 7.4 Integração e banco de dados

- PR #1 integrada em `main` em 25/11/2026.
- PR #4 mesclada em 24/11/2026; migration 005 aplicada ao Supabase remoto e registrada no histórico.
- CI #167, no HEAD `f7fd0c5`, passou nos jobs `checks` e `database`.
- Migration 006 aplicada ao projeto Supabase `dylipirsdywzitppzjjh` em 25/11/2026, registrada como `reception_client_join_permission`.
- Verificação remota confirmou que `authenticated` pode ler somente os campos previstos para o painel, enquanto `phone`, `email` e `appointments.notes` permanecem restritos e `anon` não recebeu leitura de `clients.id`/ `name`.
- Advisors de segurança não retornaram avisos. O advisor de performance apontou índices sem uso observado e uma ocorrência de políticas permissivas múltiplas em `services`, para revisão posterior.
- Não há deploy público nem teste ponta a ponta com credenciais reais do WhatsApp confirmado.

## 7.5 Plano de consolidação

1. PR #1 foi integrada em `main`.
2. PR #5 foi aberta da branch `feat/sae-simple-admin` para `main`.
3. Confirmar CI completo no novo HEAD e revisar a PR #5.
4. Encerrar PRs #2 e #3 como substituídas.
5. Integrar a PR #5 após validação.
6. Só então remover branches históricas cujo conteúdo esteja preservado em `main`; manter `main` como branch de produção e uma branch ativa apenas se houver desenvolvimento em andamento.

Não fazer force push nem excluir branches antes de confirmar que a PR #5 foi integrada e que seus arquivos/migrations estão presentes em `main`.

## 7.6 Histórico e rastreabilidade

Este inventário é um snapshot das branches e PRs observadas em 25/11/2026, não uma exportação completa do grafo Git. Os SHAs completos, diffs e histórico de commits continuam disponíveis no GitHub. Para uma auditoria de commit a commit, consulte o grafo Git após a consolidação.
