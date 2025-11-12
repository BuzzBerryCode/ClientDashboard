# Login Page Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under "API" section.

## Supabase Table Setup

The login page is configured to work with the following Supabase table structure:

**Table Name:** `users`

**Schema:**
```sql
create table public.users (
  id uuid not null default gen_random_uuid(),
  username character varying(255) not null,
  password character varying(255) not null,
  email character varying(255) null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint users_pkey primary key (id),
  constraint users_username_key unique (username)
);

create index IF not exists idx_users_username on public.users using btree (username);

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column();
```

**Required Columns for Login:**
- `username` (varchar) - The username field (unique constraint)
- `password` (varchar) - The password field

**Optional Columns:**
- `email` (varchar) - Will be stored in session if available
- `id`, `created_at`, `updated_at` - Automatically handled by the database

### Important Security Note

⚠️ **Warning:** This implementation stores passwords as plain text for simplicity. In production, you should:
1. Use Supabase Auth instead of custom authentication
2. If you must use custom auth, hash passwords using bcrypt or similar
3. Never store passwords in plain text

## Usage

1. Navigate to `/login` to access the login page
2. Enter username and password
3. The system will query the Supabase table for matching credentials
4. Upon successful login, you'll be redirected to the home page
5. Session is stored in `sessionStorage` with key `isAuthenticated`

## How It Works

The login page:
1. Queries the `users` table for a matching `username` and `password`
2. Uses `.maybeSingle()` to handle cases where no user is found (no error thrown)
3. Stores user session information in `sessionStorage`:
   - `isAuthenticated`: 'true'
   - `username`: the logged-in username
   - `email`: user's email (if available)
4. Redirects to the home page (`/`) on successful login
5. Shows error messages for invalid credentials or connection issues

