# Backend Live Sync Runbook

Where we are: the frontend and API contract already support live Earth Engine status and manual sync.  
Nearest goal: run FastAPI locally and verify `pipeline/status` and `pipeline/sync` against your Earth Engine auth.  
Main risk: confusing "auth is ready" with "the backend runtime is ready". You need both Python packages and the right project env.

## What this runbook covers

- install backend dependencies
- point the backend at the correct Earth Engine project
- start FastAPI locally
- verify health and pipeline endpoints
- wire the frontend to the local API

## 1. Backend setup

From repo root:

```powershell
cd apps\api
py -m pip install -e .
```

If `py` is unavailable but `python` exists:

```powershell
cd apps\api
python -m pip install -e .
```

## 2. Set the Earth Engine project

PowerShell:

```powershell
$env:EARTH_ENGINE_PROJECT="gen-lang-client-0372752376"
```

Optional check:

```powershell
py -c "import ee; ee.Initialize(project='gen-lang-client-0372752376'); print('gee-ok')"
```

## 3. Start the API

```powershell
cd apps\api
py -m fastapi dev app/main.py
```

Expected local base URL:

```text
http://127.0.0.1:8000
```

## 4. Smoke check the API

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Pipeline status:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/pipeline/status
```

Manual Earth Engine sync:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/pipeline/sync `
  -ContentType "application/json" `
  -Body '{"source":"gee"}'
```

What success looks like:

- `provider_label = Google Earth Engine`
- `state = ready` or at least `degraded`
- `project_id = gen-lang-client-0372752376`
- `latest_observation_at` is populated on success

If `state = error`, the most likely causes are:

- wrong or missing Earth Engine auth in the current shell
- missing Python dependency install
- wrong `EARTH_ENGINE_PROJECT`

## 5. Wire the frontend to the local API

From repo root in a separate shell:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm run dev --workspace=@duo/web
```

## 6. What to show in the demo

Recommended live proof sequence:

1. Open the app with API connected
2. Show backend badge + pipeline cards
3. Click `Run GEE sync`
4. Wait for `Google Earth Engine` status to settle
5. Point to `latest observation` and project-backed ingest proof
6. Continue into `anomaly -> incident -> task -> MRV report`

This keeps the product honest:

- live ingest proof is visible
- the workflow remains stable
- we do not pretend satellites already drive exact asset-level incident creation

## Current API list

- `GET /health`
- `GET /api/v1/dashboard`
- `GET /api/v1/pipeline/status`
- `POST /api/v1/pipeline/sync`
- `GET /api/v1/anomalies`
- `POST /api/v1/anomalies/{anomaly_id}/promote`
- `GET /api/v1/incidents/{incident_id}`
- `POST /api/v1/incidents/{incident_id}/tasks`
- `POST /api/v1/incidents/{incident_id}/tasks/{task_id}/complete`
- `POST /api/v1/incidents/{incident_id}/report`
- `GET /api/v1/incidents/{incident_id}/report/export`
- `GET /api/v1/incidents/{incident_id}/report/view`
