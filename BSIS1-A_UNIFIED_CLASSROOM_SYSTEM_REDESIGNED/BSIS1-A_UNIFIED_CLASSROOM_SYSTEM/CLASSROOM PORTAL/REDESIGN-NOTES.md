# BSIS 1-A Unified Classroom System — Full UI Redesign

## Included
- Glassmorphism visual system across portal pages
- Aurora/grid background and depth layers
- 3D hover/tilt interaction for major cards
- Persistent light/dark appearance toggle
- Scroll progress indicator
- Refined buttons, forms, navigation, cards and typography
- Responsive mobile behavior preserved
- Interactive schedule-aware classroom room map on Home
- Room chips generated from published `class_schedule` data
- No campus coordinates or physical locations invented

## Data / functionality
The redesign is a presentation and interaction layer. Existing Supabase authentication, admin recognition, schedules, attendance, grades, directory, officers and profile logic remain in place.

The room map reads published rooms from the existing `class_schedule` table. Geographic/campus mapping should only be added after the exact campus coordinates or official map source are supplied.
