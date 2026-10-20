# Gate Log

One row per gate decision, appended to `docs/project/gate_log.csv`. Purpose: measure which gates catch real defects and which are ceremony, using the weekly audit. It is plain text on purpose: anyone can read it, nothing in it is a model's guess.

## Columns

| Column | Meaning |
|---|---|
| `timestamp` | UTC, ISO 8601 |
| `story` | `US-###`, `CHG-###`, `INF-###`, `SEC-###` |
| `gate` | `BA_GATE1`, `ARCH_ACCEPT`, `HFD_REVIEW`, `CODER_SCOPE`, `CODER_DONE`, `REVIEWER` |
| `actor` | Role name, or `hook` for the scope guard |
| `verdict` | `PASS`, `KICK_BACK`, `CHANGE_REQUEST`, `WARN`, `BLOCK` |
| `reason_code` | One value from the list below. Required unless `PASS`. |
| `detail` | One short line, in quotes. File path, AC id, or the finding. |
| `outcome` | Filled in later: `confirmed` (the gate was right), `false_alarm`, `missed_defect_found_later`, or `pending` |

## Reason codes

| Code | Use when |
|---|---|
| `OUT_OF_SCOPE_EDIT` | An edit touched a file not in the story's Files in Scope |
| `AC_NOT_MET` | An acceptance criterion is not satisfied |
| `TEST_FAIL` | A test failed, or a required test is missing |
| `DRIFT` | The change does something the story did not ask for |
| `DUPLICATE_CAPABILITY` | The story repeats an existing capability |
| `SPEC_AMBIGUOUS` | The story or design was unclear enough to stop work |
| `SECURITY` | Access control, tenant isolation, or data exposure issue |
| `OTHER` | Anything else. Say what in `detail`. |

## Who writes what

- **The scope-guard hook** writes `CODER_SCOPE` rows automatically (`.claude/hooks/story-scope-guard.sh`). It logs each story-and-file pair once.
- **Each role** appends its own verdict row when it signs off or kicks a story back. REVIEWER always writes a row, `PASS` included, so pass rates are measurable.
- **The weekly audit** fills in `outcome` for the week's rows and reports: kick-backs per gate, top reason codes, and `Size`/`Risk` tags against actual rework.

## What this is not

It is not a classifier and it does not make decisions. It records the decisions the gates already make. If it ever shows hundreds of repetitive, low-stakes decisions eating usage limits, that is the evidence for revisiting a cheap classifier. Until then it is just the record.
