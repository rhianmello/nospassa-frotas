# XRMOVI — Ativação do pagamento automático Mercado Pago

**Estado:** código e funções implantados; cobranças reais protegidas até configurar as credenciais e testar a integração.

## 1. Configurar o Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers/panel/app com a conta recebedora das mensalidades do XRMOVI.
2. Crie ou selecione uma aplicação exclusiva do XRMOVI e habilite Assinaturas.
3. Em credenciais de produção, copie o Access Token que começa com APP_USR-. Nunca compartilhe a chave.
4. No menu Webhooks, configure:
   https://ztqtcbzjesrkuaijmylm.supabase.co/functions/v1/xrmovi-billing-webhook
5. Habilite os eventos subscription_authorized_payment, subscription_preapproval e payment quando disponíveis.
6. Salve e obtenha a assinatura secreta do webhook; ela é diferente do Access Token.

Documentação oficial:
- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks

## 2. Adicionar os segredos no Supabase

Acesse o painel https://supabase.com/dashboard/project/ztqtcbzjesrkuaijmylm/settings/functions e abra Edge Functions > Secrets.

| Secret | Valor |
|---|---|
| XRMOVI_MP_ACCESS_TOKEN | Access Token de PRODUÇÃO exclusivo do XRMOVI, prefixo APP_USR- |
| XRMOVI_MP_WEBHOOK_SECRET | Chave secreta de assinatura do webhook do Mercado Pago |
| XRMOVI_BILLING_ENABLED | true, somente após teste e validação da conta recebedora |

Não coloque chaves no GitHub, em páginas públicas, no JavaScript do site ou em mensagens.
SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY devem existir no ambiente privado de Edge Functions.

## 3. Checklist de homologação

1. Validar com credenciais e usuários de teste do Mercado Pago num ambiente separado. Testes não podem liberar acesso real.
2. Confirmar o nome da conta recebedora e os preços dos planos na base XRMOVI.
3. Criar novo cliente, empresa e contrato em https://frota.nospassa.com.br/.
4. Em Minha assinatura, escolher plano e iniciar checkout.
5. Concluir um pagamento real somente após autorização explícita para esse teste.
6. No Mercado Pago, comprovar o pagamento aprovado e a entrega do webhook HTTP 200.
7. No banco, confirmar billing_checkout_intents.status=paid, billing_ledger contendo exatamente 1 evento por fatura, billing_accounts.status=active e subscriptions.status=active.
8. Repetir webhook e verificar deduplicação; conferir renovação mensal e cancelamento.

## Segurança implementada

- O botão de checkout só habilita quando a função billing-readiness constata todos os segredos e XRMOVI_BILLING_ENABLED=true.
- Valor e limites do plano vêm das regras PostgreSQL, não do navegador.
- Webhook valida assinatura HMAC e busca pagamento, assinatura e fatura diretamente na API do Mercado Pago.
- A cobrança deve estar aprovada e a quantia em BRL deve corresponder ao plano.
- Ledger possui unicidade por evento da fatura, impedindo lançamento duplicado.
- Falhas antes de criar a assinatura no Mercado Pago são registradas para permitir nova tentativa.
- BI do proprietário distingue recebimento confirmado de mensalidade projetada.

## Links

- Landing: https://frota.nospassa.com.br/
- Assinatura: https://frota.nospassa.com.br/v3/#subscription
- Administração: https://frota.nospassa.com.br/admin/
- Painel Mercado Pago: https://www.mercadopago.com.br/developers/panel/app
- Painel Supabase: https://supabase.com/dashboard/project/ztqtcbzjesrkuaijmylm
