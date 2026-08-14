-- Migration 018: Add height_cm and weight_kg columns to profiles table

alter table public.profiles
  add column if not exists height_cm numeric(5,2),
  add column if not exists weight_kg numeric(5,2);

-- Update handle_new_user trigger to populate height_cm and weight_kg on sign-up if provided
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  h numeric;
  w numeric;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'patient');
  if r not in ('patient', 'doctor') then
    r := 'patient';
  end if;

  if (new.raw_user_meta_data->>'height_cm') is not null then
    begin
      h := (new.raw_user_meta_data->>'height_cm')::numeric;
    exception when others then
      h := null;
    end;
  end if;

  if (new.raw_user_meta_data->>'weight_kg') is not null then
    begin
      w := (new.raw_user_meta_data->>'weight_kg')::numeric;
    exception when others then
      w := null;
    end;
  end if;

  insert into public.profiles (id, role, full_name, license_number, height_cm, weight_kg)
  values (
    new.id,
    r,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'license_number'), ''),
    h,
    w
  )
  on conflict (id) do update
  set
    role = excluded.role,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    license_number = coalesce(excluded.license_number, profiles.license_number),
    height_cm = coalesce(excluded.height_cm, profiles.height_cm),
    weight_kg = coalesce(excluded.weight_kg, profiles.weight_kg);

  return new;
end;
$$;

-- Backfill existing patient profiles with realistic mock height and weight if currently null
update public.profiles
set
  height_cm = case
    when height_cm is not null then height_cm
    else 155 + floor(abs(hashtext(id::text)) % 36)::numeric
  end,
  weight_kg = case
    when weight_kg is not null then weight_kg
    else 50 + floor(abs(hashtext(id::text || 'weight')) % 45)::numeric
  end
where role = 'patient' and (height_cm is null or weight_kg is null);
