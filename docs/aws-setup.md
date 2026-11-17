# socasas — alojamento na AWS

Decisão do proprietário: manter Next.js, Express, Prisma/PostGIS, Cognito e S3 e alojar a plataforma na AWS. A branch `master` permanece original. A preparação está em `codex/monthly-rental-readiness`.

Este guia e os ficheiros de configuração não criam recursos. Região, dimensão das máquinas, domínio e custo total precisam de ser definidos antes de executar a instalação. O template cobre contas e fotografias; **não é uma instalação automática da plataforma completa**.

## Arquitectura

| Componente | Serviço | Estado |
| --- | --- | --- |
| Site Next.js 15 | Amplify Hosting | `amplify.yml` preparado para a pasta `client` |
| API Express | EC2, Nginx e systemd; HTTPS através de ALB + ACM | Exemplos preparados; máquina e rede por criar |
| Base PostgreSQL/PostGIS | RDS for PostgreSQL | Por criar e migrar; usar PostgreSQL 16 para corresponder aos testes |
| Contas | Cognito User Pool + app client público | Incluído no template de fundação |
| Fotografias | S3 privado + CloudFront com OAC | Incluído no template; entrega de imagens desactivada por defeito |
| Permissões da API | IAM role e instance profile de EC2 | Incluídos; escrita/remoção limitada a `properties/*` |
| Domínio, alertas e operação | Route 53, ACM, CloudWatch e AWS Budgets | Configurar depois de definir domínio e orçamento |

Mapbox já faz parte do código original para mapas. É um serviço externo à AWS e permanece opcional: sem token, a pesquisa funciona em lista. Não foi substituído por Amazon Location. GitHub continua a guardar o código e a executar testes, não a alojar a plataforma.

## 1. Conta e preparação financeira

O proprietário cria ou utiliza a sua própria conta AWS, introduzindo pessoalmente os dados de identidade e pagamento. Activar MFA na conta principal e utilizar uma identidade administrativa separada para o trabalho diário. Não criar nem enviar chaves root no chat ou no GitHub.

Antes de criar recursos, escolher região comum com Amplify Hosting, Cognito, EC2 e RDS PostgreSQL disponíveis e avaliar acesso desde Maputo. Configurar alertas de custos e confirmar uma estimativa no AWS Pricing Calculator. Os alertas não garantem um limite rígido de gastos. A estimativa deve incluir EC2, EBS, IPv4, ALB, RDS, backups, armazenamento/fotografias/tráfego, Amplify, Cognito, logs e DNS. Não assumir que créditos promocionais cobrem o ambiente inteiro.

## 2. Fundação: contas e fotografias

Rever `infra/aws/foundation.json` antes de o submeter ao CloudFormation na região escolhida. Primeiro ambiente: `Stage=staging`. O template cria oito recursos e requer reconhecimento de criação de IAM (`CAPABILITY_IAM`). Mantém `EnableImageDelivery=false` até ser aprovada a apresentação pública das fotografias.

O pool usa nome de utilizador com email como alternativa de login, email verificado e `custom:role` imutável após o registo. Os únicos papéis aceites pela API são `tenant` e `manager`. O browser pode definir esse papel no registo, mas não pode tornar alguém administrador. Um cliente público sem segredo usa SRP, compatível com o Amplify existente. Não é necessário Identity Pool nem Hosted UI para este fluxo.

O envio de emails padrão do Cognito serve apenas para ensaios pequenos, com as quotas do serviço. Para o lançamento, configurar Amazon SES, remetente verificado e acesso de produção, e testar confirmação de conta e recuperação da palavra-passe.

O S3 bloqueia acesso público e não usa ACLs públicas. CloudFront só pode ler `properties/*` do bucket através da sua própria distribuição. A API recebe permissão de escrita/limpeza no mesmo prefixo através do instance profile, sem chaves AWS permanentes. As fotografias de anúncios serão públicas através do CloudFront quando este for activado; não usar este bucket/prefixo para documentos pessoais.

Os outputs fornecem `UserPoolId`, `UserPoolClientId`, `PhotosBucketName`, `ImageBaseUrl`, `ApiInstanceProfileName` e `Region`. São identificadores de configuração; não são palavras-passe. O pool e o bucket têm retenção ao apagar a stack, e o pool tem protecção contra eliminação: remover a stack não garante terminar todos os custos. O bucket usa versionamento; a limpeza de upload falhado remove a referência actual, podendo reter uma versão até limpeza administrativa posterior.

## 3. Rede, base de dados e API

Preparar uma VPC com sub-redes em duas zonas de disponibilidade. O RDS fica em sub-redes privadas, sem acesso público; a porta 5432 aceita apenas o security group da API. O ALB recebe HTTPS 443 com certificado ACM. A EC2 recebe HTTP 80 apenas do security group do ALB; a porta Node 3002 fica em loopback e nunca aberta à Internet. Administração por Systems Manager, sem SSH público.

