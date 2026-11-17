# Desenvolvimento da socasas no GitHub

Repositório: https://github.com/phenomenalai258/-real-estate-prod

## Separação do original

- `master`: código original, mantido no commit `32828d842dc3b82c14cf45ffe1ea3d620c4c4a7b`.
- `codex/monthly-rental-readiness`: desenvolvimento da socasas para arrendamento mensal em Moçambique.
- O pedido de revisão em rascunho serve para comparar as alterações. Não o juntar a `master`, nem activar integração automática, enquanto a intenção for preservar o original.

Esta separação não é uma regra técnica de protecção de branches: administradores continuam a poder alterar o repositório. Não foram alteradas permissões, visibilidade, branch predefinida ou regras de protecção.

## Continuar noutro computador

```sh
git clone --branch codex/monthly-rental-readiness https://github.com/phenomenalai258/-real-estate-prod.git socasas
cd socasas
git status
```

Seguir o README para instalar dependências e configurar o ambiente local. Não enviar ficheiros `.env`, chaves AWS, credenciais de base de dados, `node_modules` ou ficheiros de compilação para o GitHub. Os ficheiros `.env.example` contêm apenas exemplos para desenvolvimento.

Para uma funcionalidade nova, partir da branch socasas e abrir um pedido de revisão dirigido a ela, em vez de `master`:

```sh
git switch codex/monthly-rental-readiness
git pull --ff-only
git switch -c codex/nome-da-funcionalidade
```

## Testes automáticos

O workflow `Checks` verifica servidor e cliente quando são enviadas alterações ou aberto um pedido de revisão. Cria uma base PostGIS temporária dentro do teste, executa migrações/testes e destrói esse ambiente no fim do job. Não usa serviços nem credenciais de produção, não publica o site e não altera bases reais.

Um teste aprovado não substitui o ensaio com Cognito, S3, utilizadores reais e telemóveis antes do lançamento. Consultar o plano de lançamento para as dependências que faltam.
