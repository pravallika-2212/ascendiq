-- Manual institution entry creates a pending registration request, never a
-- trusted institution or catalog row. Apply after migrations 001-006.
begin;

-- Ensure profile columns exist before altering constraints
alter table public.profiles add column if not exists roll_number text;
alter table public.profiles add column if not exists admission_year smallint;
alter table public.profiles add column if not exists academic_year smallint;
alter table public.profiles add column if not exists account_status text default 'pending';
alter table public.profiles add column if not exists privacy_consent_at timestamptz default now();

-- A profile can exist while its institution/program are awaiting trusted
-- catalog matching. Existing linked profiles and their foreign keys remain.
alter table public.profiles alter column institution_id drop not null;
alter table public.profiles alter column course_id drop not null;
alter table public.profiles alter column department_id drop not null;

create table if not exists public.student_registration_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution_name text not null check (length(btrim(institution_name)) between 2 and 180),
  program_name text not null check (length(btrim(program_name)) between 2 and 180),
  department_name text not null check (length(btrim(department_name)) between 2 and 180),
  admission_year smallint not null check (admission_year between 1950 and 2200),
  current_study_year smallint not null check (current_study_year between 1 and 12),
  roll_number text not null check (length(btrim(roll_number)) between 1 and 100),
  request_status text not null default 'pending'
    check (request_status in ('pending','matched','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewer_note text check (reviewer_note is null or length(reviewer_note) <= 2000)
);

comment on table public.student_registration_requests is
  'Unverified student-submitted institution/program details. These values are not catalog records and do not authorize access.';
comment on column public.student_registration_requests.request_status is
  'Only a trusted operator may mark a request matched or rejected after independent catalog verification.';

create unique index if not exists student_registration_requests_roll_cohort_unique
  on public.student_registration_requests
    (lower(btrim(institution_name)), admission_year, lower(btrim(roll_number)));
create index if not exists student_registration_requests_pending_recent
  on public.student_registration_requests (submitted_at)
  where request_status = 'pending';

alter table public.student_registration_requests enable row level security;
revoke all on public.student_registration_requests from public, anon, authenticated;
grant select on public.student_registration_requests to authenticated;
drop policy if exists "students read own registration request" on public.student_registration_requests;
create policy "students read own registration request"
  on public.student_registration_requests for select to authenticated
  using (user_id = (select auth.uid()));
-- No browser-role INSERT/UPDATE/DELETE grants or review policy are provided.
-- The security-definer signup trigger creates requests; a trusted operator
-- reviews/matches them through privileged database tooling.

-- Temporary API capability check lets the UI disable this flow until this
-- migration is installed, avoiding Auth users with no corresponding profile.
create or replace function public.manual_institution_registration_ready()
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select true;
$$;
revoke all on function public.manual_institution_registration_ready() from public, anon, authenticated;
grant execute on function public.manual_institution_registration_ready() to anon, authenticated;

-- Keep the existing verified catalog signup path for older clients. When no
-- institution UUID is supplied, store the names as a pending request only.
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
    );
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
    );
    insert into public.profiles (
      id, full_name, institution_id, course_id, department_id, academic_year,
      admission_year, student_id, roll_number, privacy_consent_at, account_status
    ) values (
      new.id, btrim(meta->>'full_name'), null, null, null, study_year,
      admission, roll, roll, now(), 'pending'
    );
  end if;

  -- Student details are not retained in auth metadata/JWT claims.
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = new.id;
  return new;
end;
$$;
revoke all on function public.handle_new_student_signup() from public, anon, authenticated;

-- Permit only a complete, server-created unlinked request profile. Once a
-- trusted operator links real catalog IDs, enforce the usual verified program
-- and study-year rules below.
create or replace function public.validate_student_profile_catalog()
returns trigger language plpgsql set search_path = '' as $$
declare
  duration smallint;
  year_start smallint;
  latest_study_year integer;
begin
  new.roll_number := btrim(new.roll_number);
  if length(new.roll_number) not between 1 and 100 then
    raise exception 'Roll number must be between 1 and 100 characters';
  end if;
  if new.institution_id is null and new.course_id is null and new.department_id is null then
    if not exists (
      select 1 from public.student_registration_requests r
      where r.user_id = new.id
        and r.request_status = 'pending'
        and r.admission_year = new.admission_year
        and r.current_study_year = new.academic_year
        and lower(btrim(r.roll_number)) = lower(new.roll_number)
    ) then
      raise exception 'An unlinked profile requires a pending institution registration request';
    end if;
    return new;
  end if;
  if new.institution_id is null or new.course_id is null or new.department_id is null then
    raise exception 'Institution, program, and department catalog IDs must be linked together';
  end if;
  if new.admission_year is null or new.admission_year < 1950
     or new.admission_year > extract(year from current_date)::integer then
    raise exception 'Admission year is outside the allowed range';
  end if;
  select c.duration_years, i.academic_year_start_month into duration, year_start
  from public.institutions i
  join public.institution_courses c on c.institution_id = i.id
  join public.institution_departments d on d.institution_id = i.id and d.course_id = c.id
  where i.id = new.institution_id and c.id = new.course_id and d.id = new.department_id
    and i.status = 'active' and i.verification_status = 'verified' and not i.is_demo
    and c.status = 'active' and d.status = 'active';
  latest_study_year := greatest(1,
    extract(year from current_date)::integer - new.admission_year + 1
      - case when extract(month from current_date)::integer < year_start then 1 else 0 end);
  if duration is null or new.academic_year < 1 or new.academic_year > duration
     or new.academic_year > latest_study_year then
    raise exception 'Selected institution, program, department, admission year, or study year is invalid';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_validate_catalog on public.profiles;
create trigger profiles_validate_catalog before insert or update of
  institution_id, course_id, department_id, academic_year, admission_year, roll_number
  on public.profiles for each row execute function public.validate_student_profile_catalog();

-- Ensure the signup trigger is active on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_student_signup();

-- Instruct PostgREST to immediately refresh its schema cache
notify pgrst, 'reload schema';

commit;
