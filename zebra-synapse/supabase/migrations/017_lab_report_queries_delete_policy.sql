-- 017_lab_report_queries_delete_policy.sql
-- Enable patients to delete their own chat conversation queries in lab_report_queries

drop policy if exists "lab_report_queries_delete_patient" on public.lab_report_queries;
create policy "lab_report_queries_delete_patient"
  on public.lab_report_queries for delete
  using (auth.uid() = patient_id);
