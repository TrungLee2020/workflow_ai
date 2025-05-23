from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# Hard code API key ở đây
OPENWEATHER_API_KEY = ""  

@app.route('/weather', methods=['GET'])
def get_weather():
    # city_name = request.args.get('city')
    city_name = 'Ha Noi'  # Thay thế bằng tên thành phố bạn muốn lấy thời tiết
    
    if not city_name:
        return jsonify({
            'error': 'Missing city parameter'
        }), 400
    
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q=HaNoi&units=metric&lang=vi&appid=3b1e8652b8f77af6a51ffeef4fcc52f0"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            weather_info = {
                'city': data['name'],
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'description': data['weather'][0]['description'],
                'feels_like': data['main']['feels_like'],
                'wind_speed': data['wind']['speed']
            }
            return jsonify(weather_info)
        else:
            return jsonify({
                'error': 'Unable to fetch weather data',
                'status_code': response.status_code
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5005)