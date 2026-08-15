-- Migration 021: Doctor-Patient 2-Way Direct Messages
-- Enables real-time messaging between doctors and patients across all devices

create table if not exists public.doctor_patient_messages (
  id text primary key default gen_random_uuid()::text,
  doctor_id text not null,
  patient_id text not null,
  doctor_name text,
  patient_name text,
  sender_id text not null,
  sender_role text not null check (sender_role in ('doctor', 'patient')),
  content text not null,
  attachments jsonb default '[]'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists doctor_patient_messages_conversation_idx 
  on public.doctor_patient_messages(doctor_id, patient_id, created_at desc);

create index if not exists doctor_patient_messages_patient_idx 
  on public.doctor_patient_messages(patient_id, created_at desc);

create index if not exists doctor_patient_messages_doctor_idx 
  on public.doctor_patient_messages(doctor_id, created_at desc);

-- Enable RLS
alter table public.doctor_patient_messages enable row level security;

-- Select policy: Allow viewing conversation messages
drop policy if exists "doctor_patient_messages_select" on public.doctor_patient_messages;
create policy "doctor_patient_messages_select"
  on public.doctor_patient_messages for select
  using (true);

-- Insert policy: Allow authenticated/anon users to send messages
drop policy if exists "doctor_patient_messages_insert" on public.doctor_patient_messages;
create policy "doctor_patient_messages_insert"
  on public.doctor_patient_messages for insert
  with check (true);

-- Update policy: Allow updating message read state
drop policy if exists "doctor_patient_messages_update" on public.doctor_patient_messages;
create policy "doctor_patient_messages_update"
  on public.doctor_patient_messages for update
  using (true)
  with check (true);

-- Enable Supabase Realtime broadcast for cross-device synchronization
alter table public.doctor_patient_messages replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.doctor_patient_messages;
  end if;
exception
  when others then null;
end $$;
