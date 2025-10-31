# Flask stub for CarbonCart backend

This is a small demo Flask server that accepts POST /api/recalculate with JSON { pincode, items }.
It uses a tiny builtin pincode->coordinates map to compute approximate distances (Haversine) and returns
an array of results with distance_km. It also checks for GEMINI_API_KEY in environment.

How to run

1. Create a virtualenv (recommended) and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Set your GEMINI_API_KEY in the environment or in the repo `.env` (the server reads from OS env):

On Windows (cmd.exe):

```cmd
set GEMINI_API_KEY=sk-...
python app.py
```

On PowerShell:

```powershell
$env:GEMINI_API_KEY = 'sk-...'
python app.py
```

3. Start the server and point the extension background `BACKEND_URL` to `http://localhost:5000/api/recalculate`.

Notes
- This is a stub. Replace the PINCODE_MAP with a full geocoding solution or call a geocoding API.
- Use your GEMINI_API_KEY server-side to call Gemini and compute carbon footprint adjustments securely.
