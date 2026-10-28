# XRMOVI — Plano de ação comercial multiempresa e multicontrato
Data: 28/10/2026. PROPOSTA: preços e empresas por conta ainda não implementados em cobranças nem em permissões entre empresas.

## Arquitetura de vendas
- Conta principal: um e-mail proprietário, com acesso a um ou mais CNPJs somente quando o plano permitir.
- Cada empresa (CNPJ): tem contratos/filiais/obras com centros de custo próprios.
- Cada contrato agrupa veículos, abastecimentos, manutenção, comprovantes, motoristas e resultados.
- Assinatura consolidada por conta/holding: veículos, empresas e logins são compartilhados dentro do limite comprado. O contrato pode ter uma quantidade variável de veículos.
- A autorização de usuários será por empresa e contrato: administradores de conta veem tudo; gestores de contrato veem somente seus contratos.
- Hoje o backend é uma assinatura POR EMPRESA e um usuário pode possuir até três empresas; portanto NÃO anunciar o agrupamento comercial como implementado até existir carteira/holding (account_id), limites transacionais e ciclo de cobrança único.

## Tabela comercial sugerida (não ativa)
| Plano | Empresas por conta | Contratos/empresa | Veículos totais | Logins | R$/mês |
| Start | 1 | 1 | 5 | 1 | 39,90 |
| Pro | 2 | 3 | 15 | 3 | 99,90 |
| Business | 5 | 10 | 30 | 5 | 179,90 |
| Advanced | 10 | 30 | 60 | 10 | 299,90 |
| Enterprise | negociado | negociado | 61+ | negociado | cotação |

Regras: 10% de desconto em pagamento anual quando disponível; faturamento por conta; sem duplicar assinaturas ao adicionar contratos; upgrade imediato só após conciliação do pagamento; downgrade no fim do período, sem apagar dados, bloqueando novos cadastros excedentes.

## Estratégia de vendas
1. Oferta de entrada: 14 dias de teste, sem cartão (evitar prometer conversão automática se não existe checkout).
2. Primeira conversão: pequenas empresas até 5 veículos e custo reduzido.
3. Expansão: oferecer Pro ao cliente que precisa abrir 2ª empresa ou 2º contrato; promover Business quando cruzar 15 veículos ou 2 empresas.
4. Venda consultiva Enterprise para empresas com múltiplos contratos: implementação e campos personalizados sob orçamento separado.
5. Métricas no CEO: MRR realmente recebido vs MRR contratado, inadimplência, CAC, conversão do teste, churn, contas por empresa, veículos ativos, expansão de plano.
6. Cobrança: contratar e renovar via Mercado Pago com notificações verificadas, idempotência, cancelamento e recuperação; não cobrar sem backend testado.
7. Testar permissões multiempresa e centros de custo com 2 contas independentes e diversas unidades.

## Referências competitivas
- Fleetio grupos e subgrupos: https://help.fleetio.com/getting-started-for-account-owners-admins/groups-subgroups
- Fleetio pricing: https://www.fleetio.com/pricing
- Multi-location: https://www.fleetio.com/solutions/multi-location-fleet-management

## Implementado em 28/10/2026
- Schema xrmovi.contracts + RPCs list/create/set vehicle/group kpis com autorização por empresa.
- Campo contract_id em vehicles, resposta na RPC de veículos e tela de contratos/centros de custo.
- Dashboard de operações com KPIs e visualizações de custos por contrato (30 dias), distribuição de tipos de veículos e alertas.
- **Ainda falta** filtros por contrato aplicados ao PDF financeiro, despesas de veículos sem contrato, transferências de veículo com histórico, backend multi-CNPJ para carteira consolidada, permissões por contrato, testes de browser, preços novos e checkout. Não tratar como concluído.
