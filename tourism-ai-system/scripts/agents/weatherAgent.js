/**
 * Weather Agent - Fetches current weather data from Open-Meteo API
 */

class WeatherAgent {
    /**
     * Checks the current temperature and chance of rain.
     * @param {string} lat Latitude.
     * @param {string} lon Longitude.
     * @returns {Promise<string>} Formatted weather string.
     */
    async fetchWeather(lat, lon) {
        // Fetch current temperature and maximum precipitation probability for the day
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=precipitation_probability_max&forecast_days=1&timezone=auto`;
        
        try {
            const response = await Helpers.fetchWithBackoff(url);
            const data = await response.json();

            if (data.current && data.daily) {
                const temp = data.current.temperature_2m;
                // The daily max precipitation probability is an array, take the first (today's)
                const rainChance = data.daily.precipitation_probability_max[0]; 
                const unit = data.current_units.temperature_2m; 

                return `it's currently <span class="font-bold text-lg text-red-600">${temp}${unit}</span> with a chance of <span class="font-bold text-lg text-blue-600">${rainChance}%</span> to rain.`;
            }
            return "the weather details are currently unavailable.";
        } catch (error) {
            console.error("Weather Agent failed:", error);
            return "the weather agent encountered an error and could not fetch data.";
        }
    }

    /**
     * Generate weather summary for display
     * @param {string} weatherResult 
     * @param {string} placeName 
     * @returns {string} Formatted HTML
     */
    generateWeatherSummary(weatherResult, placeName) {
        const rawWeatherString = `In <span class="font-semibold text-primary-indigo">${placeName}</span> ${weatherResult.trim()}`;
        return `<p class="flex items-center space-x-2 text-lg text-gray-800"><i data-lucide="sun" class="w-5 h-5 text-yellow-500"></i><span>${rawWeatherString.charAt(0).toUpperCase() + rawWeatherString.slice(1)}</span></p>`;
    }
}