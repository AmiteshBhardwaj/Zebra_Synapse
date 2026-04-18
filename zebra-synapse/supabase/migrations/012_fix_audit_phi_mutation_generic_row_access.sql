-- Fix shared audit trigger to work across tables with different column sets.
-- The original implementation referenced NEW/OLD.doctor_id directly, which fails
-- on tables such as public.lab_report_uploads that do not have that column.

create or replace function public.audit_phi_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  record_id text;
  payload jsonb;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    record_id := coalesce(
      row_data ->> 'id',
      row_data ->> 'patient_id',
      row_data ->> 'doctor_id',
      'unknown'
    );
    payload := jsonb_build_object('before', row_data);
  else
    row_data := to_jsonb(new);
    record_id := coalesce(
      row_data ->> 'id',
      row_data ->> 'patient_id',
      row_data ->> 'doctor_id',
      'unknown'
    );
    payload := jsonb_build_object('after', row_data);
    if tg_op = 'UPDATE' then
      payload := payload || jsonb_build_object('before', to_jsonb(old));
    end if;
  end if;

  insert into public.security_audit_log (actor_id, operation, table_name, row_id, details)
  values (auth.uid(), tg_op, tg_table_name, record_id, payload);

  return coalesce(new, old);
end;
$$;
