-- Nós Passa Frotas: aplicar SOMENTE em projeto Supabase dedicado
create extension if not exists pgcrypto;
create table public.companies (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 2 and 160),
 created_at timestamptz not null default now()
);
create table public.memberships (
 company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'owner' check(role in ('owner','manager','driver')),
 created_at timestamptz not null default now(),
 primary key(company_id,user_id)
);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 plate text not null check (char_length(plate) between 6 and 9),
 model text not null check(char_length(trim(model)) between 2 and 100),
 category text not null default 'Leve' check(category in ('Leve','Utilitário','Caminhão','Máquina','Outro')),
 odometer_km numeric(12,1) not null default 0 check(odometer_km >= 0),
 status text not null default 'Ativo' check(status in ('Ativo','Manutenção','Inativo')),
 created_at timestamptz not null default now(),
 unique(company_id,plate)
);
create index on public.memberships(user_id);
create index on public.vehicles(company_id);
create function public.is_member(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m where m.company_id=cid and m.user_id=(select auth.uid()))
$$;
create function public.can_manage(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m where m.company_id=cid and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
$$;
revoke all on function public.is_member(uuid), public.can_manage(uuid) from public;
grant execute on function public.is_member(uuid),public.can_manage(uuid) to authenticated;
alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.vehicles enable row level security;
create policy companies_read on public.companies for select to authenticated using(public.is_member(id));
create policy membership_read on public.memberships for select to authenticated using(public.is_member(company_id));
create policy vehicles_read on public.vehicles for select to authenticated using(public.is_member(company_id));
create policy vehicles_insert on public.vehicles for insert to authenticated with check(public.can_manage(company_id));
create policy vehicles_update on public.vehicles for update to authenticated using(public.can_manage(company_id)) with check(public.can_manage(company_id));
create policy vehicles_delete on public.vehicles for delete to authenticated using(public.can_manage(company_id));
-- Onboarding seguro via RPC: usuário recém-autenticado cria empresa e torna-se proprietário
create function public.create_my_company(company_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if length(trim(company_name)) < 2 or length(company_name)>160 then raise exception 'Invalid company name';end if;
 if (select count(*) from public.memberships where user_id=(select auth.uid()) and role='owner') >= 3 then
   raise exception 'Company creation limit reached';
 end if;
 insert into public.companies(name) values(trim(company_name)) returning id into cid;
 insert into public.memberships(company_id,user_id,role) values(cid,(select auth.uid()),'owner');
 return cid;
end $$;
revoke all on function public.create_my_company(text) from public;
grant execute on function public.create_my_company(text) to authenticated;
-- Não há política de INSERT direto em companies/memberships: somente RPC autenticada.
