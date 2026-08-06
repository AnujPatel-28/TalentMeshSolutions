# W10 — Decompose Oversized Pages

**Model:** Gemini 3.5 Flash  
**Workstream:** W10 (Decompose oversized pages)  
**Phase:** 12  
**Date:** 2026-07-20  

---

## Architectural & Change Summary

| Field | Description |
|---|---|
| **Server-side changes** | None (pure client-side refactor). |
| **Client-side changes** | Reconstructed the announcements and settings portals to move state, handlers, and logic from the view layer into dedicated hooks and subcomponents:<br><br>**Announcements refactoring:**<br>- Moved fetching, image uploading, toggling, saving, and deleting state/logic from `announcements/page.tsx` into a custom hook `lib/hooks/useAdminAnnouncements.ts`.<br>- Extracted the slide-up composition drawer into `app/dashboard/admin/announcements/_components/AnnouncementComposer.tsx`.<br>- Extracted list card representation into `app/dashboard/admin/announcements/_components/AnnouncementCard.tsx`.<br>- Replaced all inline `style={{ ... }}` objects in page rendering and subcomponents with CSS module rules in `announcements.module.css`. <br><br>**Settings refactoring:**<br>- Moved settings operations, user profile saving, session renaming/revocation, and quarantined file handling into a custom hook `lib/hooks/useAdminSettings.ts`.<br>- Extracted the "General Settings" tab into `app/dashboard/admin/settings/_components/GeneralSettingsTab.tsx`.<br>- Extracted the "Active Sessions & Devices" tab into `app/dashboard/admin/settings/_components/DeviceSessionsTab.tsx`.<br>- Extracted the "Quarantine Manager" tab into `app/dashboard/admin/settings/_components/QuarantineTab.tsx`.<br>- Replaced all inline `style={{ ... }}` properties in tab navigation, tables, selects, and inputs with CSS module rules in `settings.module.css`. |
| **Impact if changed** | Page files become clean, small, and readable. Business logic is separated from UI representation, making the components highly maintainable and unit-testable. Inline styles are eliminated in favor of clean CSS modules. |
| **Impact if not changed** | Monolithic components (~1000 lines each) remain difficult to maintain, mix concerns (data fetching, layout, modals, custom styling, image uploads), and violate clean architecture. |
| **Reason for change** | Clean code hygiene, separation of concerns, and compliance with the production-readiness roadmap. |
| **Deploy priority** | P2 (important architectural improvement) |

---

## What Changed

### 1. Custom React Hooks

#### [NEW] [useAdminAnnouncements.ts](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/lib/hooks/useAdminAnnouncements.ts)
A custom hook that encapsulates:
- All states for list views (items, loading, filters).
- Composer form states (editing announcement, saving, validation errors).
- Attachment image upload states and functions (`insforge.storage` uploads, file pick, drag-and-drop, image removal).
- CRUD operations targeting the `admin-announcements` edge function (POST, PATCH, DELETE).

#### [NEW] [useAdminSettings.ts](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/lib/hooks/useAdminSettings.ts)
A custom hook that encapsulates:
- Super admin authorization check (redirects non-super-admins).
- Active tab switching state.
- Database reads and mutations for personal profile, global settings flags, device session renaming/revocation, and storage quarantine file restoration/purges.

---

### 2. Standalone Subcomponents

#### [NEW] [AnnouncementComposer.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/announcements/_components/AnnouncementComposer.tsx)
- Replaces the inline composition overlay.
- Uses `RichTextEditor` and contains the image dropzone.
- Leverages new CSS modules instead of inline `style` objects.

#### [NEW] [AnnouncementCard.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/announcements/_components/AnnouncementCard.tsx)
- Renders the list card with metadata badges, thumbnail, and actions.
- Integrates the fan-out queue progress bar.
- Leverages new CSS module classes for progress bars, badges, and layout.

#### [NEW] [GeneralSettingsTab.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/settings/_components/GeneralSettingsTab.tsx)
- Renders profile name form, global configuration forms, admin table lists, feature flag lists, and the Maintenance Mode card.
- Replaces inline styles for tables, form layouts, and inputs with classes.

#### [NEW] [DeviceSessionsTab.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/settings/_components/DeviceSessionsTab.tsx)
- Renders active sessions and renaming/revocation controls.

#### [NEW] [QuarantineTab.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/settings/_components/QuarantineTab.tsx)
- Renders the quarantine manager log table, file restoration, and physical purges triggers.

---

### 3. CSS Modules Update

