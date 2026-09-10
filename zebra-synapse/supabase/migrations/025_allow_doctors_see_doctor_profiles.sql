-- Allow attending doctors to view fellow doctor profiles (e.g. prescriber details on shared patient records)
drop policy if exists "profiles_select_linked_care_team" on public.profiles;
create policy "profiles_select_linked_care_team"
  on public.profiles for select
  using (
    (auth.uid() = id)
    or ((role in ('patient', 'doctor')) and is_doctor_profile(auth.uid()))
    or (exists (
      select 1 from care_relationships cr
      where ((cr.doctor_id = auth.uid()) and (cr.patient_id = profiles.id))
         or ((cr.patient_id = auth.uid()) and (cr.doctor_id = profiles.id))
    ))
  );
