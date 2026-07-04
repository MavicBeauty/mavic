# Mavic Beauty & Nails — Project Instructions

## Changelog for María — ask before every commit

This project has an internal changelog panel for the non-technical co-owner (María) at
`/admin/dashboard` (bell icon → slide-over panel). She doesn't use git, so this panel is
the only way she finds out what changed. Entries live in `lib/changelog.ts`; the UI is
`components/ChangelogBell.tsx`.

**Before creating any commit in this repo — any path, not just `/admin` or `/empleada`,
the public site included — ask the user:**

> Do you think this change is worth reporting at the /admin changelog?

- **No** → commit as normal, no changelog change.
- **Yes** → add a new entry to the *top* of the `CHANGELOG` array in `lib/changelog.ts`
  before committing, and include that edit in the same commit.

Always ask. Don't try to guess whether a change is "important enough" from which files
changed or how big the diff is — that judgment call is unreliable and was tried and
rejected. Asking is one extra step per commit but removes the guesswork entirely.

**Exception:** if the user's own request already states the answer explicitly — e.g.
"commit and push, include it in María's changelog" (yes) or "commit this, no need for
the changelog" (no) — don't ask again, just act on what they said. Only ask when they
haven't already told you. A vague request to "check if this needs a changelog entry"
is not an explicit answer — that's asking you to judge, which is exactly what this rule
exists to avoid, so ask in that case too.

### Entry format

See `ChangelogEntry` in `lib/changelog.ts`:

- `id`: `YYYY-MM-DD-short-slug`, unique
- `date`: today, `YYYY-MM-DD`
- `title` / `description`: plain, non-technical Spanish — no jargon, written for María
- `why`: the reason this changed, in plain language
- `tag`: `'nuevo'` | `'mejora'` | `'arreglo'`
