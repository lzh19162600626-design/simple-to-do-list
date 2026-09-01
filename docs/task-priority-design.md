# Task Priority Design Specification

## 1. Goal and scope

Add three explicit task priorities—`high`, `medium`, and `low`—without changing the existing All / Active / Completed filtering or drag-and-drop ordering model. Users can choose a priority while creating a task, see it in normal and completed list rows, and change it while editing a task.

This document defines interaction, accessibility, responsive behavior, data compatibility, and acceptance criteria. It does not prescribe a production-code implementation beyond the contracts needed by engineering and QA.

## 2. Product rules

- Every task has exactly one priority: `high`, `medium`, or `low`.
- New tasks default to `medium`; the choice remains `medium` after a task is added. A user's previous selection is not remembered, preventing accidental carry-over between tasks.
- Priority does not change task order. Existing manual drag-and-drop order remains authoritative.
- Existing All / Active / Completed filters continue to filter only by completion state. Adding priority filtering or automatic sorting is out of scope.
- Completion does not change or remove a task's priority. If a task is reopened, its previous priority remains.
- Editing can change text, priority, or both in one save operation. Cancel discards both changes.

## 3. Priority vocabulary and visual language

Use the following fixed English labels to match the current UI language. Each visible indicator combines text, a distinct symbol, and color, so meaning never depends on color alone.

| Value | Visible label | Symbol | Suggested semantic color | Accessible name |
| --- | --- | --- | --- | --- |
| `high` | High | `!!` | red / danger | `Priority: High` |
| `medium` | Medium | `!` | amber / warning | `Priority: Medium` |
| `low` | Low | `↓` | blue-gray / muted | `Priority: Low` |

Symbols are decorative when placed beside the visible label and must use `aria-hidden="true"`. Do not use only a colored dot, colored border, or row background to communicate priority. Text contrast must meet WCAG AA: at least 4.5:1 for normal-sized text; focus and component boundaries must reach 3:1 against adjacent colors.

## 4. Add-task interaction

### 4.1 Layout

Add a field labeled `Priority` between the task text input and the Add button. Use a native `<select>` as the baseline control because it supplies familiar keyboard and mobile-picker behavior without a custom widget.

Options appear in urgency order:

1. `High`
2. `Medium` (selected by default)
3. `Low`

Desktop (more than 480 px): keep the existing form in one row. The text field remains flexible; the priority control has a compact fixed/minimum width sufficient for the full `Medium` label; Add remains the final action.

Mobile (480 px or less): retain the current stacked form. Text input is the first row; Priority and Add each use the full available width on following rows. The visible `Priority` label must remain present rather than relying on option text as a placeholder. Touch targets are at least 44 × 44 CSS px.

### 4.2 Behavior

- Initial state: empty task text, `Medium` selected.
- Submit via Add or Enter in the task text input creates `{ ..., priority: selectedPriority }`.
- Empty or whitespace-only text is still rejected; the selected priority alone cannot create a task.
- After successful creation, clear and refocus the task text input and reset priority to `Medium`.
- If creation is rejected because text is empty, keep the selected priority unchanged and retain/focus the text input.
- Tab order is task text → Priority → Add. The native select supports Arrow keys and type-ahead according to the browser/platform.
- Add's accessible name stays `Add task`; Priority uses an explicit `<label>` associated with the select, so a screen reader announces the control and selected value.

## 5. Task-list presentation

### 5.1 Normal and completed rows

Place a compact priority badge immediately before the task text and after the checkbox. The resulting reading order is drag handle → completion checkbox → priority → task text → actions. The badge always shows its symbol and full text (for example, `!! High`); do not collapse it to color or symbol only on mobile.

The row's accessible name must include priority, task text, and completion state in that order, for example: `Priority: High, Submit report, active`. Avoid duplicating the badge announcement: either make the visible badge available to assistive technology and simplify the row label, or hide the badge from the accessibility tree when the row label carries the same information.

Completed rows retain the badge and its label. The existing reduced opacity may apply to the row, but priority text must remain legible and meet contrast requirements; strikethrough applies only to task text, not the badge.

### 5.2 Responsive behavior

- Desktop: keep a single row while space permits. The badge does not shrink or wrap internally; task text takes remaining width and may wrap.
- Mobile: actions remain visible as they are today. The task row may wrap, with the badge and task text forming the content region; the checkbox and action buttons must not overlap or become smaller than 44 × 44 CSS px.
- At 320 px viewport width, the complete priority word remains visible, long task text wraps without horizontal page scrolling, and edit/save/cancel actions remain reachable.
- Drag-and-drop visuals and the stored task order are unchanged. Priority must not create a drag handle or imply automatic rank.

## 6. Edit interaction

Entering edit mode replaces the static task text and badge with:

- a text input prefilled with the current text; and
- a labeled native Priority select preselected to the current priority.

Save and Cancel remain visible. On desktop, text and priority may share the editable content row before the actions. On mobile, text and Priority stack full width, followed by Save and Cancel controls. The text input receives initial focus with the caret at the end, matching current behavior.

Keyboard contract:

- `Tab` moves text → Priority → Save → Cancel.
- `Enter` while focus is in the text input saves both current text and selected priority.
- Changing the native select with the keyboard does not auto-save.
- `Escape` from either the text input or Priority select cancels the entire edit and restores the original text and priority.
- Activating Save stores both fields; activating Cancel stores neither.

Validation contract:

