# Flask stub for CarbonCart backend

This is a small demo Flask server that accepts POST /api/recalculate with JSON { pincode, items }.
It uses a tiny builtin pincode->coordinates map to compute approximate distances (Haversine) and returns
an array of results with distance_km. It also integrates with Google's Gemini API to calculate more accurate
carbon footprints based on item details and transportation distance.

## Features

- Calculates distance between user's pincode and item source pincode
- Integrates with Google's Gemini API for enhanced carbon footprint calculations
- Extracts item details like source location, country of origin, and EAN codes
- Provides fallback calculations when Gemini API is not available

## How to run

1. Create a virtualenv (recommended) and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Set your GEMINI_API_KEY in the environment or in the repo `.env` (the server reads from OS env):

On Windows (cmd.exe):

```cmd
set GEMINI_API_KEY=your_actual_gemini_api_key_here
python app.py
```

On PowerShell:

```powershell
$env:GEMINI_API_KEY = 'your_actual_gemini_api_key_here'
python app.py
```

3. Start the server and point the extension background `BACKEND_URL` to `http://localhost:5000/api/recalculate`.

## Environment Variables

Create a `.env` file in the server directory with your API keys:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

## Notes

- This is a stub. Replace the PINCODE_MAP with a full geocoding solution or call a geocoding API.
- Use your GEMINI_API_KEY server-side to call Gemini and compute carbon footprint adjustments securely.
- The server will fall back to simple calculations if the Gemini API key is not provided.
- Make sure to keep your API keys secure and never commit them to version control.