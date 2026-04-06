-- Allow doctors and patients to read the profile of the user they are linked to
-- through care_relationships. This is required for doctor patient lists/details
-- and patient views that show the assigned doctor's name.

drop policy if exists "profiles_select_linked_care_team" on public.profiles;
create policy "profiles_select_linked_care_team"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.care_relationships cr
      where (
        cr.doctor_id = auth.uid()
        and cr.patient_id = profiles.id
      ) or (
        cr.patient_id = auth.uid()
        and cr.doctor_id = profiles.id
      )
    )
  );
