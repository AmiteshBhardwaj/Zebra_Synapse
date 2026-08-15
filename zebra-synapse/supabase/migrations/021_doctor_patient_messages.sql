-- Migration 021: Doctor-Patient 2-Way Direct Messages
-- Enables real-time messaging between doctors and patients

create table if not exists public.doctor_patient_messages (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
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

-- Select policy: both doctor and patient in conversation can view messages
drop policy if exists "doctor_patient_messages_select" on public.doctor_patient_messages;
create policy "doctor_patient_messages_select"
  on public.doctor_patient_messages for select
  using (auth.uid() = doctor_id or auth.uid() = patient_id);

-- Insert policy: authenticated sender (doctor or patient) in conversation can insert
drop policy if exists "doctor_patient_messages_insert" on public.doctor_patient_messages;
create policy "doctor_patient_messages_insert"
  on public.doctor_patient_messages for insert
  with check (
    sender_id = auth.uid() 
    and (auth.uid() = doctor_id or auth.uid() = patient_id)
  );

-- Update policy: recipient can mark messages as read
drop policy if exists "doctor_patient_messages_update" on public.doctor_patient_messages;
create policy "doctor_patient_messages_update"
  on public.doctor_patient_messages for update
  using (auth.uid() = doctor_id or auth.uid() = patient_id)
  with check (auth.uid() = doctor_id or auth.uid() = patient_id);
