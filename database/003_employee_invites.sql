-- XRMOVI 003: invites for authenticated employees; apply ONLY to dedicated fleet database after 001/002.
create table public.fleet_invites(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 token_hash bytea not null unique,
 role text not null check(role in ('manager','driver')),
 created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '7 days',
 consumed_by uuid references auth.users(id),
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.fleet_invites enable row level security;
-- No direct public table API permissions: use only the following controlled RPCs.
revoke all on public.fleet_invites from anon, authenticated;
create function public.fleet_create_invite(cid uuid, requested_role text default 'driver')
returns text language plpgsql security definer set search_path='' as $$
declare token text; subscription_status text; trial_expiry timestamptz;
begin
 if (select auth.uid()) is null or not public.can_manage(cid) then raise exception 'Not authorized'; end if;
 if requested_role not in ('manager','driver') then raise exception 'Invalid role'; end if;
 select status,trial_end into subscription_status,trial_expiry from public.fleet_subscriptions where company_id=cid;
 if subscription_status not in ('trial','active') or (subscription_status='trial' and (trial_expiry is null or trial_expiry<=now())) then
  raise exception 'Subscription unavailable';
 end if;
 token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into public.fleet_invites(company_id,token_hash,role,created_by)
 values(cid,extensions.digest(token,'sha256'),requested_role,(select auth.uid()));
 return token;
end $$;
create function public.fleet_accept_invite(token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare inv record; cid uuid; uid uuid:=(select auth.uid());
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if token is null or token !~ '^[a-f0-9]{48}$' then raise exception 'Invalid invitation';end if;
 select * into inv from public.fleet_invites
 where token_hash=extensions.digest(token,'sha256') and consumed_at is null and expires_at>now()
 for update;
 if not found then raise exception 'Invalid or expired invitation'; end if;
 cid:=inv.company_id;
 if not exists(select 1 from public.fleet_subscriptions where company_id=cid and (status='active' or (status='trial' and trial_end>now()))) then
  raise exception 'Subscription unavailable';
 end if;
 if exists(select 1 from public.memberships where company_id=cid and user_id=uid) then raise exception 'Already member';end if;
 insert into public.memberships(company_id,user_id,role) values(cid,uid,inv.role);
 update public.fleet_invites set consumed_at=now(),consumed_by=uid where id=inv.id;
 return cid;
end $$;
revoke all on function public.fleet_create_invite(uuid,text),public.fleet_accept_invite(text) from public;
grant execute on function public.fleet_create_invite(uuid,text), public.fleet_accept_invite(text) to authenticated;
-- Defensive restriction: no direct signup permission to admin table, invite table, payment event table.
revoke insert,update,delete on public.fleet_admins,public.fleet_payment_events,public.fleet_subscriptions,public.fleet_admin_audit from anon,authenticated;
