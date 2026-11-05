# XRMOVI — Gestão de frotas

Site: https://frota.nospassa.com.br/

## Estrutura atual
- /: apresentação, demonstração, cadastro, login e recuperação de senha.
- /v3/: painel autenticado da frota e seleção de empresa.
- /admin/: administração com autorização no backend.
- /cliente/: atendimento da conta autenticada.
- /km/: leituras por link individual do veículo.
- auth/public-auth.js: autenticação pública separada do HTML.
- supabase/functions/: pagamento, conciliação e e-mails.
- supabase/migrations/ e supabase/tests/: alterações e testes do banco.

Frontend estático no GitHub Pages; dados no schema xrmovi do Supabase. Gravações passam por RPCs com autorização. v3/cpl-original/ é referência histórica e não deve ser conectado ao banco XRMOVI.

## Contratação e acesso
A disponibilidade vem de xrmovi-billing-readiness, que consulta a configuração privada e a autorização do piloto. config.json contém apenas a URL e a chave publicável do Supabase. O frontend nunca habilita cotas ou cobranças.

Cartão tem cobrança recorrente; Pix tem renovação mensal manual. Cadastro, QR emitido e retorno do checkout não comprovam pagamento. Liberação exige conciliação no backend ou liberação manual autorizada e auditada.

Consulte docs/ativar-mercadopago-xrmovi.md e docs/mercadopago-subscriptions-incident-2026-11-04.md. Testes simulados não equivalem à homologação financeira real.

## Testes (Node.js 22+)
```sh
npm ci --ignore-scripts
npm test
npx playwright install chromium
npm run test:browser
```

Testes de navegador interceptam a rede e usam dados fictícios. Testes SQL usam rollback e exigem schema atual e titular de homologação; devem rodar num banco de teste, como postgres. Sequências podem avançar apesar do rollback. Não configurar CI com credenciais do banco de produção.

## Pendências explícitas
- Identificar responsável e contato oficial para revisar Termos, Privacidade e Cancelamento. Rascunhos da auditoria ficam fora das rotas públicas.
- Ativar proteção contra senhas vazadas no painel Auth, se disponível no plano. Essa configuração afeta todas as aplicações do projeto compartilhado.
- Homologar pagamento, renovação e cancelamento com ambiente/usuário autorizado.

Resultados de publicação Pages, testes de navegador e testes de contratos são independentes. Publicação concluída não comprova aprovação dos testes nem pagamento real.
