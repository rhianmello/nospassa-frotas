# XRMOVI Fleet

Plataforma de gestão inteligente de frotas.

O repositório permanece `nospassa-frotas` por compatibilidade. O domínio atual `frota.nospassa.com.br` continua em uso até a migração segura para um novo domínio.

A interface pública está em `index.html`; o portal em `app/index.html`.

## SaaS comercial — implementação em etapas
- Página administrativa: `/ceo/` (requer sessão Supabase e usuário previamente cadastrado em `fleet_admins` por operador autorizado).
- Portal das empresas: `/app/` (ainda desabilitado até configurar `app/config.json`).
- Migração proposta: `database/002_saas_ceo_billing.sql`. **Não executada**; revisar e testar junto à migração 001 em projeto de frotas isolado.
- Planos propostos Start (até 5 veículos/1 login), Pro (15/3), Business (30/5), Advanced (60/10), Enterprise sob contrato.
- Controle de pausa, teste e cancelamento em RPCs do CEO, sem poder declarar pagamentos aprovados manualmente.
- Próximos itens obrigatórios: convites para funcionários, cobrança Mercado Pago server-side (Pix/boleto/cartão), webhooks verificados e idempotentes, upgrades/downgrades prorrateados, expiração e recuperação de assinaturas, tela de contratação, testes de RLS e carga.
- O domínio `frota.nospassa.com.br` e os projetos existentes Supabase permanecem intactos. Não disponibilizar comercialmente antes da validação ponta a ponta.
