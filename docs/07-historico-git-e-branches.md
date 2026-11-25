# 7. Histórico Git, branches e pull requests

**Consulta de referência:** 24/11/2026  
**Repositório:** `XzGuuhXz/whatsapp-agendamento`  
**Branch padrão informada pelo GitHub:** `main`

## 7.1 Branches encontradas

A consulta à API do GitHub retornou sete branches:

| Branch | HEAD observado na consulta | Evidência disponível / escopo conhecido |
|---|---|---|
| `main` | `3a490e3` | Bootstrap inicial do Next.js e webhook básico. README desta branch descreve scaffold inicial e não reflete as funcionalidades desenvolvidas nas branches posteriores. |
| `feat/whatsapp-supabase-integration` | `aa9504f` | Integração WhatsApp/Supabase; PR #1 descreve webhook, fluxo de agendamento, transações, deduplicação e outbox. |
| `feat/painel-recepcao` | `dcb4c1d` | Painel e documentação de carregamento autenticado de catálogos. |
| `feat/agenda-recepcao` | `0db7caa` | Agenda diária, expediente e documentação de defaults seguros. |
| `feat/service-professional-links` | `fe6ad1b` | Vínculos entre serviços e profissionais; documentação de funcionalidades implementadas. |
| `feat/baileys-vps` | `4f59473` | Histórico do worker Baileys/VPS; commit de referência documenta resolução de remetentes LID. |
| `fix/reception-patient-data-access` | `b24650f` | Correções de acesso a dados de pacientes e CI; branch usada como origem da PR #4. |

Os SHAs curtos são identificadores de referência da consulta. O HEAD de uma branch pode mudar; confira o GitHub antes de usar esta tabela para checkout, merge ou release.

## 7.2 Pull requests identificadas

| PR | Título | Estado observado | Resumo |
|---|---|---|---|
| [#1](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/1) | Integra WhatsApp e Supabase com fluxo completo de agendamento | Aberta na consulta | Webhook, validação Meta, fluxos de agendamento, consulta, cancelamento e remarcação, transações, deduplicação e outbox. |
| [#2](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/2) | feat: agenda da recepção e horários de funcionamento | Aberta na consulta | Agenda diária, atualização de status e expediente semanal. |
| [#3](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/3) | feat: vincular serviços aos profissionais | Aberta na consulta | Painel autenticado, catálogos, vínculos, filtro do chatbot e testes SQL. |
| [#4](https://github.com/XzGuuhXz/whatsapp-agendamento/pull/4) | fix: restringir dados pessoais no painel da recepção | Mesclada em 24/11/2026 | Minimização de privilégios por coluna, RLS e testes de segurança; commit de merge `6959732`. |

**Importante:** os campos `merge_commit_sha` retornados pela API não devem ser usados isoladamente para concluir que uma PR foi mesclada. Para PRs #1–#3, o estado observado era `open` e `merged_at` nulo. A PR #4 tinha estado `closed` e `merged_at` preenchido.

## 7.3 Commits relevantes

| SHA | Mensagem | Significado |
|---|---|---|
| `3a490e3` | `feat: bootstrap WhatsApp scheduling app` | Scaffold inicial |
| `6959732` | `fix: restringir dados pessoais no painel da recepção (#4)` | Migration 005, testes de privilégios e instalação reprodutível do worker |

Os commits de HEAD das demais branches estão listados na seção 7.1.

## 7.4 Histórico de integração e banco

- A PR #3 descreve aplicação remota das migrations de recepção, agenda e vínculos e criação de índice adicional.
- A PR #4 adicionou a migration 005 para minimizar dados pessoais expostos ao painel.
- O registro operacional confirma que a migration 005 foi aplicada e verificada no Supabase remoto em 24/11/2026.
- O CI #112 passou nos checks de aplicação e banco.
- Nenhum deploy de aplicação foi realizado/confirmado neste histórico.

## 7.5 Divergência de referência a reconciliar

O registro local anterior indicava que a cópia de trabalho estava em `feat/service-professional-links` no commit `6959732`, sincronizada com `origin/feat/service-professional-links`. A consulta posterior à API de branches retornou HEAD `fe6ad1b` para essa branch, enquanto a PR #4 registra o merge commit `6959732`.

Antes de qualquer novo merge ou publicação, reconciliar o HEAD remoto com:
```bash
git fetch origin
git status -sb
git log --oneline --decorate --graph --all -30
git rev-parse HEAD
git rev-parse origin/feat/service-professional-links
```

Não force push nem mova refs para resolver essa divergência sem análise.

## 7.6 Histórico incompleto

O inventário acima registra as branches existentes e seus commits de HEAD observados. Ele não é um catálogo exaustivo de cada commit histórico de todas as branches. Para auditoria completa, exportar o grafo Git e revisar commits/patches por branch. Não atribuir funcionalidades adicionais a uma branch sem conferir seus diffs.
