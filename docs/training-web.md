# Production Training module

The `/training` route uses backend release `v1.11.7` (`ac15225`) and follows the mobile Training flow (`65ab15f`). Existing web components, colors, cards, dialogs, and responsive layout are reused.

## API and access

- Materials: `GET/POST /training/materials`, `GET/PUT/DELETE /training/materials/:id`.
- Content: `GET /training/materials/:id/content`; opening uses the returned external/presigned HTTP(S) URL. Storage keys are never used as a download URL.
- Read acknowledgement: `POST /training/materials/:id/read`. Opening successfully resolved content also records reading. A content error does not mark the material as read; a failed read request can be retried separately.
- Schedules: `GET/POST /training/schedules`, `GET/PUT/DELETE /training/schedules/:id`.
- Upload: `POST /documents/upload`, multipart `file`; returned document ID is linked to the material. An uploaded document is reused if saving the metadata fails and the user retries.

Updates use **PUT**, as implemented in the release's router and mobile service. Creation uses `publish`; updates send a complete editable object with `status`. Switching to external content explicitly sends `document_id: null`. Clearing a schedule end explicitly sends `ends_at: null`.

Only `platform_admin`, `org_admin`, and `admin_ho` receive management controls. Training reads do not require an invented `training:read` permission: the backend exposes them to authenticated accounts and enforces organization, published status, and group assignment. Dealer screens do not fetch the dealer directory or render management controls, status filters, or other dealer selections. Accounts without an organization receive an explanatory state without Training requests.

Every list has server-side search, filters, 20-item pagination using `meta.total`, loading/error/empty states, refresh, and retry. Admins can filter archived items and edit them back to draft or published. Schedules additionally support cancellation. The assignee picker walks every `/groups` page at the backend's 100-item maximum and includes only active groups in the signed-in organization.

Schedule inputs and display use **Asia/Jakarta / WIB (UTC+7)** regardless of the browser timezone. Optional end, trainer, location, and meeting URL are preserved on edit. Dialogs include keyboard focus trapping and form labels. Training publication notifications map the mobile route to `/training`.

## Verification (13 October 2026)

- `npm test`: 24 passing tests covering service contracts, dealer restrictions, content/read failures, upload retry, group pagination, organization changes, list pagination/search, publish, cancellation, and WIB dates.
- `npm run build`: TypeScript and production Vite build pass.
- ESLint for all changed TypeScript and test files: passes. Full-repository lint has 20 existing errors and one warning in unrelated builder/CPS/template/trash/document/inspection/profile files.
- Browser smoke tests at desktop, 768px tablet, and 390px mobile: forms, scrolling, dealer picker beyond 100 items, dealer menu visibility, absence of CRUD, and persisted read state after refresh.
- Production read-only API smoke using `admin.wahana`: materials, schedules, category/status/search, group list (155 total), and protected content endpoint succeed; returned rows match the account organization. Test login sessions were logged out afterward.
- Production login using the available credentials for `aion.bsd` returns HTTP 401. Dealer UI is covered by automated and local-browser fixtures; live dealer authentication needs valid credentials. No Training records/documents were created, modified, archived, or marked read in production during verification.
- Existing dependency audit reports seven high-severity findings in the prior production dependency tree (Axios/form-data/PostCSS/nanoid/React Router/source-map-js). Dependency remediation is separate from this module; no claim that the whole repository audit is clean.

## Reproduce local browser QA

The fixture is local-only, has synthetic users/content, persists nothing to disk, and never calls production. Start two PowerShell terminals:

```powershell
node tests/smoke-api.mjs
```

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:4174'
npm run dev -- --port 4173 --strictPort
```

Open `http://localhost:4173/training`. Use username `admin-demo` or `dealer-demo` and any fixture password. Management saves are deliberately rejected by the browser fixture; automated tests cover mutations. Stop both processes when finished. The environment override belongs only to that development terminal.

## Deployment

The repository's default branch is `codex/ui-enhance`; `master` is the existing production branch. Git pushes trigger the existing Vercel integration. There is no repository GitHub Actions release workflow or version/tag convention for this web app.
