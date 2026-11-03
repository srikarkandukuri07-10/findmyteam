# Module 3 plan · Profiles

Covers PRD PROF-1, PROF-2, PROF-3 (username only, repos in 3b), PROF-8, plus the profile completeness score. Split in two so each part ships tested.

## 3a: this build

- **Skills and roles** from fixed lists (about 55 skills in technical and non-technical groups, 12 roles). A student picks up to 15 skills, each with a level (beginner, intermediate, advanced), and up to 3 preferred roles.
- **Profile fields:** name, bio (500 characters), branch, year of study, graduation year, GitHub username, LinkedIn link (plain URL, no integration).
- **Pages:** `/profile` (my profile and completeness), `/profile/edit`, `/students/[id]` (another student's profile; Module 4 cards will link here). "Profile" added to the navigation.
- **Completeness score** shown as a percentage with a list of what's missing; the home checklist ticks "Build your profile" at 70%.

## 3b: next

Photo upload (Supabase Storage), GitHub repositories and languages (public API, cached; needs a free GitHub token to avoid shared rate limits), past hackathons with self-reported / verified badges (PROF-4, PROF-5), projects (PROF-6).

## Privacy and security

- Other students never read the `profiles` table. They get a safe subset through `get_profile()`: no birth year, no consent data, no email, no account status.
- Skills and roles are written only through `save_profile()`, in one transaction, after the onboarded check.
- Suspended or banned students are not shown to others.
- GitHub username and LinkedIn link are format-checked in the database (LinkedIn must be an `https://…linkedin.com/in/…` address), so a profile can't hold a `javascript:` or look-alike link.

## Done when

Database checks and unit tests pass; a student can fill in a profile, see it on `/profile`, and another student can open it at `/students/[id]` without seeing private fields; lint, typecheck and build pass.
