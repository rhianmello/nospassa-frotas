# XRMOVI — implantação real no Supabase

Data: 2026-10-28

## Executado
- Projeto existente `aprovaai` (ref `ztqtcbzjesrkuaijmylm`) mantido.
- Migração `create_xrmovi_isolated_foundation` aplicada com sucesso.
- Schema separado `xrmovi` criado com 8 tabelas: plans, companies, memberships, subscriptions, vehicles, ceo_admins, payment_events, admin_audit.
- 5 planos comerciais registrados; todas as demais tabelas vazias.
- RLS habilitado nas 8 tabelas. Nenhuma política de abertura a clientes aplicada.
- Privilégios de `anon` e `authenticated` revogados no schema e nas tabelas.
- Nenhuma função existente de cobrança ou webhooks no AprovaAI foi alterada.
- O portal `/app/` e o CEO `/ceo/` ainda NÃO estão conectados ao schema xrmovi.

## Próxima implantação
1. Criar API backend com identidade por usuário e autorização por empresa. Não expor diretamente o schema xrmovi sem políticas RLS testadas.
2. Implementar convite, login, cadastro de empresa, limites de veículos/assentos com testes de concorrência.
3. Implementar checkout isolado do AprovaAI. Validar servidores, preço, empresa e produto. Nunca usar token de pagamento no frontend.
4. Processar eventos do Mercado Pago de modo idempotente e reconciliar estado com a API do provedor.
5. Configurar CEO autorizado diretamente no backend e testar que contas comuns não o acessam.
6. Só depois configurar autenticação e integrar o GitHub Pages. Testar de ponta a ponta.
7. As antigas migrações 001-003 do repositório referem-se a objetos em `public` e **NÃO devem ser aplicadas** no projeto AprovaAI. Devem ser reescritas para a arquitetura isolada antes do lançamento.
