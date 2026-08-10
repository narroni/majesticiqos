-- BLUEPRINT §2.3 admin_users
-- Membership in this table IS the authorisation grant. An auth.users row
-- with no admin_users row has zero access.

create table admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role admin_role not null default 'staff',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
