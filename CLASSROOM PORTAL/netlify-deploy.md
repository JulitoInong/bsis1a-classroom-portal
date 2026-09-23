# BSIS 1-A Student Portal — Netlify Deployment

This is a static HTML/CSS/JavaScript project using Supabase, Google OAuth, and a PWA service worker. There is no npm/build command in this project.

## Deploy with Netlify Drop

1. Extract this folder so `index.html` is directly inside the folder you deploy.
2. Open Netlify and create a new site using **Deploy manually / Netlify Drop**.
3. Drag the extracted project folder into the deployment area.
4. Wait for the deployment to finish and open the generated `*.netlify.app` URL.
5. In Supabase → Authentication → URL Configuration, set the production Site URL and add the deployed callback URL used by the app, for example:
   `https://YOUR-SITE.netlify.app/registrar/index.html`
6. Test Google sign-in, registration, student navigation, PWA installation, and the admin portal.
7. In Supabase SQL Editor, run `admin-student-delete-migration.sql` before testing Admin → Student Records → Delete Student.
8. Run `student-data-migration.sql` after the base student/admin migrations before testing Attendance or Grades. This creates the centralized tables and RLS policies for authenticated student records.

## Important

- Do not put a Supabase `service_role` key or Google OAuth client secret in this frontend.
- The browser uses only the Supabase publishable/anon key.
- The PWA requires HTTPS in production.
- The service worker does not cache private Supabase responses.
- Attendance requires each Google account to have a linked `students.auth_user_id` record. Unlinked accounts are returned to the Registrar flow.
- Grades are intentionally local-only in the browser for privacy and are not uploaded to Supabase.
- Attendance recording is admin-only. Students see only their own read-only day-by-day attendance history.
- Test both a regular student account and an admin account after the migration.

## Future updates

### Manual Netlify Drop workflow

Edit code → test locally → replace the deployed project with the updated project folder → wait for deployment → test the live URL.

### Git-connected workflow

If the project is later connected to Git, commit/push the changes and let the configured Netlify build/deploy pipeline publish the new commit. This project currently has no package manager build script, so the publish directory is the project root containing `index.html`.