#### [MODIFY] [announcements.module.css](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/announcements/announcements.module.css)
Added rules for:
- `.imageUploadContainer`, `.imageUploadLabel`, `.imageUploadLabelOptional`
- `.imagePreviewWrapper`, `.imagePreviewImg`, `.imageRemoveBtn`
- `.imageMetaBar`, `.imageMetaFilename`
- `.dropzone`, `.dropzoneText`, `.dropzoneSubtext`
- `.previewContainer`, `.previewTitleLabel`, `.bannerPreviewBox`
- `.bannerPreviewContent` (with type modifiers: `.info`, `.success`, `.warning`, `.critical`)
- `.bannerPreviewIcon`, `.bannerPreviewBody`, `.bannerPreviewTitle`, `.bannerPreviewPlaceholder`, `.bannerPreviewDismiss`, `.bannerPreviewFooter`
- `.toggleRowMargin`, `.scheduledLabelNoCaps`
- `.cardImageWrapper`, `.cardImageThumb`
- `.fanoutProgressContainer`, `.fanoutProgressHeader`, `.fanoutStatusSpan` (with type modifiers: `.fanoutStatusDelivered`, `.fanoutStatusFailed`, `.fanoutStatusPending`)
- `.fanoutCountSpan`, `.fanoutProgressBarTrack`, `.fanoutProgressBarFill` (with type modifiers: `.delivered`, `.failed`, `.pending`)
- `.listLoadingWrapper`
- `.badgePublished`, `.badgeDraft`

#### [MODIFY] [settings.module.css](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/settings/settings.module.css)
Added rules for:
- `.loadingBackbone`, `.tabList`, `.tabButton`, `.tabButtonActive`
- `.messageBanner` (with `.error`, `.success`, `.info` modifiers)
- `.disabledInput`, `.inputHint`
- `.adminTable`, `.tableHeaderRow`, `.tableHeaderCell`, `.alignRight`, `.tableBodyRow`, `.tableBodyCell`
- `.adminMemberName`, `.adminMemberEmail`
- `.roleSelect` (with `.superAdminRole`, `.adminRole` modifiers)
- `.revokeButton` (with `.disabledRevoke` modifier)
- `.addAdminForm`, `.flexInput`
- `.maintenanceItem`, `.maintenanceTitle`, `.toggleMaintenanceOn`

---

### 4. Page Entrypoints

#### [MODIFY] [page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/announcements/page.tsx)
Reconstructed the announcements page to delegate all logic to the hook and mount decomposed subcomponents. Reductions: **~929 LOC down to ~158 LOC**.

#### [MODIFY] [page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/settings/page.tsx)
Reconstructed the settings page to delegate all logic to the hook and mount decomposed subcomponents. Reductions: **~963 LOC down to ~128 LOC**.

---

## Verification Results

### 1. TypeScript compilation (`npx tsc --noEmit`)

```
app/dashboard/candidate/[role_id]/applications/page.tsx(686,37): error TS2322: Type '{ enter: (dir: number) => { x: number; opacity: number; }; center: { x: number; opacity: number; transition: { x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }; }; exit: (dir: number) => { ...; }; }' is not assignable to type 'Variants'.
  Property 'center' is incompatible with index signature.
    Type '{ x: number; opacity: number; transition: { x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }; }' is not assignable to type 'Variant'.
      Type '{ x: number; opacity: number; transition: { x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }; }' is not assignable to type 'TargetAndTransition'.
        Types of property 'transition' are incompatible.
          Type '{ x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }' is not assignable to type 'Transition<any> | undefined'.
            Type '{ x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
              Type '{ x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }' is not assignable to type 'StyleTransitions'.
                The types of 'x.type' are incompatible between these types.
                  Type 'string' is not assignable to type 'AnimationGeneratorType | undefined'.
```
*Note: This compiler error is pre-existing and unrelated to W10 refactored files. All refactored pages, hooks, and components compile clean.*

### 2. Vitest unit tests (`npx vitest run`)

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo

 ✓ __tests__/lib/cookies.test.ts (4 tests) 16ms
 ✓ __tests__/jobStatusTransitions.test.ts (2 tests) 14ms
 ✓ lib/mock-auth.test.ts (6 tests) 22ms
 ✓ __tests__/permissions-matrix.test.ts (5 tests) 18ms
 ✓ __tests__/store/uiStore.test.ts (5 tests) 22ms
 ✓ lib/server-auth.test.ts (7 tests) 276ms
 ✓ __tests__/lib/company.test.ts (8 tests) 35ms
 ✓ __tests__/validators/dashboard.test.ts (9 tests) 41ms

 Test Files  8 passed (8)
      Tests  46 passed (46)
   Start at  22:17:34
   Duration  28.54s (transform 3.06s, setup 9.68s, import 3.65s, tests 444ms, environment 49.05s)
