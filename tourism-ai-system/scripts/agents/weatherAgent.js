class WeatherAgent {
    async fetchWeather(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_max&timezone=auto&forecast_days=5`;
        
        try {
            const response = await Helpers.fetchWithBackoff(url);
            const data = await response.json();

            if (data.current && data.daily) {
                const current = data.current;
                const daily = data.daily;
                
                let weatherHTML = `
                    <div class="weather-card fade-in">
                        <div class="flex items-center space-x-2 mb-4">
                            <i data-lucide="sun" class="w-5 h-5 text-yellow-500"></i>
                            <h3 class="text-lg font-semibold text-gray-800">Current Weather</h3>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="metric-card">
                                <div class="metric-value temperature-metric">${Math.round(current.temperature_2m)}°C</div>
                                <div class="metric-label">Temperature</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value rain-metric">${current.precipitation_probability}%</div>
                                <div class="metric-label">Rain Chance</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value humidity-metric">${current.relative_humidity_2m}%</div>
                                <div class="metric-label">Humidity</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value condition-metric">${this.getWeatherCondition(current.weather_code)}</div>
                                <div class="metric-label">Condition</div>
                            </div>
                        </div>
                    </div>
                `;

                if (daily.time && daily.time.length > 0) {
                    weatherHTML += `
                        <div class="weather-card fade-in mt-4">
                            <div class="flex items-center space-x-2 mb-4">
                                <i data-lucide="calendar" class="w-5 h-5 text-blue-500"></i>
                                <h3 class="text-lg font-semibold text-gray-800">5-Day Forecast</h3>
                            </div>
                            <div class="forecast-grid">
                    `;

                    for (let i = 0; i < Math.min(5, daily.time.length); i++) {
                        const date = new Date(daily.time[i]);
                        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                        const weatherIcon = this.getWeatherIcon(daily.weather_code[i]);
                        
                        weatherHTML += `
                            <div class="forecast-day">
                                <div class="font-semibold text-gray-700 mb-2">${dayName}</div>
                                <div class="text-xl my-2">${weatherIcon}</div>
                                <div class="text-red-500 font-bold text-sm">${Math.round(daily.temperature_2m_max[i])}°</div>
                                <div class="text-blue-500 text-sm mb-1">${Math.round(daily.temperature_2m_min[i])}°</div>
                                <div class="text-gray-600 text-xs">${daily.precipitation_probability_max[i]}% rain</div>
                                <div class="text-green-600 text-xs">${daily.relative_humidity_2m_max[i]}% humid</div>
                            </div>
                        `;
                    }

                    weatherHTML += `</div></div>`;
                }

                return weatherHTML;
            }
            return "<div class='bg-red-50 border border-red-200 rounded-lg p-4'><p class='text-red-700'>Weather data unavailable</p></div>";
        } catch (error) {
            console.error("Weather Agent failed:", error);
            return "<div class='bg-red-50 border border-red-200 rounded-lg p-4'><p class='text-red-700'>Weather service temporarily unavailable</p></div>";
        }
    }

    getWeatherCondition(weatherCode) {
        const conditions = {
            0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
            61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
            71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 85: 'Snow Showers', 86: 'Heavy Snow Showers',
            95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Severe Thunderstorm'
        };
        return conditions[weatherCode] || 'Unknown';
    }

    getWeatherIcon(weatherCode) {
        const icons = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
            80: '🌦️', 81: '🌦️', 82: '🌦️', 71: '❄️', 73: '❄️', 75: '❄️',
            85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        return icons[weatherCode] || '🌈';
    }
}