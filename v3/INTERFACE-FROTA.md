# Interface de gestão de frotas

## Telas e manutenção

Cada item do menu abre uma tela exclusiva no mesmo aplicativo, identificada no endereço por `#assets`, `#maintenance` etc. O menu destaca a tela ativa; recarregar e voltar no navegador preservam a navegação. No celular, um seletor de tela substitui o menu lateral. Empresa, contrato e filtros de veículos permanecem compartilhados entre as telas. Visão Geral contém os indicadores e gráficos; os cadastros e registros ficam nas respectivas telas.

Manutenção organiza o fluxo em programar um serviço por data ou KM/horímetro, acompanhar vencidas/próximas/programadas, registrar custos e confirmar a execução. A conclusão exige custo realizado e leitura na execução; o valor zero é permitido. A leitura fica vinculada à manutenção, conforme a API existente. Serviços concluídos continuam disponíveis na consulta e nos custos. Os filtros de manutenção combinam pesquisa por serviço/placa com situação e filtros compartilhados de veículos.

As ações continuam restritas a `owner`/`manager`. Custos e conclusão utilizam as RPCs existentes em duas etapas; se a segunda falhar, a interface informa que os custos foram salvos e mantém a conclusão pendente para nova tentativa. Uma falha ao registrar o custo previsto após criar um serviço permite tentar novamente sem duplicar a manutenção. Esta entrega não altera schema nem registros no banco durante a implementação.

A V3 mantém veículos, abastecimentos, manutenção, OS de frota, checklists, inspeções, peças, documentação, alertas, histórico e custos. Os controles sem integração e módulos administrativos sem vínculo com frota foram retirados da interface.

O contrato permanece no cabeçalho, ao lado de Visão Geral. Contrato, busca de veículo, categoria, situação e vencimento combinam-se e atualizam KPIs, gráficos, ativos, alertas, manutenção, documentos e custos dos veículos selecionados. Limpar também limpa o contrato. O filtro de dias usa vencimentos por data, sem converter quilômetros em dias.

O mês e a categoria de combustível filtram o ranking e os registros de abastecimento. O mês também define o período do resumo de custos de combustível e manutenção realizada. O histórico tem seu próprio intervalo visível e tipo de registro, combinado com os filtros de veículos. Exibe registros de manutenção e abastecimento; não representa um log completo de todas as alterações do sistema.

Documentos são consultados pela API existente, por veículo. Abrir documento usa URL assinada curta do bucket privado. Nenhuma permissão de banco ou Storage foi alterada nesta limpeza.

As OS exibem registros classificados como frota ou vinculados a veículos. Registros de outras categorias permanecem no banco. Busca e situação atualizam a tabela e seus contadores. Checklists, inspeções e almoxarifado atualizam contadores conforme a pesquisa. Movimentação e histórico de peças ficam dentro de cada item do Almoxarifado; a rota antiga `#movimentacoes` passa a abrir o Almoxarifado.

Não houve migration, exclusão ou alteração de dados no Supabase nesta entrega. As consultas existentes continuam autenticadas; as ações de escrita já existentes mantêm os papéis autorizados.

Validação automatizada: `node --test v3/tests/fleet-interface.test.cjs v3/tests/company-branding.test.cjs`, com Playwright e Chromium disponíveis. Os testes simulam a API e não usam dados nem credenciais de clientes.
