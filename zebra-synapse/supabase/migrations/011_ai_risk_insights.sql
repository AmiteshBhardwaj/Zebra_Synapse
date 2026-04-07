-- Persisted AI risk insights generated from structured labs and linked-care context.

create table if not exists public.ai_risk_insights (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  model_key text not null,
  model_version text not null,
  status text not null
    check (status in ('ready', 'partial', 'unavailable')),
  source text not null
    check (source in ('structured_lab_panel', 'linked_care_snapshot', 'hybrid')),
  input_snapshot_hash text not null,
  input_coverage jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  disclaimer text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ai_risk_insights_patient_generated_idx
  on public.ai_risk_insights (patient_id, generated_at desc);

create index if not exists ai_risk_insights_requested_by_idx
  on public.ai_risk_insights (requested_by, generated_at desc);

create unique index if not exists ai_risk_insights_snapshot_unique
  on public.ai_risk_insights (patient_id, model_key, model_version, input_snapshot_hash);

alter table public.ai_risk_insights enable row level security;
alter table public.ai_risk_insights force row level security;

drop policy if exists "ai_risk_insights_select_participant" on public.ai_risk_insights;
create policy "ai_risk_insights_select_participant"
  on public.ai_risk_insights for select
  using (
    auth.uid() = patient_id
    or (
      auth.uid() = requested_by
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid() and p.role in ('patient', 'doctor')
      )
    )
    or exists (
      select 1
      from public.care_relationships c
      where c.patient_id = ai_risk_insights.patient_id
        and c.doctor_id = auth.uid()
    )
  );

drop policy if exists "ai_risk_insights_insert_participant" on public.ai_risk_insights;
create policy "ai_risk_insights_insert_participant"
  on public.ai_risk_insights for insert
  with check (
    requested_by = auth.uid()
    and (
      auth.uid() = patient_id
      or exists (
        select 1
        from public.care_relationships c
        where c.patient_id = ai_risk_insights.patient_id
          and c.doctor_id = auth.uid()
      )
    )
  );

create or replace function public.validate_ai_risk_insight_row()
returns trigger
language plpgsql
as $$
begin
  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if new.requested_by is not null then
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.requested_by
        and p.role in ('patient', 'doctor')
    ) then
      raise exception 'requested_by must reference a patient or doctor profile';
    end if;

    if new.requested_by <> new.patient_id and not public.has_care_relationship(new.requested_by, new.patient_id) then
      raise exception 'doctor must be linked to patient before writing ai_risk_insights';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.patient_id <> old.patient_id then
      raise exception 'patient_id is immutable';
    end if;

    if new.requested_by is distinct from old.requested_by then
      raise exception 'requested_by is immutable';
    end if;

    if new.model_key <> old.model_key then
      raise exception 'model_key is immutable';
    end if;

    if new.model_version <> old.model_version then
      raise exception 'model_version is immutable';
    end if;

    if new.created_at <> old.created_at then
      raise exception 'created_at is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_ai_risk_insight_row on public.ai_risk_insights;
create trigger validate_ai_risk_insight_row
  before insert or update on public.ai_risk_insights
  for each row execute function public.validate_ai_risk_insight_row();

drop trigger if exists audit_ai_risk_insights_phi_mutation on public.ai_risk_insights;
create trigger audit_ai_risk_insights_phi_mutation
  after insert or update or delete on public.ai_risk_insights
  for each row execute function public.audit_phi_mutation();
