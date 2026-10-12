---
version: 1
slug: "fe-btl-mobile-app-task-detail-jsx"
primary_target: "FE_BTL_Mobile/app/task-detail.jsx"
related_targets: ["FE_BTL_Mobile/app/(tabs)/home.jsx"]
---

# Home task details

Mode: Operate. A narrow extension of the existing Home flow, specified by the user. No visual-world change, new imagery, database schema, or additional task-management actions.

## Direction contract

THESIS: Tap a Home task to read its complete content and change its status directly; replace the status-only popup with a navigable detail screen.

OWN-WORLD: Inherit the app's system font, indigo selection color, light/dark surfaces, outlined rounded controls, and Ionicons. Use the existing Android back/navigation conventions.

STORY: Read the task title, description, and deadline; choose Đang làm, Chưa làm, or Hoàn thành; automatically return to Home with refreshed data after a successful status change. Preserve all other task fields and group permissions.

FIRST VIEWPORT: Back and screen title at the top; a full task title followed by description and deadline in one readable column; exactly three status actions below. All content scrolls on compact screens; desktop prose is width-bounded. Selected, saving, failure, empty, and read-only states are explicit.

FORM: User-specified narrow extension, code-led; no concept-seed or composition tournament required. Signature interaction: selected status updates only after a successful API write, with duplicate requests blocked. Native stack navigation supplies motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Scope note: No existing DESIGN.md/PRODUCT.md. Ordinary extension preserves the incumbent visual implementation; documentation handoff compares against it without introducing a global design system.

## Home count consistency

User-confirmed behavior: Home shows all unfinished work, including tasks with future start dates; completed tasks remain excluded. Counts reflect the current search and status filter. The visible breakdown partitions personal regular, personal recurring, and group work without double-counting. Tasks retains its personal regular/recurring tabs and All/Open/Completed filters, sharing the recurring classification with Home. Compare Home's personal subtotals with Tasks' Open counts, not its All count (which also includes completed work).

## Assigned group work on Home

Home's group workload includes only tasks whose `nguoiNhanId` matches the signed-in user. Team membership, leadership, or creating/assigning a task does not grant implicit Home visibility; unassigned work is excluded. Apply this scope before computing progress, summaries, list counts, search, and status filters. Group collaboration screens and their shared-list API remain unchanged so members can still collaborate and leaders can manage all group work. On a fresh load after reassignment, only the new recipient sees the task on Home. Preserve the current layout and personal unfinished-task behavior.

## Return Home after a status change

After a changed status is saved successfully, dismiss the detail route to Home and let Home refresh on focus; use the same flow for personal and editable group tasks, including direct links. Do not navigate while saving, on failure, on an unchanged status, or after the user has left the detail screen. A late successful write still notifies Home to refresh without forcing navigation. Keep the existing error, loading, permission, and duplicate-request handling and all visual styling.
