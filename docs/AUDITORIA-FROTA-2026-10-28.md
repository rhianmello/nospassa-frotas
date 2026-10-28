# Auditoria funcional XRMOVI Fleet — 28/10/2026

## Implementado e verificado
- Banco de manutenção em schema isolado `xrmovi`, com tarefas por veículo, prazo por data ou km/horímetro, conclusão e autenticação por empresa.
- Portal exibe dashboard de manutenção: vencidas, próximas (30 dias ou 1.000 KM/H) e programação.
- Tela para agendar revisão, consultar programação e concluir tarefa.
- Painel 'Equipe e acessos' visível com indicação de limite de logins; envio de convite permanece **desativado** porque a implantação no Supabase foi bloqueada.
- Não foi alterada a integração de pagamentos do AprovaAI.

## Lacunas críticas para lançamento
1. Convites: implementar no banco, validar validade, expiração, uso único, concorrência, revogação e limitação de assentos.
2. CEO: atribuir usuário administrativo autorizado, testes de proibição de contas comuns.
3. Pagamentos: checkout, recorrência/cartão, Pix/boleto, idempotência de webhook, conciliação, estornos, planos e avisos de falha.
4. Manutenção: histórico de custos, despesas por veículo, fornecedores, comprovantes, recorrências automáticas, notificações fora do sistema.
5. Veículos: status operacional ainda manual e não sincronizado com OS; aferição de hodômetro e horímetro deve ser diferenciada.
6. Relatórios: custo por km, indisponibilidade, consumo, evolução mensal, exportações PDF/Excel.
7. Documentos: vencimentos e alertas, testes reais de upload, download e RLS.
8. Importação: validação prévia, evitar duplicações e mostrar erros em lote.
9. Observabilidade: logs, erros, restauração de backup, testes com duas empresas isoladas.

## Benchmark
- Fleetio: dashboard personalizado, alertas de serviços, compliance e ordens de reparo. https://fleetio.helpjuice.com/en_US/fleetio-basics/dashboard-overview
- Samsara: manutenção preventiva, inspeções, alertas, relatórios e permissões por função. https://kb.samsara.com/hc/en-us/articles/48621492984589-Dashboard-Menus

## Nota
Programações por data/medidor disparam alertas **ao abrir o portal**, com base nos valores cadastrados. Ainda não são push, WhatsApp ou e-mail. Critérios de 30 dias e 1.000 KM/H são padrões iniciais ajustáveis posteriormente. Alterações no GitHub não substituem testes end-to-end do site publicado.
