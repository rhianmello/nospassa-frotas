# Interface de gestão de frotas

A V3 mantém veículos, abastecimentos, manutenção, OS de frota, checklists, inspeções, peças, documentação, alertas, histórico e custos. Os controles sem integração e módulos administrativos sem vínculo com frota foram retirados da interface.

O contrato permanece no cabeçalho, ao lado de Visão Geral. Contrato, busca de veículo, categoria, situação e vencimento combinam-se e atualizam KPIs, gráficos, ativos, alertas, manutenção, documentos e custos dos veículos selecionados. Limpar também limpa o contrato. O filtro de dias usa vencimentos por data, sem converter quilômetros em dias.

O mês e a categoria de combustível filtram o ranking e os registros de abastecimento. O mês também define o período do resumo de custos de combustível e manutenção realizada. O histórico tem seu próprio intervalo visível e tipo de registro, combinado com os filtros de veículos. Exibe registros de manutenção e abastecimento; não representa um log completo de todas as alterações do sistema.

Documentos são consultados pela API existente, por veículo. Abrir documento usa URL assinada curta do bucket privado. Nenhuma permissão de banco ou Storage foi alterada nesta limpeza.

As OS exibem registros classificados como frota ou vinculados a veículos. Registros de outras categorias permanecem no banco. Busca e situação atualizam a tabela e seus contadores. Checklists, inspeções e almoxarifado atualizam contadores conforme a pesquisa. Movimentação e histórico de peças ficam dentro de cada item do Almoxarifado; a rota antiga `#movimentacoes` passa a abrir o Almoxarifado.

Não houve migration, exclusão ou alteração de dados no Supabase nesta entrega. As consultas existentes continuam autenticadas; as ações de escrita já existentes mantêm os papéis autorizados.

Validação automatizada: `node --test v3/tests/fleet-interface.test.cjs v3/tests/company-branding.test.cjs`, com Playwright e Chromium disponíveis. Os testes simulam a API e não usam dados nem credenciais de clientes.