- Blank/whitespace-only edited text follows the current behavior: cancel the edit without persisting either text or priority changes.
- A priority outside `high | medium | low` is normalized to `medium` before display or save.
- After Save or Cancel, focus returns to the edited task's Edit button when it still exists and is visible. This avoids losing keyboard position after the list re-render.

## 7. Data model and backward compatibility

The persisted task shape becomes:

```javascript
{
  id: "unique-id",
  text: "Task description",
  completed: false,
  createdAt: "ISO date",
  priority: "medium" // "high" | "medium" | "low"
}
```

Normalize immediately after reading `simple-todo-list` from `localStorage`:

- If a task has no `priority`, use `medium`.
- If `priority` is null, not a string, or any value outside the allowed set, use `medium`.
- Preserve valid `high`, `medium`, and `low` values unchanged.
- Preserve task IDs, text, completion state, creation timestamps, and array order unchanged.
- Persist the normalized array once after a successful load when any item changed, so migration is durable. Do not wipe all tasks if only one item has invalid priority.
- Existing malformed-storage handling remains: unreadable/non-array data fails safely to an empty list according to the app's existing recovery policy.

All create, edit, render, and save paths consume only normalized lowercase values. UI labels are derived from the vocabulary table rather than stored separately.

## 8. States and feedback

| State | Required presentation / behavior |
| --- | --- |
| New task | Priority control defaults to Medium. |
| Existing legacy task | Renders and behaves as Medium after load; no warning is needed. |
| Active task | Badge is fully legible beside task text. |
| Completed task | Badge stays visible; only task text is struck through. |
| Editing | Text and Priority are both editable; Save/Cancel affect both. |
| Filtered list | Priority is displayed, but does not affect membership or count. |
| Empty filter result | Existing empty state remains unchanged. |
| Invalid stored priority | Silently normalizes to Medium without losing the task. |

## 9. Accessibility requirements

- Priority is conveyed by full text plus a symbol; color is supplemental.
- Add and edit Priority controls have persistent programmatic labels.
- All priority controls, Save, Cancel, Add, and row actions are operable with keyboard only and have a visible `:focus-visible` indicator.
- Use native select semantics; do not add conflicting ARIA roles to native elements.
- Dynamic list rendering must expose the updated priority through the row/badge accessible text. No additional live-region announcement is required for this scope.
- Do not place emoji alone in an accessible name; use the explicit strings `Priority: High`, `Priority: Medium`, or `Priority: Low`.
- `prefers-reduced-motion` behavior is unchanged; priority must remain understandable when animations are unavailable.

## 10. Engineering handoff boundaries

Expected implementation surfaces are `index.html` (new creation control/label), `css/style.css` (priority controls, badges, responsive/edit layouts, focus/contrast tokens), and `js/app.js` (priority constants, normalization, CRUD payloads, templates, event handling, focus restoration). No dependency, backend, storage-key change, new priority filter, or automatic sorting is required.

## 11. Acceptance criteria

1. Given a fresh app, when the page loads, then the creation Priority control displays Medium.
2. Given High is selected and valid text is entered, when Add or Enter submits, then the new task is stored with `priority: "high"` and its row visibly shows `!! High`.
3. Given a task is successfully added with High or Low, then the form clears the text, returns focus to the text input, and resets Priority to Medium.
4. Given blank text and any priority, when submission is attempted, then no task is created and the chosen priority is retained.
5. Given a task is displayed, then its priority is identifiable by full text and a distinct symbol without relying on color.
6. Given a completed task, then its priority remains visible and unchanged; only task text is struck through.
7. Given a task enters edit mode, then its text and current priority are prefilled and the text input receives focus.
8. Given text and priority are changed in edit mode, when Save or Enter in the text input is used, then both values persist after reload.
9. Given text and priority are changed in edit mode, when Cancel or Escape is used, then neither change persists.
10. Given an old stored task with no `priority`, when the app initializes, then the task is preserved in the same position, appears as Medium, and is durably saved with `priority: "medium"`.
11. Given an invalid stored priority, when the app initializes, then that task alone is normalized to Medium and other task data is preserved.
12. Given All, Active, or Completed is selected, then membership and counter behavior remain based only on completion state, while every rendered task retains its priority badge.
13. Given keyboard-only use, then users can create and edit a priority in the documented Tab order, activate actions, cancel with Escape, and always see focus.
14. Given a 320 px viewport, then labels are not truncated to color/symbol only, controls remain at least 44 × 44 CSS px, long task text wraps, actions remain reachable, and no horizontal page scroll is introduced.
15. Given a screen reader inspects a task, then it can determine priority, task text, and completion state without duplicated or contradictory announcements.
16. Given priorities differ, then manual drag-and-drop order remains unchanged and reload preserves that order.

## 12. QA data set

Use at least these stored records during verification:

```javascript
[
  { id: "legacy", text: "Legacy task", completed: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "high", text: "Urgent task", completed: false, createdAt: "2026-01-02T00:00:00.000Z", priority: "high" },
  { id: "done-low", text: "Completed low task", completed: true, createdAt: "2026-01-03T00:00:00.000Z", priority: "low" },
  { id: "invalid", text: "Invalid priority", completed: false, createdAt: "2026-01-04T00:00:00.000Z", priority: "urgent" }
]
```

Expected after initialization: array order is unchanged; `legacy` and `invalid` are Medium; `high` remains High; `done-low` remains completed and Low.
