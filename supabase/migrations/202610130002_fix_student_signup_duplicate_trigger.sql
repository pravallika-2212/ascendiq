-- ==============================================================================
-- ASCENDIQ Migration: Fix Student Signup Duplicate Trigger & Primary Key Conflict
-- Resolves: "duplicate key value violates unique constraint student_registration_requests_pkey"
-- When migration 001 created `on_auth_user_created_student_profile` and migration 007
-- created `on_auth_user_created`, both triggers fired concurrently on auth.users,
-- attempting to insert the same user_id twice.
-- This migration removes the legacy trigger and makes the handler idempotent.
-- ==============================================================================

begin;

-- 1. Remove duplicate triggers on auth.users
drop trigger if exists on_auth_user_created_student_profile on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Update handle_new_student_signup with idempotent upserts
create or replace function public.handle_new_student_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := new.raw_user_meta_data;
  roll text := btrim(coalesce(nullif(meta->>'roll_number',''), meta->>'student_id',''));
  institution_name text := btrim(coalesce(meta->>'institution_name',''));
  program_name text := btrim(coalesce(meta->>'program_name',''));
  department_name text := btrim(coalesce(meta->>'department_name',''));
  admission smallint;
  study_year smallint;
  duration smallint;
  year_start smallint;
  latest_study_year integer;
begin
  -- Staff accounts without student registration metadata remain unchanged.
  if nullif(meta->>'institution_id','') is null
     and institution_name = '' then
    return new;
  end if;
  if coalesce(meta->>'privacy_consent','false') <> 'true' then
    raise exception 'Privacy consent is required';
  end if;
  if length(roll) not between 1 and 100 then
    raise exception 'Roll number must be between 1 and 100 characters';
  end if;
  if nullif(meta->>'full_name','') is null
     or length(btrim(meta->>'full_name')) not between 2 and 180 then
    raise exception 'Enter a valid full name';
  end if;
  if nullif(meta->>'admission_year','') is null then
    raise exception 'Admission year is required';
  end if;
  admission := (meta->>'admission_year')::smallint;
  study_year := (meta->>'academic_year')::smallint;
  if study_year is null then
    raise exception 'Current year of study is required';
  end if;
  if admission < 1950 or admission > extract(year from current_date)::integer then
    raise exception 'Admission year is outside the allowed range';
  end if;

  if nullif(meta->>'institution_id','') is not null then
    -- Existing catalog-linked signups must still resolve to an active,
    -- independently verified non-demo institution and its active program.
    select c.duration_years, i.academic_year_start_month into duration, year_start
    from public.institutions i
    join public.institution_courses c on c.institution_id = i.id
    join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
    where i.id = (meta->>'institution_id')::uuid
      and c.id = (meta->>'course_id')::uuid
      and d.id = (meta->>'department_id')::uuid
      and i.status = 'active' and i.verification_status = 'verified' and not i.is_demo
      and c.status = 'active' and d.status = 'active';
    if duration is null then
      raise exception 'Choose an active, verified institution, program, and department';
    end if;
    latest_study_year := greatest(1,
      extract(year from current_date)::integer - admission + 1
        - case when extract(month from current_date)::integer < year_start then 1 else 0 end);
    if study_year < 1 or study_year > duration or study_year > latest_study_year then
      raise exception 'Current study year does not match program duration and admission year';
    end if;
    insert into public.profiles (
      id, full_name, institution_id, course_id, department_id, academic_year,
      admission_year, student_id, roll_number, privacy_consent_at, account_status
    ) values (
      new.id, btrim(meta->>'full_name'), (meta->>'institution_id')::uuid,
      (meta->>'course_id')::uuid, (meta->>'department_id')::uuid,
      study_year, admission, roll, roll, now(), 'pending'
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      institution_id = excluded.institution_id,
      course_id = excluded.course_id,
      department_id = excluded.department_id,
      academic_year = excluded.academic_year,
      admission_year = excluded.admission_year,
      student_id = excluded.student_id,
      roll_number = excluded.roll_number;
  else
    -- Manual values are claims, never catalog entries. Do not let an exact
    -- existing demo name be used as a substitute for a real institution.
    if exists (
      select 1 from public.institutions i
      where i.is_demo and lower(btrim(i.name)) = lower(institution_name)
    ) then
      raise exception 'Demo institution entries cannot be used for student registration';
    end if;
    if length(institution_name) not between 2 and 180 then
      raise exception 'Enter a valid institution name';
    end if;
    if length(program_name) not between 2 and 180 then
      raise exception 'Enter a valid program name';
    end if;
    if length(department_name) not between 2 and 180 then
      raise exception 'Enter a valid department name';
    end if;
    if study_year < 1 or study_year > 12 then
      raise exception 'Current study year must be between 1 and 12 while institution details are pending verification';
    end if;

    insert into public.student_registration_requests (
      user_id, institution_name, program_name, department_name,
      admission_year, current_study_year, roll_number
    ) values (
      new.id, institution_name, program_name, department_name,
      admission, study_year, roll
    )
    on conflict (user_id) do update set
      institution_name = excluded.institution_name,
      program_name = excluded.program_name,
      department_name = excluded.department_name,
      admission_year = excluded.admission_year,
      current_study_year = excluded.current_study_year,
      roll_number = excluded.roll_number,
      submitted_at = now();

    insert into public.profiles (
      id, full_name, institution_id, course_id, department_id, academic_year,
      admission_year, student_id, roll_number, privacy_consent_at, account_status
    ) values (
      new.id, btrim(meta->>'full_name'), null, null, null, study_year,
      admission, roll, roll, now(), 'pending'
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      academic_year = excluded.academic_year,
      admission_year = excluded.admission_year,
      student_id = excluded.student_id,
      roll_number = excluded.roll_number;
  end if;

  -- Student details are not retained in auth metadata/JWT claims.
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = new.id;
  return new;
end;
$$;
revoke all on function public.handle_new_student_signup() from public, anon, authenticated;

-- 3. Re-create single canonical trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_student_signup();

notify pgrst, 'reload schema';

commit;
