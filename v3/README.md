# XRMOVI V3 — Réplica visual CPL (homologação)

## Estado de entrega
- Rota: /v3/; arquivos `index.html`, `css/frota.css`, `css/style.css`, `assets/frota/*.svg`, `xrmovi-adapter.js`.
- CSS, HTML estrutural e imagens da frota CPL-EPC15 foram copiados para pasta isolada no repositório do XRMOVI.
- Scripts originais da CPL não foram conectados: dependem de tabelas, funções RPC de frota, senha master e regras próprias do contrato CPL. Usá-los diretamente no XRMOVI poderia misturar dados.
- `xrmovi-adapter.js` conecta somente RPCs autenticadas de leitura do schema XRMOVI: `my_companies`, `my_vehicles`, `maintenance_list`, `financial_intelligence`.
- Login usa conta existente do Supabase XRMOVI. Ainda não há seletor multiempresa na réplica; a versão atual continua disponível para gestão.
- KPIs, tabela de veículos e ranking de combustível são alimentados quando houver dados. As demais seções copiadas são apenas layout e exigem migração individual. Ações de escrita e exportação foram desabilitadas.
- O arquivo JS do adaptador passou validação sintática, mas não foi realizado teste interativo com usuário autenticado no domínio publicado.

## Proteção da V1 e V2
- Nenhum arquivo de `/app/`, `/v2/`, `/ceo/` ou da página inicial foi alterado nesta etapa.
- Nenhum comando SQL ou mutação de dados Supabase foi executado para criar a V3.
- Não houve migração de bancos: os dados continuam no Supabase atual.

## Checklist antes de lançar
1. Validar layout V3 no navegador e dependências visuais.
2. Implementar switch de empresa e checar isolamento entre clientes.
3. Recriar com API xrmovi os módulos de veículos, documentação, manutenção, alertas, histórico, programação e abastecimentos.
4. Migrar importação e relatórios com validações; testar anexos privados.
5. Criar testes regressivos e de autorização para cada módulo.
6. Verificar gerenciamento de assinatura e checkout Mercado Pago isolado.
7. Aprovar substituição da versão principal só após backup, homologação funcional e plano de rollback.

A expressão 'réplica CPL' refere-se à camada visual. Não declarar equivalência funcional antes de concluir os módulos acima.
