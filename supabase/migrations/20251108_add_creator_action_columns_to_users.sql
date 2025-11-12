-- Track creator action states for each user
alter table if exists public.users
  add column if not exists replace_creators text[] default '{}'::text[],
  add column if not exists keep_creators text[] default '{}'::text[],
  add column if not exists find_more_creators text[] default '{}'::text[];

update public.users
set replace_creators = coalesce(replace_creators, '{}'::text[]),
    keep_creators = coalesce(keep_creators, '{}'::text[]),
    find_more_creators = coalesce(find_more_creators, '{}'::text[]);

comment on column public.users.replace_creators is 'Creators that the user marked as Replace.';
comment on column public.users.keep_creators is 'Creators that the user marked as Keep.';
comment on column public.users.find_more_creators is 'Creators that the user marked as Find more.';

