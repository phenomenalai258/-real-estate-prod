# socasas

Plataforma de arrendamento mensal em Moçambique, começando por Maputo.

## Estado desta etapa

Base original preservada: `master`, commit `32828d842dc3b82c14cf45ffe1ea3d620c4c4a7b`. Desenvolvimento no ramo separado `codex/monthly-rental-readiness`. Guardar código no GitHub não publica a plataforma nem executa migrações em serviços reais.

Ver [como continuar o desenvolvimento no GitHub](docs/github-workflow.md). A branch `master` deve permanecer como referência do código original; não juntar nela as alterações da socasas sem nova decisão explícita.

A aprovação de uma candidatura manifesta interesse e **não cria um contrato, residência ou pagamento**. O arrendamento por noite fica fora da primeira versão.

### Continuação de 17 de Novembro de 2026

Os proprietários podem editar título, descrição, renda, caução, taxa indicada e condições de animais/estacionamento. Podem retirar e voltar a publicar anúncios sem apagar candidaturas ou contratos. A pesquisa e os detalhes públicos excluem anúncios retirados; novas candidaturas são recusadas. Fotografias e localização ainda não são editáveis nesta etapa.

Antes de executar esta versão contra uma base existente, aplicar a migração `20261117090000_property_publication` e gerar o cliente Prisma. A migração acrescenta `isPublished` e mantém os anúncios existentes publicados. Não foi aplicada a uma base real nesta sessão. Ver `docs/progress-2026-11-17.md` para testes e limitações.

## Execução local

Requisitos: Node.js 22 ou superior, npm, PostgreSQL com PostGIS. Opcionalmente Docker Desktop para a base local.

1. `docker compose up -d database` (apenas base local).
2. Copiar `server/.env.example` para `server/.env`; copiar `client/.env.example` para `client/.env.local`.
3. Em `server`: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run dev`.
4. Em `client`: `npm ci`, `npm run dev`.
5. Abrir http://localhost:3000. API em http://localhost:3002.

Sem Cognito, as páginas públicas podem abrir mas as contas ficam indisponíveis; a API recusa operações privadas. Sem base de dados não há pesquisa de imóveis. Sem S3 não há publicação de fotografias. Sem Mapbox a lista continua disponível sem mapa.

As coordenadas do formulário começam no centro de Maputo e devem ser corrigidas para cada imóvel. Não existe ainda um selector visual de localização.

## Verificação

- Servidor: `npm run build` e `npm test`.
- Cliente: `npm run typecheck`, `npm run lint`, `npm run build`.
- Integração: `npm run test:integration` no servidor, com `TEST_DATABASE_URL` a apontar apenas para uma base descartável PostGIS já migrada.
- Auditoria: `npm audit` em cada pasta.
- A integração local usa dados identificados por um prefixo único e apaga apenas os dados que criou.

Não executar o seed original em produção. O seed apaga tabelas e contém exemplos estrangeiros. Foi protegido por `ALLOW_DESTRUCTIVE_SEED=yes`, apenas para bases descartáveis.

## Segurança e dados

O servidor verifica os ID tokens Cognito enviados pelo cliente Amplify: assinatura RSA, emissor, aplicação, validade e tipo de token. O atributo `custom:role` só aceita `tenant` e `manager`. A administração deve usar grupos controlados no servidor, nunca um atributo de registo escolhido pelo utilizador.

A identificação do utilizador vem exclusivamente do token validado. Candidaturas, perfis, contratos e pagamentos têm limites de acesso. Novas candidaturas usam transacções serializáveis para impedir submissões concorrentes duplicadas; conflitos devolvem HTTP 409.

A área histórica permanece em pés quadrados na base; a interface recebe e apresenta metros quadrados através de conversão explícita. Preços novos são em meticais. Os preços dos exemplos antigos **não foram convertidos nem devem ser tratados como imóveis reais**.

## Serviços externos

Usar uma conta de desenvolvimento separada. O Cognito precisa do atributo `custom:role`, registo/verificação por email e um app client público sem client secret. A API precisa dos identificadores do mesmo pool/client. O S3 precisa de uma política de acesso a imagens e credenciais/role de escrita restritas ao prefixo de imóveis. Configurar CORS, URLs de imagens e domínio apenas após revisão.

Ver `docs/launch-plan.md` para decisões e tarefas ainda pendentes.

## Dependências de segurança

Next.js foi actualizado para 15.5.28. PostCSS 8.5.32 e brace-expansion 1.1.21 são fixados por overrides para eliminar dependências transitivas antigas. Os formulários usam Zod 4 e o resolver compatível. Manter package.json e package-lock.json sincronizados. A integração Amplify ainda emite um aviso de peer dependency de @xstate/react com React 19; validar login real antes do lançamento.

Num contentor de produção, definir HOST=0.0.0.0 explicitamente; localmente a API escuta apenas em 127.0.0.1. Não usar as credenciais do compose local em produção.
