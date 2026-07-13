-- =====================================================================
-- TOPJOBSEEKERS / GlobalWork Kenya — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- =====================================================================

-- ---------- 1. PROFILES (extends built-in auth.users) ----------
create type public.user_role as enum ('job_seeker', 'employer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'job_seeker',
  full_name text,
  phone text,
  company_name text,        -- only relevant for employers
  approved boolean not null default false, -- employers & admins need manual approval; job_seekers auto-approved
  created_at timestamptz not null default now()
);

-- job_seekers are approved automatically, employers/admins need a human to flip this
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, phone, company_name, approved)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'job_seeker'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    coalesce((new.raw_user_meta_data->>'role') = 'job_seeker', true)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- 2. JOBS ----------
create table public.jobs (
  id bigint generated always as identity primary key,
  title text not null,
  company text not null,
  location text not null,
  country text not null,
  category text not null,
  salary text not null,
  job_type text not null default 'Full-time',
  badge text not null default 'new', -- new | hot | featured
  icon text not null default '💼',
  slots int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 3. TESTIMONIALS ----------
create table public.testimonials (
  id bigint generated always as identity primary key,
  name text not null,
  role_title text not null,      -- e.g. "Registered Nurse — Dubai, UAE"
  country_flag text,             -- e.g. "🇦🇪"
  quote text not null,
  avatar_initials text not null,
  avatar_color text not null default '#1E6FD9',
  featured boolean not null default false,
  approved boolean not null default false, -- admin must approve before it shows publicly
  created_at timestamptz not null default now()
);

-- ---------- 4. PROFESSION SHOWCASE (sliding photos strip) ----------
create table public.profession_showcase (
  id bigint generated always as identity primary key,
  profession_title text not null,   -- e.g. "Registered Nurse"
  photo_url text not null,          -- public URL (Supabase Storage 'team-photos' bucket, or any hosted image)
  flag text,                        -- e.g. "🇦🇪"
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 5. CV SUBMISSIONS ----------
create table public.cv_submissions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null, -- null if submitted anonymously
  full_name text not null,
  phone text not null,
  email text not null,
  destination text,
  job_category text,
  intro text,
  cv_file_path text not null,     -- path inside the 'cvs' storage bucket
  status text not null default 'new', -- new | reviewed | shortlisted | placed | rejected
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.testimonials enable row level security;
alter table public.profession_showcase enable row level security;
alter table public.cv_submissions enable row level security;

-- helper: is the current user an approved admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approved = true
  );
$$ language sql security definer stable;

-- helper: is the current user an approved employer?
create or replace function public.is_approved_employer()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employer' and approved = true
  );
$$ language sql security definer stable;

-- ---- profiles policies ----
create policy "user can view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "user can update own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- ---- jobs policies ----
create policy "anyone can view active jobs" on public.jobs
  for select using (active = true or public.is_admin());

create policy "admin manages jobs" on public.jobs
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- testimonials policies ----
create policy "anyone can view approved testimonials" on public.testimonials
  for select using (approved = true or public.is_admin());

create policy "admin manages testimonials" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- profession_showcase policies ----
create policy "anyone can view active showcase photos" on public.profession_showcase
  for select using (active = true or public.is_admin());

create policy "admin manages showcase photos" on public.profession_showcase
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- cv_submissions policies ----
-- Anyone (even logged out) can submit a CV
create policy "anyone can submit a cv" on public.cv_submissions
  for insert with check (true);

-- Job seekers can see their own submissions; employers (approved) can see all
-- submissions in read-only "candidate pool" form; admin sees everything.
create policy "seeker views own submission" on public.cv_submissions
  for select using (auth.uid() = user_id);

create policy "employer views candidate pool" on public.cv_submissions
  for select using (public.is_approved_employer());

create policy "admin views all submissions" on public.cv_submissions
  for select using (public.is_admin());

