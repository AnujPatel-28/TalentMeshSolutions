# audit_log table-name fix + cron header update

Date: 2026-07-19
Agent: Codex

## Scope

Fixed only the two requested blockers:

1. Edge-function audit writes/readers that still referenced `audit_logs` plural.
2. Live InsForge nightly cleanup schedule missing the cron secret Authorization header.

## Files changed

- `insforge/functions/admin-settings/index.ts`
  - Replaced four `audit_logs` write targets with `audit_log`.
  - Updated the stale `public.audit_logs` comment to `public.audit_log`.
- `insforge/functions/admin-jobs/index.ts`
  - Replaced the approve/reject audit write targets with `audit_log`.
- `insforge/functions/admin-audit/index.ts`
  - Replaced the audit insert target with `audit_log`.

## Live schedule changed

Schedule ID: `8efc76ff-eeff-4f2f-ab4c-a63e9ce32fba`
Name: `cleanup_idempotency_keys`
URL: `https://sytk3jgv.functions.insforge.app/cleanup-idempotency-keys`
Cron: `0 0 * * *`
Method: `POST`

Before update, `npx @insforge/cli schedules get 8efc76ff-eeff-4f2f-ab4c-a63e9ce32fba` showed:

```text
Headers:  {}
```

Applied:

```powershell
npx @insforge/cli schedules update 8efc76ff-eeff-4f2f-ab4c-a63e9ce32fba --headers '{""Authorization"":""Bearer ${{secrets.CRON_SECRET}}""}'
```

Output:

```text
✓ Schedule updated successfully
```

After update, `npx @insforge/cli schedules get 8efc76ff-eeff-4f2f-ab4c-a63e9ce32fba` showed:

```text
Headers:  {"Authorization":"Bearer ${{secrets.CRON_SECRET}}"}
```

## Verification run

```powershell
rg -n -F "from('audit_logs')" admin-settings/index.ts admin-jobs/index.ts admin-audit/index.ts
```

Result: exit code 1, no matches.

```powershell
rg -n -F "public.audit_logs" admin-settings/index.ts admin-jobs/index.ts admin-audit/index.ts
```

Result: exit code 1, no matches.

```powershell
rg -n -F "from('audit_log')" admin-settings/index.ts admin-jobs/index.ts admin-audit/index.ts
```

Result: seven expected matches across the three targeted files.

```powershell
npx tsc -p insforge/tsconfig.json
```

Result: exit code 0, zero output.

## Notes / residual risk

- I did not deploy edge functions. The code fix is local until the function deploy step runs.
- I did update the live InsForge schedule header successfully.
- The next scheduled run is `20/7/2026, 5:30:00 am` local display from the CLI; schedule logs after that run should confirm the nightly 401 is gone.
- `git diff` did not report a tracked scoped diff for these files because this machine's Git root/layout appears to be `C:\Users\Anuj\Desktop` with `tm_web/Talentmesh-demo` not showing as tracked paths. I verified the actual file contents with direct `rg` checks instead.