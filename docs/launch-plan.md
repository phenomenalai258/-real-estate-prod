# Preparação do lançamento — socasas

## Âmbito aprovado

Arrendamento mensal em Moçambique, começando por Maputo. Proprietários/gestores publicam imóveis; interessados candidatam-se; proprietários aprovam ou recusam. Aprovação sem contrato automático. Nenhuma integração M-Pesa enquanto condições e acesso não estiverem claros. Nome confirmado: socasas. Logótipo obtido da página oficial indicada pelo proprietário: https://www.facebook.com/SOCASAS.

## Etapas para concluir

1. **Segurança e fluxo mensal:** validar assinatura Cognito, acesso por titular, candidaturas sem contratos automáticos, respostas idempotentes, validação de dados e fotografias. Cobrir regras com testes. Auditar os dados antigos antes de corrigir contratos já criados; nenhuma remoção automática.
2. **Experiência essencial:** concluir português em todas as páginas, pesquisa por bairros, selector de localização, edição/retirada de anúncios, fotografias com pré-visualização, estados vazios/erros e confirmação após publicar. Ensaiar com dois proprietários e dois interessados.
3. **Administração:** implementar acesso separado por grupo Cognito atribuído pelo operador; lista de utilizadores/anúncios/candidaturas, moderação, suspensão e registo de acções. Nenhum utilizador deve auto-atribuir administração.
4. **Qualidade antes de produção:** testes reais com PostgreSQL/PostGIS, Cognito e S3; pagamentos só históricos; controlo de tentativas, limites por utilizador, paginação, logs sem dados pessoais, alertas, cópias de segurança e teste de restauro. Validar telemóveis, acessibilidade e ligação móvel lenta.
5. **Pré-lançamento:** ambiente privado de ensaio, anúncios de demonstração claramente marcados, revisão tua, piloto com poucos proprietários e publicação apenas após aprovação.

## Pagamentos e M-Pesa

Actualmente existem registos de pagamentos associados a contratos. Isso não significa que a plataforma cobre dinheiro.

A página oficial da Vodacom Moçambique confirma uma API aberta com C2B, B2C, B2B, reversões e consulta de transacções: https://www.vm.co.mz/m-pesa/artigo/api-aberta-do-m-pesa. O portal indicado é https://developer.mpesa.vm.co.mz/. A documentação comercial genérica do M-Pesa explica o registo de developer e validação antes da entrada em produção: https://business.m-pesa.com/developers/. Custos, elegibilidade e condições da socasas continuam por confirmar directamente com o operador; não foi criada conta nem feita chamada de cobrança.

Recomendação para a primeira versão: permitir contacto e candidatura sem cobrança na plataforma. As partes combinam o pagamento e o contrato fora da plataforma. A decisão sobre taxas de candidatura, anúncios, comissões ou cobrança de rendas é tua e deve ficar explícita antes de activar qualquer cobrança.

Para avaliar M-Pesa: confirmar a entidade que receberá os fundos, adesão comercial, documentação e condições oficiais em Moçambique, acesso a sandbox/produção, custos, liquidação, reembolsos e suporte. Não criar uma integração baseada em endpoints presumidos.

Quando houver acesso: construir adaptador de pagamentos separado, estados pendente/confirmado/falhado, identificadores únicos para evitar cobranças repetidas, validação autenticada dos callbacks, conciliação consultando o prestador, testes de callbacks repetidos/atrasados e comprovativos. Nunca considerar pago apenas porque o navegador diz que a operação terminou.

## Alojamento e domínio

Recomendação técnica provisória: manter a arquitectura existente para esta etapa, evitando reescrever o projecto. Comparar custos reais antes de contratar:
- frontend Next.js numa plataforma que suporte a versão instalada;
- API Node.js num serviço com HTTPS, variáveis privadas e logs;
- PostgreSQL gerido com PostGIS, backups e restauro;
- Cognito para contas e S3 para imagens, com permissões mínimas;
- DNS e domínio escolhidos por ti, certificados HTTPS e email de suporte.

Ainda não há fornecedor, região, orçamento ou domínio aprovados. Não foram criados serviços pagos. O domínio deve ser pesquisado quanto a disponibilidade e coerência com a marca antes da compra.

## Depende de ti

- Ficheiro original do logótipo em maior resolução, se disponível.
- Contas de desenvolvimento AWS e base de dados; credenciais inseridas pelo mecanismo privado do serviço, nunca no chat ou no Git.
- Domínio, orçamento mensal, email/telefone de suporte e responsável pela moderação.
- Modelo comercial e política de publicação/verificação de imóveis.
- Texto de termos e privacidade revisto por profissional adequado ao mercado.
- Aprovação explícita antes de publicar ou modificar serviços externos de forma irreversível.

## Evolução por noite

Manter a renda mensal e candidaturas como fluxo actual. Depois criar modalidade explícita de anúncio, calendário por noites, disponibilidade por intervalo, reservas, cancelamentos e preços próprios. Não reutilizar uma candidatura mensal como reserva diária.
