# XRMOVI — critérios obrigatórios antes da venda
Status: planejamento técnico / checkout não habilitado. Nenhum recurso de pagamento deve ser tratado como operacional.

## Estado
- GitHub Pages: `frota.nospassa.com.br` (manter domínio atual até registrar novo).
- Interface pública: 5 planos apenas indicativos; não possui checkout nem captação de leads.
- Cliente: `/app/` precisa de `app/config.json` e banco isolado.
- CEO: `/ceo/` precisa de banco, permissões e usuário autorizado explicitamente.
- SQL: `001_initial_schema.sql`, `002_saas_ceo_billing.sql` estão versionados, **não executados**.
- Nunca usar a chave service_role no GitHub Pages.

## Checklist de homologação obrigatória
1. Escolher destino de banco com separação rigorosa do AprovaAI e CPL; backup e restauração testados.
2. Revisar migrações SQL antes de aplicar, testar onboarding de nova empresa, 2 empresas isoladas (RLS), 1/3/5/10 logins e 5/15/30/60 veículos.
3. Criar fluxo de convite de usuário autenticado com expiração e consumo de assento de forma transacional. Impedir autoatribuição do papel CEO.
4. Exigir autenticação no painel CEO e autorização RLS no servidor. Testar usuário comum acessando URL do CEO e chamadas RPC.
5. Criar produto de pagamentos **exclusivo XRMOVI** na conta Mercado Pago: nunca reaproveitar identificadores de produtos, pedidos ou planos do AprovaAI.
6. Criar checkout seguro no backend com token do usuário, empresa e plano validados no servidor; preço nunca enviado pelo navegador como fonte da verdade.
7. Confirmar no Mercado Pago as modalidades aceitas: cartão com assinatura automática; Pix e boleto com cobrança/reconciliação mensal quando elegíveis. Nunca anunciar recorrência automática garantida para todos os meios.
8. Verificar assinatura do webhook, consultar o recurso no provedor, conferir conta recebedora, external_reference, valor/moeda e empresa/assinatura. Registrar idempotência e prevenir replay.
9. Liberar assinatura somente após confirmação de pagamento legítimo; não confiar na URL de retorno nem em status escrito pelo cliente.
10. Cobranças repetidas, falhas de renovação, estorno e cancelamento devem atualizar acesso, com tolerância configurada e avisos.
11. Alterações de plano precisam definir upgrade/downgrade, cobrança proporcional, ciclo de renovação, limites excedidos e reversões.
12. Testes de ponta a ponta com contas de teste do provedor: cartão aprovado/recusado, Pix pendente/aprovado, boleto pendente/pago, webhook duplicado/fora de ordem.
13. Segurança: RLS de todas as tabelas, HTTPS, rate limiting, auditoria, backups e privacidade LGPD. Não apagar dados ao pausar contrato.
14. Antes de ativar comercialmente: verificar cadastro funcional, confirmação de email, redefinição de senha, telas responsivas, acessibilidade e suporte.

## Políticas comerciais sugeridas
Start 1–5 veículos e 1 login (R$ 39,90); Pro 6–15 e 3 logins (R$ 79,90); Business 16–30 e 5 (R$ 129,90); Advanced 31–60 e 10 (R$ 199,90); Enterprise 61+ sob contrato.
1 assinatura ativa por empresa. Uma mesma pessoa pode participar de mais de uma empresa, e ocupa 1 vaga em cada empresa.
Não permitir que mudança de faixa apague veículos. Em downgrade, impedir novos cadastros até adequação aos novos limites.
O CEO pode pausar/cancelar e conceder exceções justificadas e auditadas; não deve gerar pagamentos 'aprovados' manualmente. Liberar por cortesia exige janela de validade separada da cobrança.
