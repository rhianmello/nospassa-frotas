# Frota — reconstrução limpa a partir da CPL

Sistema em desenvolvimento: https://frota.nospassa.com.br/

## Estado atual
- A página inicial redireciona para `/v3/`, onde está a réplica visual da Frota CPL.
- A estrutura HTML/CSS e os SVGs de veículos foram copiados do módulo original da CPL.
- Os scripts originais da CPL estão preservados como referência em `v3/cpl-original/js/`. **Não são executados** na V3: usam banco, senha master e RPCs próprios da CPL.
- `v3/xrmovi-adapter.js` é o adaptador provisório ao schema XRMOVI do Supabase. Parte dos recursos da CPL ainda não está disponível.
- A empresa de teste e registros relacionados foram excluídos do schema `xrmovi`, preservando as outras aplicações do Supabase.
- As contas de autenticação `auth.users` foram mantidas. Um arquivo no bucket de Storage do XRMOVI necessita exclusão pelo serviço de Storage.
- A antiga V1, V2, painel CEO e documentos legados foram removidos do branch principal.

## Recuperação
Backup integral do repositório antes da limpeza:
`backup-xrmovi-before-clean-rebuild-20261029`

## Próximas etapas
1. Auditar scripts da CPL e mapear cada módulo ao modelo multiempresa.
2. Criar nova autenticação/empresa inicial, mantendo isolamento por usuário.
3. Reconstruir ativos, documentos, manutenção, abastecimento, programação semanal, histórico e relatórios.
4. Testar login, autorização, upload, exportações e responsividade no navegador.
5. Só habilitar rotinas de gravação e comercialização após validação funcional.

## Segurança
Não foram alterados o projeto CPL-EPC15, outras aplicações do Supabase ou dados de pagamentos de outros projetos. A cópia visual não equivale ainda à paridade funcional.
