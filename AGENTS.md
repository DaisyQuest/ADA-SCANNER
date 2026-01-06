# Agent Workflow Rules

These rules apply to the entire repository.

## Safe commits without conflicts
- Always work on a feature branch; do not commit directly to shared branches.
- Respect folder ownership: only modify files within your team’s directories unless cross-team coordination is explicitly agreed.
- Avoid edits that span multiple teams’ folders in a single commit.
- When conflicts arise, rebase onto the latest target branch and resolve within your team-owned files first.

## Spec/checklist synchronization check
- Before starting work **and** before committing, run a synchronization check to confirm `PROJECT_SPEC.md` and `PROJECT_CHECKLIST.md` contain matching identifiers.
- If any mismatch is detected, update both documents to restore parity before proceeding.

## Work summary requirement
- Immediately before committing, append a line to `$TEAMNAME_WORK_SUMMARIES.md` describing the changes and listing relevant `SPEC-###` identifiers.
- Format: `YYYY-MM-DD - <summary> (SPEC-###, SPEC-###)`.

## Team selection rules
- Infer the team from context (e.g., contrast work → `contrast` team).
- If no team is specified, choose a team at random and record the selected team in the work summary.