Escolher explicitamente a saída de rede da EC2: sub-rede privada com NAT/endpoints ou sub-rede pública com IP e entradas restritas por security groups. NAT, endpoints e IPv4 têm custos que entram na estimativa. Uma única EC2 é aceitável para ensaio, mas é um ponto único de falha; definir alta disponibilidade antes de produção.

No RDS, activar encriptação, backups e protecção contra eliminação. Criar a extensão PostGIS com uma conta com `rds_superuser`; usar uma conta restrita para a API e outra para migrações. Os testes usaram PostgreSQL 16/PostGIS; verificar a versão da extensão disponível na região. Instalar o certificado CA oficial do RDS e usar Prisma com `sslmode=require`, `sslaccept=strict` e o certificado correcto.

Na EC2, instalar Node.js 22 em `/usr/bin/node`, Nginx e o agente SSM adequado à imagem do sistema. Anexar o instance profile indicado pela stack. Criar utilizador de sistema `socasas` e guardar a release aprovada em `/opt/socasas/current`. Preparar `/etc/socasas/api.env` a partir do exemplo, com permissões restritas (`root:socasas`, modo 0640). A palavra-passe da base não entra no chat, no repositório, no frontend nem nos logs.

Na pasta `server`, instalar dependências com `npm ci`, gerar o cliente Prisma e compilar com `npm run build`. Usando a identidade de migrações e a base **de ensaio**, executar `npx prisma migrate deploy`. Nunca executar o seed destrutivo original. Configurar o serviço e o proxy a partir de `infra/aws/socasas-api.service` e `infra/aws/nginx-api.conf`; verificar com `systemd-analyze verify` e `nginx -t` na máquina alvo antes de activar. Estes dois ficheiros ainda não foram ensaiados numa EC2.

O health check do ALB pode usar `/` (resposta da API), mas isso mede apenas se o processo responde; não prova ligação à base. Fazer também um pedido real de pesquisa e o ensaio autenticado.

## 4. Site no Amplify Hosting

Ligar exclusivamente o repositório `phenomenalai258/-real-estate-prod`, branch `codex/monthly-rental-readiness`, como monorepo com raiz `client`. Usar `amplify.yml`; `AMPLIFY_MONOREPO_APP_ROOT` deve ser `client`. Rever a ligação ao GitHub e permissões do serviço no console. O primeiro deploy cria um endereço acessível na Internet; aguardar aprovação e activar a restrição de acesso do ambiente de ensaio. A protecção do site não protege automaticamente a API: rever também a exposição desta.

Variáveis de build do frontend:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Origem HTTPS da API/ALB com certificado válido |
| `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID` | Output `UserPoolId` |
| `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID` | Output `UserPoolClientId` |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | Output `ImageBaseUrl` |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Opcional; deixar vazio nesta instalação AWS |

Estas variáveis ficam visíveis no browser. Nunca colocar nelas `DATABASE_URL`, credenciais AWS ou segredos. Alterar uma variável `NEXT_PUBLIC_*` exige uma nova compilação. O build de alojamento pára se faltar configuração essencial ou se os endereços não forem HTTPS.

Na API, `CLIENT_ORIGIN` recebe exactamente a origem do site, sem barra final. `S3_PUBLIC_BASE_URL` e `NEXT_PUBLIC_IMAGE_BASE_URL` devem ter a mesma origem, sem `/properties` no fim. Novos anúncios guardam URLs de CloudFront, não URLs privadas do S3; imagens antigas não são reescritas automaticamente e exigem auditoria se existirem dados anteriores.

## 5. Ensaio e lançamento

Testar dois proprietários e dois interessados: registo, verificação de email, login, recuperação de conta, fotografias, pesquisa, candidatura, decisão, edição, retirada e republicação, incluindo acesso indevido a imóveis de outra conta. Testar limites de fotografias e erros de rede em telemóveis. Aprovar candidatura continua sem gerar contrato/pagamento.

O âmbito confirmado inclui compra/venda e arrendamento escolhido pelo proprietário. O código actual continua a implementar arrendamento mensal; a modalidade de venda ainda está pendente e deve ser acrescentada antes de apresentar a plataforma como compra e venda.

Antes do piloto, completar administração, rate limiting, monitorização CloudWatch, alertas de custos, backups/restauro, email SES, domínio/HTTPS e revisão do proprietário. Não há deploy automático para AWS a partir da CI; GitHub Actions apenas testa. M-Pesa continua pendente de condições e acesso formal.

## Referências oficiais

- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html
- https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.PostGIS.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html
- https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql
