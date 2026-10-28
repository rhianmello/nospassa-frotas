-- XRMOVI Fleet: migration 002; execute ONLY after 001 in dedicated fleet project.
-- Never apply to aprovaai or CPL-EPC15 without an explicit isolation/migration plan.
create table if not exists public.fleet_plans (
 code text primary key,
 label text not null,
 vehicle_limit integer,
 seat_limit integer,
 monthly_brl numeric(10,2),
 active boolean not null default true,
 check (vehicle_limit is null or vehicle_limit>0),
 check (seat_limit is null or seat_limit>0)
);
insert into public.fleet_plans(code,label,vehicle_limit,seat_limit,monthly_brl) values
 ('start','Start',5,1,39.90),('pro','Pro',15,3,79.90),
 ('business','Business',30,5,129.90),('advanced','Advanced',60,10,199.90),
 ('enterprise','Enterprise',null,null,null)
on conflict (code) do nothing;
create table if not exists public.fleet_subscriptions (
 company_id uuid primary key references public.companies(id) on delete cascade,
 plan_code text not null references public.fleet_plans(code) default 'start',
 status text not null default 'trial' check (status in ('trial','pending','active','past_due','paused','canceled')),
 trial_end timestamptz,
 paid_through timestamptz,
 external_provider text,
 external_subscription_id text,
 updated_at timestamptz not null default now()
);
create table if not exists public.fleet_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.fleet_admin_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 company_id uuid references public.companies(id),
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.fleet_payment_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 provider text not null,
 provider_event_id text not null,
 external_payment_id text,
 status text not null,
 amount numeric(12,2),
 created_at timestamptz not null default now(),
 unique(provider,provider_event_id)
);
alter table public.fleet_plans enable row level security;
alter table public.fleet_subscriptions enable row level security;
alter table public.fleet_admins enable row level security;
alter table public.fleet_admin_audit enable row level security;
alter table public.fleet_payment_events enable row level security;
create policy fleet_plans_public_read on public.fleet_plans for select to anon,authenticated using(active);
-- Admin identity granted out of band by project owner, never by signup.
create function public.fleet_is_ceo() returns boolean language sql stable security definer set search_path='' as $$
 select exists (select 1 from public.fleet_admins a where a.user_id=(select auth.uid()))
$$;
revoke all on function public.fleet_is_ceo() from public;
grant execute on function public.fleet_is_ceo() to authenticated;
create policy fleet_admin_self_read on public.fleet_admins for select to authenticated using(user_id=(select auth.uid()));
create policy fleet_company_ceo_read on public.companies for select to authenticated using(public.fleet_is_ceo());
create policy fleet_members_ceo_read on public.memberships for select to authenticated using(public.fleet_is_ceo());
create policy fleet_sub_read on public.fleet_subscriptions for select to authenticated using(public.is_member(company_id) or public.fleet_is_ceo());
create policy fleet_payment_read on public.fleet_payment_events for select to authenticated using(public.is_member(company_id) or public.fleet_is_ceo());
create policy fleet_audit_ceo_read on public.fleet_admin_audit for select to authenticated using(public.fleet_is_ceo());
-- Controls require explicit CEO login and write audit; payment activation must come from verified server-side provider event.
create function public.fleet_ceo_set_status(cid uuid, new_status text, reason text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.fleet_is_ceo() then raise exception 'Not authorized'; end if;
 if new_status not in ('trial','pending','paused','canceled') then raise exception 'Status cannot be set manually'; end if;
 update public.fleet_subscriptions set status=new_status,updated_at=now() where company_id=cid;
 if not found then raise exception 'Subscription not found'; end if;
 insert into public.fleet_admin_audit(actor_id,company_id,action,details)
 values((select auth.uid()),cid,'set_status',jsonb_build_object('status',new_status,'reason',left(reason,400)));
end $$;
revoke all on function public.fleet_ceo_set_status(uuid,text,text) from public;
grant execute on function public.fleet_ceo_set_status(uuid,text,text) to authenticated;
create function public.fleet_ceo_set_plan(cid uuid, plan text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.fleet_is_ceo() then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.fleet_plans where code=plan and active) then raise exception 'Invalid plan'; end if;
 update public.fleet_subscriptions set plan_code=plan,updated_at=now() where company_id=cid;
 if not found then raise exception 'Subscription not found'; end if;
 insert into public.fleet_admin_audit(actor_id,company_id,action,details)
 values((select auth.uid()),cid,'set_plan',jsonb_build_object('plan',plan));
end $$;
revoke all on function public.fleet_ceo_set_plan(uuid,text) from public;
grant execute on function public.fleet_ceo_set_plan(uuid,text) to authenticated;
-- Company creation and vehicle/seat limits must be enforced in DB, not just UI.
create function public.fleet_company_subscription_init() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.fleet_subscriptions(company_id,plan_code,status,trial_end)
 values(new.id,'start','trial',now()+interval '14 days');
 return new;
end $$;
create trigger fleet_company_subscription_init after insert on public.companies
for each row execute function public.fleet_company_subscription_init();
create function public.fleet_check_vehicle_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare lim integer; current_count integer; state text;
begin
 select p.vehicle_limit,s.status into lim,state
 from public.fleet_subscriptions s join public.fleet_plans p on p.code=s.plan_code where s.company_id=new.company_id for update of s;
 if state is null then raise exception 'Subscription missing'; end if;
 if state not in ('trial','active') then raise exception 'Subscription unavailable'; end if;
 if state='trial' and not exists(select 1 from public.fleet_subscriptions where company_id=new.company_id and trial_end>now()) then raise exception 'Trial expired'; end if;
 select count(*) into current_count from public.vehicles where company_id=new.company_id;
 if lim is not null and current_count>=lim then raise exception 'Vehicle limit reached; upgrade your plan'; end if;
 return new;
end $$;
create trigger fleet_check_vehicle_limit before insert on public.vehicles for each row execute function public.fleet_check_vehicle_limit();
create function public.fleet_check_seat_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare lim integer; current_count integer;
begin
 select p.seat_limit into lim from public.fleet_subscriptions s join public.fleet_plans p on p.code=s.plan_code where s.company_id=new.company_id for update of s;
 if lim is null then return new; end if;
 select count(*) into current_count from public.memberships where company_id=new.company_id;
 if current_count>=lim then raise exception 'Login seat limit reached'; end if;
 return new;
end $$;
create trigger fleet_check_seat_limit before insert on public.memberships for each row execute function public.fleet_check_seat_limit();
-- IMPORTANT: verify onboarding transaction with triggers and RLS before launch.
