# Portal Nós Passa Frotas

Primeira versão de cadastro de empresa e veículos, com Supabase Auth e políticas RLS.

## Ativação
1. Criar projeto Supabase **exclusivo**.
2. Aplicar SQL de `database/001_initial_schema.sql` no projeto novo.
3. Copiar `config.example.json` para `config.json` preenchendo a URL e a chave **publicável** do projeto (nunca service_role ou secret).
4. Em Supabase Auth, configurar Site URL `https://frota.nospassa.com.br/app/` e URL de redirecionamento correspondente.
5. Testar criação, confirmação de email, cadastro de empresa, RLS e veículos com duas contas de empresas distintas.

A página continua mostrando integração pendente enquanto `config.json` não for criado. Não utilizar em produção sem testes e revisão de segurança.
