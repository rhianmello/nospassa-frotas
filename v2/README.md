# XRMOVI V2 — versão paralela em homologação

## Endereço previsto
- `/v2/` dentro do mesmo repositório e domínio: `https://frota.nospassa.com.br/v2/`
- V1 permanece em `/app/`. Nenhum arquivo da V1 foi substituído nesta implementação.

## Arquivos novos
- `v2/index.html`: navegação independente por módulos e layout acessível.
- `v2/styles.css`: sistema visual novo, responsivo, com tema claro e escuro.
- `v2/app.js`: autenticação e consultas de leitura ao mesmo Supabase `aprovaai`.

## Funcionalidade nesta fase
- Login de usuário já cadastrado; troca de empresas associadas à conta.
- Painel com total de veículos, ativos, alertas de manutenção, contratos e gasto de combustível em 30 dias.
- Lista de ativos, contratos e manutenção; alertas por prioridade; ranking financeiro e de combustível.
- Consulta de equipe e dados cadastrais; navegação por páginas independentes.
- Alternância de tema com preferência local.

## Segurança e preservação
- O código V2 **não executa RPCs de gravação** e não migra tabelas. Usa apenas chaves públicas e operações de leitura autenticada.
- Preserva no Supabase empresas, veículos, contratos, manutenções, abastecimentos, comprovantes, usuários e pagamentos.
- Tela de documentos, exportação PDF, convites, edição, novos cadastros e gestão de planos ainda redirecionam para a versão atual. Não prometer paridade funcional.
- A experiência depende das permissões RPC atualmente configuradas no banco e deve ser testada com mais de uma conta/empresa.
- É necessária homologação de visual em computador e celular, login, troca de empresa, isolamento de dados e respostas parciais de RPCs antes da migração.
- A implantação no GitHub foi verificada; a publicação efetiva no domínio não foi confirmada num navegador.

## Próxima fase
1. Testes E2E com ambiente de homologação e contas de teste.
2. Formulários V2 de cadastro e edição de veículos e contratos.
3. Manutenção, abastecimento, anexos privados e relatórios PDF na V2.
4. Convites/autorizações após validação de limite de assentos.
5. Cobrança automática segura e homologada do Mercado Pago, sem interferência nos pagamentos AprovaAI.
6. Só depois apontar o login principal ou redirecionar `/app/` para a V2; backup e rollback documentados.
