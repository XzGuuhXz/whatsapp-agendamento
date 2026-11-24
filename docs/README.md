# Documentação oficial — WhatsApp Agendamento

**Projeto:** WhatsApp Agendamento  
**Repositório:** [XzGuuhXz/whatsapp-agendamento](https://github.com/XzGuuhXz/whatsapp-agendamento)  
**Data de referência:** 24/11/2026  
**Escopo desta edição:** histórico e estado técnico da branch `feat/service-professional-links`.

Esta documentação consolida a arquitetura, os módulos implementados, o banco de dados, os controles de segurança, os ambientes, os testes, o CI, o histórico das branches e as pendências conhecidas. O status é descrito com distinção entre código versionado, alteração local, alteração remota e funcionalidade ainda não validada.

## Índice

| Documento | Conteúdo |
|---|---|
| [Visão geral e arquitetura](architecture.md) | Componentes, integrações e fluxos ponta a ponta |
| [Funcionalidades](features.md) | Chatbot, agenda, painel, expediente e vínculos |
| [Banco de dados e migrations](database.md) | Estrutura, sequência de migrations e estado por ambiente |
| [Segurança e controle de acesso](security.md) | Auth, RLS, privilégios, segredos e dados pessoais |
| [Branches, PRs e histórico](branches-history.md) | Todas as branches remotas identificadas, PRs e decisões |
| [Desenvolvimento, testes e CI](development-testing.md) | Ambiente local, scripts, testes e resultados do Actions |
| [Operação e implantação](operations.md) | Configuração Meta, Baileys, worker, outbox e operação |
| [Estado atual e roadmap](status-roadmap.md) | Entregas confirmadas, limitações e próximos passos |

## Convenções de status

- **Concluído e verificado:** há evidência de execução ou validação.
- **Versionado:** existe no código da branch documentada.
- **Aplicado localmente:** alteração confirmada apenas no Supabase local.
- **Aplicado remotamente:** migration ou alteração confirmada no projeto Supabase remoto.
- **Pendente de validação:** existe implementação, mas falta teste funcional no ambiente indicado.
- **Não realizado:** foi discutido ou planejado, mas não há evidência de execução.

## Branch de referência

A documentação foi preparada sobre `feat/service-professional-links`, atualmente no commit `6959732252cbe0af18950bc1c1ae09be9d800b30`. Essa branch contém a integração de WhatsApp, o worker Baileys, o painel da recepção, a agenda, o expediente, os vínculos entre serviços e profissionais e a restrição de dados pessoais.

A branch padrão do GitHub continua sendo `main`, cujo histórico remoto consultado ainda aponta para o commit inicial de bootstrap. Portanto, estes documentos não devem ser considerados publicados na branch padrão até que a integração correspondente seja revisada e concluída.

## Regra de manutenção

Toda mudança relevante deve atualizar, no mesmo pull request:

1. O documento do módulo afetado.
2. O histórico de migrations, quando houver alteração de banco.
3. O status de testes e CI.
4. O roadmap e as limitações, quando uma pendência for resolvida ou surgir.

Nunca documentar segredos, tokens, chaves privadas, dados reais de pacientes ou credenciais de sessão.