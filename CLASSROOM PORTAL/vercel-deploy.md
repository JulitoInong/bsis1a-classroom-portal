# BSIS 1-A Student Portal - Vercel Deployment

This is a static HTML/CSS/JavaScript project. No build command is required.

## Deploy from Vercel Dashboard

1. Open Vercel and sign in.
2. Choose **Add New Project** and import the repository, or use **Deploy without Git** if uploading manually.
3. Set the project root to the folder containing `index.html`.
4. Framework preset: **Other**.
5. Build command: leave empty.
6. Output directory: `.` or leave the default for a static project.
7. Deploy.

## Supabase URL Configuration

After deployment, copy the Vercel URL and add these URLs in Supabase Authentication > URL Configuration:

- Site URL: `https://YOUR-PROJECT.vercel.app/`
- Student redirect: `https://YOUR-PROJECT.vercel.app/registrar/index.html`
- Admin redirect: `https://YOUR-PROJECT.vercel.app/admin/admin-callback.html`

Also add the same production URLs to the Google OAuth provider configuration where required.

## Required checks

- Run the required Supabase migrations, including `student-data-migration.sql`.
- Link each student account through `students.auth_user_id`.
- Test student login, Registrar, Home, Attendance, Grades, and Admin login.
- Grades are local-only in each student browser for privacy; they are not uploaded to Supabase.
- Attendance scanning/manual recording is admin-only. Students see only their own read-only attendance history, saved by date.
- Admin attendance can continue offline after the roster has loaded once; queued records sync when the connection returns.
- Open the site over HTTPS before testing camera access or PWA installation.
- If an old PWA shell appears, unregister the service worker or clear site data and reload.

Do not put a Supabase `service_role` key or Google OAuth client secret in this static frontend.
