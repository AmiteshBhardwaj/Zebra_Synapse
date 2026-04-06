-- Persist doctor-created patient actions such as follow-ups, lab requests,
-- referrals, notes, messages, and generated reports.

create table if not exists public.care_actions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null
    check (
      action_type in (
        'follow_up',
        'lab_request',
        'message',
        'referral',
        'treatment_plan',
        'report',
        'note'
      )
    ),
  title text not null,
  details text,
  status text not null default 'open'
    check (status in ('open', 'scheduled', 'sent', 'completed')),
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  constraint care_actions_doctor_patient_distinct check (doctor_id <> patient_id)
);

create index if not exists care_actions_doctor_id_idx on public.care_actions (doctor_id);
create index if not exists care_actions_patient_id_idx on public.care_actions (patient_id);
create index if not exists care_actions_created_at_idx on public.care_actions (created_at desc);
create index if not exists care_actions_scheduled_for_idx on public.care_actions (scheduled_for);

alter table public.care_actions enable row level security;

drop policy if exists "care_actions_select_participant" on public.care_actions;
create policy "care_actions_select_participant"
  on public.care_actions for select
  using (auth.uid() = doctor_id or auth.uid() = patient_id);

drop policy if exists "care_actions_insert_doctor" on public.care_actions;
create policy "care_actions_insert_doctor"
  on public.care_actions for insert
  with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles d
      where d.id = auth.uid() and d.role = 'doctor'
    )
    and exists (
      select 1 from public.care_relationships c
      where c.doctor_id = auth.uid() and c.patient_id = care_actions.patient_id
    )
  );

drop policy if exists "care_actions_update_doctor" on public.care_actions;
create policy "care_actions_update_doctor"
  on public.care_actions for update
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

drop policy if exists "care_actions_delete_doctor" on public.care_actions;
create policy "care_actions_delete_doctor"
  on public.care_actions for delete
  using (doctor_id = auth.uid());
