# BSIS 1-A Portal Implementation Audit

Date: 2026-09-23

## Implemented

- Added a refresh/in-flight guard to the Home initialization flow to prevent duplicate Supabase requests from `pageshow` and `visibilitychange`.
- Added visible fallback handling when the Home profile or content queries fail.
- Bumped the root service-worker shell cache to `bsis-1a-shell-v9` so stale deployed HTML/CSS/JS is replaced.
- Fixed Attendance PWA icon paths to use the existing shared 192px and 512px assets.
- Bumped the Attendance service-worker cache to `bsis1a-v6`.
- Fixed the Attendance Apple touch icon reference.
- Added a registered-student check to the Grades entry guard. Authenticated users without a student record are sent to Registrar.
- Added accessible names to generated Grades course, grade, units, and remove controls.
- Added accessible labels to Attendance manual entry and roster search.
- Added an accessible label to Admin student search and hid decorative search glyphs from assistive technology.
- Added a shared `.sr-only` utility.
- Added `inert` handling to the closed Home, Profile, and Schedule navigation drawers so hidden links cannot receive keyboard focus.

## Verified Locally

- All workspace diagnostics report no errors.
- All JavaScript files in the portal parsed successfully in browser syntax checks.
- All portal HTML routes returned HTTP 200 from a local static server.
- Attendance PWA icon assets returned HTTP 200.
- Attendance manifest points to existing icon assets.
- Root and Attendance service-worker scripts returned HTTP 200 and parsed successfully.

## Live Checks Still Required

- Google OAuth account selection and redirect on the deployed domain.
- Supabase RLS policies for student, admin, schedule, content, and attendance tables.
- Admin CRUD operations against the production database.
- Profile photo upload/delete storage policies.
- Camera permission, QR scanning, offline queue recovery, and PWA installation on a real device.
- Confirm that the deployed host serves the latest `sw.js`; after deployment, reload once or unregister the old service worker if the old shell remains visible.

## Manual Smoke Test

1. Sign in with a registered student account.
2. Open Home, Profile, Schedule, Attendance, Grades, Class Directory, and Class Officers.
3. Open and close each navigation menu with mouse and keyboard Escape.
4. On Attendance, test camera start/stop, manual entry, search, filters, export, and clear confirmation.
5. On Grades, add a course, edit grade/units, remove it, export, print, and switch semesters.
6. Sign in as an admin and test student, officer, announcement, class information, and schedule CRUD actions.
7. Hard reload after deployment and confirm the old loading-only dashboard text is gone.