```
*All 46 unit tests passed successfully.*

### 3. Playwright E2E tests (`npx playwright test --reporter=list`)

```
  ok 30 [chromium] › e2e\security-regressions.spec.ts:51:7 › H-9 — Recruiter route guard (P0-2) › unauthenticated → /dashboard/recruiter/* redirects away from recruiter (login or setup) (2.8s)
  -  33 [chromium] › e2e\security-regressions.spec.ts:120:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-flagoff: mock cookie → 401 on api route when ALLOW_MOCK_AUTH is absent [CI-job: security-mock-auth-off]
  ok 34 [chromium] › e2e\security-regressions.spec.ts:142:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-control: candidate mock cookie → 403 on admin route; confirms role boundary works (119ms)
  ok 35 [chromium] › e2e\security-regressions.spec.ts:162:7 › C-4 — /api/jobs POST body injection (HTTP layer) › unauthenticated POST /api/jobs → access denied (401 or 404, not 200/201) (49ms)
  ok 36 [chromium] › e2e\security-regressions.spec.ts:194:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: extra company_id/recruiter_id fields are not rejected with 400 (Zod strips them) (38ms)
  ok 37 [chromium] › e2e\security-regressions.spec.ts:218:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: unauthenticated POST /api/jobs with injected fields → access denied (27ms)
  ok 38 [chromium] › e2e\security-regressions.spec.ts:246:7 › Admin boundary — /api/admin/verification/queue › unauthenticated GET → access denied (401 or 403, not 200) (27ms)
  ok 39 [chromium] › e2e\security-regressions.spec.ts:254:7 › Admin boundary — /api/admin/verification/queue › candidate cookie → 403 (role not in [admin, super_admin]) (25ms)
  -  40 [chromium] › e2e\security-regressions.spec.ts:276:8 › Admin boundary — /api/admin/verification/queue › admin cookie → auth passes (not 401 and not 403) [needs real-JWT fixture]
  ok 41 [chromium] › e2e\security-regressions.spec.ts:288:7 › Admin boundary — /api/admin/verification/decide › unauthenticated POST → access denied (401 or 403, not 200) (31ms)
  ok 42 [chromium] › e2e\security-regressions.spec.ts:299:7 › Admin boundary — /api/admin/verification/decide › candidate cookie POST → 403 (28ms)
  -  43 [chromium] › e2e\security-regressions.spec.ts:316:8 › Admin boundary — /api/admin/verification/decide › admin cookie + invalid UUID → 400 (schema rejects malformed request_id) [needs real-JWT fixture]
  -  44 [chromium] › e2e\security-regressions.spec.ts:324:8 › Admin boundary — /api/admin/verification/decide › admin cookie + valid UUID → auth passes (not 401, not 403) [needs real-JWT fixture]
  ok 32 [chromium] › e2e\security-regressions.spec.ts:82:7 › H-9 — Recruiter route guard (P0-2) › candidate session → /dashboard/recruiter URL is not accessible (redirect confirmed) (1.6s)
  ok 45 [chromium] › e2e\session-governance.spec.ts:164:7 › Session Governance & Cleanup E2E Tests › Session Warning displays modal on inactivity and extends on user action (6.9s)
  ok 46 [chromium] › e2e\session-governance.spec.ts:195:7 › Session Governance & Cleanup E2E Tests › Multi-tab session warning propagates and extends across pages (8.2s)
  ok 47 [chromium] › e2e\session-governance.spec.ts:227:7 › Session Governance & Cleanup E2E Tests › Device Manager displays sessions and supports revocation (2.9s)
  ok 48 [chromium] › e2e\session-governance.spec.ts:284:7 › Session Governance & Cleanup E2E Tests › Quarantine Manager displays quarantined items and handles restoration (2.8s)

  1 failed
    [chromium] › e2e\admin-stabilization.spec.ts:390:7 › Admin Stabilization E2E Tests › Candidate View: queue export lifecycle & progress model updates (Correction 4) 
  7 skipped
  40 passed (1.8m)
```
*Note: The candidate view export test failure is pre-existing and unrelated to these changes (R-8 candidate-export work is uncommitted in this working tree). All other 40 tests passed.*

---

## Deviations & Assumptions

1. **TailwindCSS utility classes:** The settings page `devices` and `quarantine` tabs utilize Tailwind utility classes (e.g. `bg-neutral-900 border border-neutral-800 rounded-2xl p-6`). These utility class names are not inline `style` objects, so they have been kept as-is to preserve styling exactly without rewriting the stylesheet. Only inline `style={{ ... }}` objects have been converted to CSS module classes.
2. **Candidates/Recruiters pages:** Per instruction, `candidates/page.tsx` and `recruiters/page.tsx` were untouched because they are decomposed as part of R-7/R-8.
