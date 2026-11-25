# 5. Instalação e operação

## 5.1 Pré-requisitos

- Node.js compatível com o projeto (CI usa Node 22).
- npm.
- Docker Engine e Docker Compose.
- Git.
- Acesso a um projeto Supabase para ambientes integrados.
- Credenciais do provedor WhatsApp somente quando for configurar a integração real.

O worker declara Node.js `>=22`.

## 5.2 Clonar e instalar

```bash
git clone https://github.com/XzGuuhXz/whatsapp-agendamento.git
cd whatsapp-agendamento
npm ci
```

Para instalar o worker:
```bash
cd worker
npm ci
cd ..
```

## 5.3 Configuração local

Crie os arquivos locais a partir dos exemplos existentes, quando aplicável. Não coloque segredos em commits.

Arquivos de ambiente relevantes:
- `.env.local`: aplicação Next.js;
- `worker/.env`: worker Baileys;
- `.env.example` e arquivos de exemplo: nomes e formatos esperados, sem segredos reais.

Variáveis públicas do frontend:
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Variáveis do servidor e do worker dependem do transporte selecionado e devem ser conferidas nos exemplos e no código atual. Não inventar valores ou reutilizar credenciais de outro ambiente.

## 5.4 Iniciar Supabase local

O projeto foi executado localmente com Supabase em Docker. A CLI Supabase não estava instalada no ambiente no momento do diagnóstico; o Docker estava instalado.

Quando a CLI estiver configurada:
```bash
supabase start
supabase status
```

Não execute `supabase db reset` sem compreender que ele recria o banco local e pode apagar os dados de desenvolvimento.

## 5.5 Iniciar a aplicação

```bash
npm run dev
```

A aplicação local fica normalmente em `http://localhost:3000`.

Rotas verificadas:
- `/`;
- `/agenda`.

Ambas responderam HTTP 200 durante a validação local registrada.

## 5.6 Iniciar o worker

Confira `worker/.env` e o transporte selecionado antes de executar:
```bash
npm run worker:start
``

O worker usa sessão própria. Não compartilhe QR code, credenciais, arquivos de sessão ou logs com dados pessoais.

## 5.7 Verificações de qualidade

```bash
npm test
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npm run test:http
npm run worker:typecheck
```

Os comandos devem ser executados no diretório apropriado. O worker possui seu próprio manifesto e lockfile.

## 5.8 Operação segura

- Manter segredos fora do Git.
- Não executar migrations remotas sem aprovação.
- Conferir o ambiente ativo antes de qualquer comando SQL.
- Não usar dados reais de pacientes em testes.
- Confirmar expediente, serviços, profissionais e vínculos com a coordenação antes de abrir o agendamento.
- Monitorar falhas e tentativas da fila outbox.
- Não considerar o sistema em produção apenas porque `npm run dev` funciona localmente.