create policy "admin updates submissions" on public.cv_submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- SEED DATA (optional — the 9 existing hardcoded jobs + 3 testimonials)
-- =====================================================================
insert into public.jobs (title, company, location, country, category, salary, job_type, badge, icon, slots) values
('Registered Nurse (ICU)', 'Al Razi Medical Center', 'Dubai, UAE', 'UAE', 'Healthcare', 'KES 280,000 – 350,000/mo', 'Full-time', 'hot', '🏥', 12),
('Civil Engineer – Infrastructure', 'Saudi Binladin Group', 'Riyadh, Saudi Arabia', 'Saudi Arabia', 'Construction', 'KES 320,000 – 420,000/mo', 'Contract', 'featured', '🏗️', 5),
('Executive Chef', 'Marriott Doha', 'Doha, Qatar', 'Qatar', 'Hospitality', 'KES 260,000 – 310,000/mo', 'Full-time', 'new', '🍽️', 2),
('Software Engineer (React / Node)', 'TechHub London', 'London, United Kingdom', 'United Kingdom', 'IT', 'KES 550,000 – 700,000/mo', 'Full-time', 'hot', '💻', 3),
('House Manager / Nanny', 'Private Household', 'Kuwait City, Kuwait', 'Kuwait', 'Domestic', 'KES 95,000 – 130,000/mo', 'Live-in', 'new', '🏡', 8),
('Secondary School Teacher (Science)', 'British School Berlin', 'Berlin, Germany', 'Germany', 'Education', 'KES 380,000 – 450,000/mo', 'Full-time', 'featured', '📚', 4),
('Logistics Coordinator', 'DP World', 'Dubai, UAE', 'UAE', 'Logistics', 'KES 200,000 – 260,000/mo', 'Full-time', 'new', '🚢', 7),
('Financial Analyst', 'Standard Chartered Bank', 'Singapore', 'Singapore', 'Finance', 'KES 490,000 – 600,000/mo', 'Full-time', 'featured', '📊', 2),
('Welding Supervisor', 'Qatar Petroleum Projects', 'Ras Laffan, Qatar', 'Qatar', 'Construction', 'KES 230,000 – 290,000/mo', 'Contract', 'hot', '🔧', 15);

-- Placeholder photos using ui-avatars.com (free, no licensing issues) so the
-- carousel works immediately. Replace photo_url with real staff/candidate
-- photos (upload to a public 'team-photos' Storage bucket) whenever ready.
insert into public.profession_showcase (profession_title, photo_url, flag, display_order) values
('Registered Nurse', 'https://ui-avatars.com/api/?name=Nurse&background=1E6FD9&color=fff&size=300&bold=true', '🇦🇪', 1),
('Civil Engineer', 'https://ui-avatars.com/api/?name=Engineer&background=0A5CB8&color=fff&size=300&bold=true', '🇸🇦', 2),
('Executive Chef', 'https://ui-avatars.com/api/?name=Chef&background=F5A623&color=fff&size=300&bold=true', '🇶🇦', 3),
('Software Engineer', 'https://ui-avatars.com/api/?name=Developer&background=1E6FD9&color=fff&size=300&bold=true', '🇬🇧', 4),
('Teacher', 'https://ui-avatars.com/api/?name=Teacher&background=0A5CB8&color=fff&size=300&bold=true', '🇩🇪', 5),
('Logistics Coordinator', 'https://ui-avatars.com/api/?name=Logistics&background=F5A623&color=fff&size=300&bold=true', '🇦🇪', 6);

insert into public.testimonials (name, role_title, country_flag, quote, avatar_initials, avatar_color, featured, approved) values
('Mary Wambui', 'Registered Nurse — Dubai, UAE', '🇦🇪', 'I submitted my CV on a Friday and had an interview call by Monday. Within 6 weeks I was working as a registered nurse in Dubai. The support throughout was incredible.', 'MW', '#1E6FD9', false, true),
('James Otieno', 'Civil Engineer — Riyadh, Saudi Arabia', '🇸🇦', 'After struggling to find work locally, this team opened doors I did not know existed. I am now a site engineer in Riyadh earning far more than I made in Nairobi.', 'JO', '#F5A623', true, true),
('Faith Kamau', 'Sous Chef — Doha, Qatar', '🇶🇦', 'The CV review alone was worth it. They helped me rewrite my CV and I got hired by a 5-star hotel in Doha. I am now working as a sous chef, living my dream.', 'FK', '#0A5CB8', false, true),
('Brian Kiptoo', 'IT Support Specialist — Berlin, Germany', '🇩🇪', 'From a shared campus computer to a work visa in Germany in four months. I still cannot believe how smooth the whole process was.', 'BK', '#1E6FD9', false, true),
('Grace Achieng', 'Hotel Front Desk — Doha, Qatar', '🇶🇦', 'They handled every document and every question. I landed in Doha knowing exactly what to expect on day one.', 'GA', '#0A5CB8', false, true);
