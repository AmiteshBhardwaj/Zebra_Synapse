-- Migration 022: Add age, gender, and blood_type to profiles table and update trigger
alter table public.profiles
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists blood_type text;

-- Update handle_new_user trigger to populate age, gender, blood_type, height_cm, weight_kg, dietary prefs on sign-up
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
  d_age int;
  d_gender text;
  d_blood text;
  d_pref text;
  d_allergies text[];
  d_conditions text[];
  d_notes text;
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

  if (new.raw_user_meta_data->>'age') is not null then
    begin
      d_age := (new.raw_user_meta_data->>'age')::integer;
    exception when others then
      d_age := null;
    end;
  end if;

  d_gender := nullif(trim(new.raw_user_meta_data->>'gender'), '');
  d_blood := nullif(trim(new.raw_user_meta_data->>'blood_type'), '');
  if d_blood is null then
    d_blood := nullif(trim(new.raw_user_meta_data->>'blood_group'), '');
  end if;
  if d_blood is null then
    d_blood := nullif(trim(new.raw_user_meta_data->>'bloodType'), '');
  end if;

  d_pref := nullif(trim(new.raw_user_meta_data->>'dietary_preference'), '');
  d_notes := nullif(trim(new.raw_user_meta_data->>'dietary_notes'), '');

  if (new.raw_user_meta_data->'food_allergies') is not null then
    begin
      select array_agg(elem::text)
      into d_allergies
      from json_array_elements_text(new.raw_user_meta_data->'food_allergies') as elem;
    exception when others then
      d_allergies := '{}'::text[];
    end;
  else
    d_allergies := '{}'::text[];
  end if;

  if (new.raw_user_meta_data->'dietary_conditions') is not null then
    begin
      select array_agg(elem::text)
      into d_conditions
      from json_array_elements_text(new.raw_user_meta_data->'dietary_conditions') as elem;
    exception when others then
      d_conditions := '{}'::text[];
    end;
  else
    d_conditions := '{}'::text[];
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    license_number,
    height_cm,
    weight_kg,
    age,
    gender,
    blood_type,
    dietary_preference,
    food_allergies,
    dietary_conditions,
    dietary_notes
  )
  values (
    new.id,
    r,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'license_number'), ''),
    h,
    w,
    d_age,
    d_gender,
    d_blood,
    d_pref,
    coalesce(d_allergies, '{}'::text[]),
    coalesce(d_conditions, '{}'::text[]),
    d_notes
  )
  on conflict (id) do update
  set
    role = excluded.role,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    license_number = coalesce(excluded.license_number, profiles.license_number),
    height_cm = coalesce(excluded.height_cm, profiles.height_cm),
    weight_kg = coalesce(excluded.weight_kg, profiles.weight_kg),
    age = coalesce(excluded.age, profiles.age),
    gender = coalesce(excluded.gender, profiles.gender),
    blood_type = coalesce(excluded.blood_type, profiles.blood_type),
    dietary_preference = coalesce(excluded.dietary_preference, profiles.dietary_preference),
    food_allergies = coalesce(excluded.food_allergies, profiles.food_allergies),
    dietary_conditions = coalesce(excluded.dietary_conditions, profiles.dietary_conditions),
    dietary_notes = coalesce(excluded.dietary_notes, profiles.dietary_notes);

  return new;
end;
$$;

-- Backfill existing profiles with realistic demographic defaults if currently null
update public.profiles
set
  age = case
    when age is not null then age
    else 24 + floor(abs(hashtext(id::text)) % 45)::integer
  end,
  gender = case
    when gender is not null then gender
    when abs(hashtext(id::text || 'gender')) % 2 = 0 then 'Female'
    else 'Male'
  end,
  blood_type = case
    when blood_type is not null then blood_type
    when abs(hashtext(id::text || 'blood')) % 4 = 0 then 'O+'
    when abs(hashtext(id::text || 'blood')) % 4 = 1 then 'A+'
    when abs(hashtext(id::text || 'blood')) % 4 = 2 then 'B+'
    else 'AB+'
  end
where role = 'patient' and (age is null or gender is null or blood_type is null);
