import os
import requests
from math import radians, sin, cos, asin, sqrt
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

# Minimal pincode -> (lat, lon) map for demonstration. Extend as needed or use a proper geocoding service.
PINCODE_MAP = {
    '560016': (13.0366, 77.6402),  # Bangalore KR Puram (approx)
    '560001': (12.9716, 77.5946),  # Bangalore central
    '560079': (12.9020, 77.5736),  # Bangalore HSR Layout (approx)
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


def calculate_carbon_footprint_with_gemini(item, distance_km):
    """Calculate carbon footprint using Gemini API based on item details and distance"""
    if not GEMINI_API_KEY:
        # Return a default calculation if no API key
        # Base carbon footprint + transportation based on distance (0.1 kg CO2 per km)
        base_footprint = item.get('estimatedCarbon', 1.0)
        transport_footprint = (distance_km or 0) * 0.1
        return base_footprint + transport_footprint
    
    try:
        # Prepare prompt for Gemini with more specific instructions for distance-based calculation
        prompt = f"""
        You are a carbon footprint calculation expert. Calculate the total carbon footprint in kg CO2 for the following grocery item, with special emphasis on transportation emissions based on distance.

        Item Details:
        - Name: {item.get('name', 'Unknown')}
        - Quantity: {item.get('quantity', 'Unknown')}
        - Price: ₹{item.get('price', 'Unknown')}
        - Source Location: {item.get('sourceLocation', 'Unknown')}
        - Source Pincode: {item.get('sourcePincode', 'Unknown')}
        - Country of Origin: {item.get('countryOfOrigin', 'Unknown')}
        - EAN Code: {item.get('eanCode', 'Unknown')}
        - Distance Traveled: {distance_km or 'Unknown'} km

        Calculation Instructions:
        1. First, estimate the base carbon footprint for production, packaging, and storage of this item (without transportation)
        2. Then, calculate transportation emissions using the distance traveled:
           - For road transport: 0.12 kg CO2 per km per kg of goods
           - For air freight (if imported): 0.6 kg CO2 per km per kg of goods
           - For sea freight (if imported): 0.02 kg CO2 per km per kg of goods
        3. Adjust for item type:
           - Fresh produce: Lower base footprint
           - Processed foods: Higher base footprint
           - Packaged goods: Consider packaging material emissions
        4. Consider refrigeration needs if applicable (add 10-30% for cold chain)
        
        Important: 
        - The distance ({distance_km or 0} km) is the key factor for transportation emissions
        - Weight the transportation component heavily in your calculation
        - Provide only a single number in kg CO2 as the response
        - Be as accurate as possible based on the provided information

        Example Calculation Format:
        Base production footprint: X kg CO2
        Transportation ({distance_km or 0} km): Y kg CO2
        Total: Z kg CO2
        
        Final Answer (provide only this number): Z
        """
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        data = {
            'contents': [{
                'parts': [{
                    'text': prompt
                }]
            }]
        }
        
        response = requests.post(
            f'{GEMINI_API_URL}?key={GEMINI_API_KEY}',
            headers=headers,
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            try:
                # Extract the numeric value from the response
                text_response = result['candidates'][0]['content']['parts'][0]['text']
                # Try to find a number in the response
                import re
                numbers = re.findall(r'\d+\.?\d*', text_response)
                if numbers:
                    return float(numbers[0])
            except (KeyError, ValueError, IndexError):
                pass
        
        # Fallback to default calculation if Gemini fails
        base_footprint = item.get('estimatedCarbon', 1.0)
        transport_footprint = (distance_km or 0) * 0.1
        return base_footprint + transport_footprint
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback to default calculation if Gemini fails
        base_footprint = item.get('estimatedCarbon', 1.0)
        transport_footprint = (distance_km or 0) * 0.1
        return base_footprint + transport_footprint


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
        
        # Calculate carbon footprint using Gemini API
        carbon_footprint = calculate_carbon_footprint_with_gemini(it, distance_km)
        
        results.append({
            'name': it.get('name'),
            'original': it,
            'distance_km': distance_km,
            'carbon_footprint': carbon_footprint,
            'sourcePincode': seller_pin,
            'userPincode': pincode
        })

    return jsonify({'success': True, 'userPincode': pincode, 'results': results, 'gemini_key_present': bool(GEMINI_API_KEY)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)