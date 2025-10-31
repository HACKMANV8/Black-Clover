import os
from math import radians, sin, cos, asin, sqrt
from flask import Flask, request, jsonify

app = Flask(__name__)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# Minimal pincode -> (lat, lon) map for demonstration. Extend as needed or use a proper geocoding service.
PINCODE_MAP = {
    '560016': (13.0366, 77.6402),  # Bangalore KR Puram (approx)
    '560001': (12.9716, 77.5946),  # Bangalore central
    '110001': (28.6448, 77.2167),  # New Delhi
    '400001': (18.9388, 72.8355),  # Mumbai
    '700001': (22.5726, 88.3639),  # Kolkata
    '600001': (13.0827, 80.2707),  # Chennai
}


def haversine(lat1, lon1, lat2, lon2):
    # returns kilometers between two lat/lon
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c


@app.route('/api/recalculate', methods=['POST'])
def recalculate():
    data = request.get_json() or {}
    pincode = (data.get('pincode') or '').strip()
    items = data.get('items') or []

    user_coords = PINCODE_MAP.get(pincode)

    results = []
    for it in items:
        seller_pin = it.get('sourcePincode') or it.get('sellerPincode') or None
        distance_km = None
        if seller_pin:
            seller_coords = PINCODE_MAP.get(str(seller_pin))
            if user_coords and seller_coords:
                distance_km = round(haversine(user_coords[0], user_coords[1], seller_coords[0], seller_coords[1]), 2)
        # placeholder: you can call Gemini here using GEMINI_API_KEY to recalc carbon
        results.append({
            'name': it.get('name'),
            'original': it,
            'distance_km': distance_km
        })

    return jsonify({'success': True, 'userPincode': pincode, 'results': results, 'gemini_key_present': bool(GEMINI_API_KEY)})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
