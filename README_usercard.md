# User Card in Header (Supabase Auth)

This site includes a user profile card in the header that appears **after login**.

## How it works
- `assets/gh-loader.js` loads the Supabase SDK, `assets/env.js`, and `assets/auth.js` on every page.
- `assets/auth.js`:
  - Creates a `Войти` button (`#authOpen`) and a user container (`#userWidget`) inside the header.
  - Shows a modal for Sign in / Sign up / Reset password.
  - After successful login, renders a compact user card ("profile chip") with avatar and **name**:
    - If `profiles.full_name` is present, it shows that.
    - Otherwise falls back to the user's email.
  - Includes a tiny menu (`⋯`) with a **Logout** action and a link to `profile.html`.

- `profile.html` + `assets/profile.js` allow the user to update their full name and avatar (stored in the `profiles` table and `avatars` bucket).

## Configuration
- Edit `assets/env.js` and set your Supabase URL and Anon Key:
  ```js
  window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
  window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
  ```

## Database
Run `supabase_profile.sql` in your project to create the `profiles` table and storage policies. A trigger automatically inserts a profile row for each new user.

