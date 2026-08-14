-- Migration 019: Add dietary preferences, food allergies, and gastrointestinal/health conditions to profiles table

alter table public.profiles
  add column if not exists dietary_preference text,
  add column if not exists food_allergies text[] default '{}'::text[],
  add column if not exists dietary_conditions text[] default '{}'::text[],
  add column if not exists dietary_notes text;

-- Update handle_new_user trigger to populate dietary preferences on sign-up if provided
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
    dietary_preference = coalesce(excluded.dietary_preference, profiles.dietary_preference),
    food_allergies = coalesce(excluded.food_allergies, profiles.food_allergies),
    dietary_conditions = coalesce(excluded.dietary_conditions, profiles.dietary_conditions),
    dietary_notes = coalesce(excluded.dietary_notes, profiles.dietary_notes);

  return new;
end;
$$;

-- Backfill existing patient profiles with realistic mock dietary preferences if null
update public.profiles
set
  dietary_preference = case
    when dietary_preference is not null then dietary_preference
    when abs(hashtext(id::text)) % 3 = 0 then 'vegetarian'
    when abs(hashtext(id::text)) % 3 = 1 then 'vegan'
    else 'omnivore'
  end,
  food_allergies = case
    when food_allergies is not null and array_length(food_allergies, 1) > 0 then food_allergies
    when abs(hashtext(id::text || 'allergy')) % 4 = 0 then array['lactose']::text[]
    when abs(hashtext(id::text || 'allergy')) % 4 = 1 then array['gluten']::text[]
    when abs(hashtext(id::text || 'allergy')) % 4 = 2 then array['peanuts']::text[]
    else '{}'::text[]
  end,
  dietary_conditions = case
    when dietary_conditions is not null and array_length(dietary_conditions, 1) > 0 then dietary_conditions
    when abs(hashtext(id::text || 'cond')) % 3 = 0 then array['gerd']::text[]
    when abs(hashtext(id::text || 'cond')) % 3 = 1 then array['ibs']::text[]
    else array['hypertension']::text[]
  end
where role = 'patient' and (dietary_preference is null or food_allergies is null or dietary_conditions is null);
