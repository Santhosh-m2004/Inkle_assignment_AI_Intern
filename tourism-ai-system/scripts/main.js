/**
 * Main Application - Parent Agent Orchestration
 */

class TourismAISystem {
    constructor() {
        this.geocodingAgent = new GeocodingAgent();
        this.weatherAgent = new WeatherAgent();
        this.placesAgent = new PlacesAgent();
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Initialize Lucide Icons
        lucide.createIcons();

        // Add event listeners
        document.getElementById('planButton').addEventListener('click', () => this.orchestrateAgents());
        
        document.getElementById('placeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                this.orchestrateAgents();
            }
        });

        // Add some example queries for testing
        this.addExampleQueries();
    }

    addExampleQueries() {
        const inputElement = document.getElementById('placeInput');
        const examples = [
            "I'm going to go to Bangalore, let's plan my trip",
            "What's the weather in Paris?",
            "Show me places to visit in Tokyo",
            "London weather and attractions"
        ];

        // You can add a dropdown or clickable examples if needed
        console.log('Example queries:', examples);
    }

    async orchestrateAgents() {
        const inputElement = document.getElementById('placeInput');
        const outputElement = document.getElementById('agentOutput');
        const loadingElement = document.getElementById('loadingIndicator');
        const userInput = inputElement.value.trim();

        if (!userInput) {
            outputElement.innerHTML = "<p class='text-red-500 font-medium'>Please enter a place you want to visit.</p>";
            return;
        }

        // 1. Setup UI for loading
        outputElement.innerHTML = '';
        loadingElement.classList.remove('hidden');
        
        let finalOutput = '';

        try {
            // 2. Extract place name and intent
            const placeName = Helpers.extractPlaceFromInput(userInput);
            const intent = Helpers.detectIntent(userInput);

            console.log(`Processing: "${userInput}"`);
            console.log(`Extracted place: "${placeName}"`);
            console.log(`Detected intent: ${intent}`);

            if (!placeName || placeName.length < 2) {
                throw new Error('Please enter a valid place name.');
            }

            // 3. Geocoding (Parent Agent's first task)
            const validation = await this.geocodingAgent.validatePlace(placeName);
            
            if (!validation.isValid) {
                // Try with the original input as fallback
                console.log(`Trying fallback geocoding with original input: "${userInput}"`);
                const fallbackValidation = await this.geocodingAgent.validatePlace(userInput);
                
                if (!fallbackValidation.isValid) {
                    finalOutput = `<p class="text-red-700">I'm sorry, the Tourism AI Agent doesn't know if a place called <span class="font-semibold text-gray-900">${placeName}</span> exists. Please try a different location.</p>`;
                } else {
                    // Use the fallback result
                    const { lat, lon, name } = fallbackValidation.coordinates;
                    const displayName = fallbackValidation.formattedName;
                    finalOutput = await this.executeAgents(intent, lat, lon, displayName);
                }
            } else {
                const { lat, lon, name } = validation.coordinates;
                const displayName = validation.formattedName;
                finalOutput = await this.executeAgents(intent, lat, lon, displayName);
            }

        } catch (error) {
            console.error("Parent Agent orchestration failed:", error);
            finalOutput = `<p class='text-red-500 font-medium'>${error.message || 'A critical error occurred while planning your trip. The service might be temporarily unavailable.'}</p>`;
        } finally {
            // 6. Display results and hide loading
            loadingElement.classList.add('hidden');
            outputElement.innerHTML = finalOutput;
            // Re-initialize Lucide icons for dynamically added content
            lucide.createIcons();
        }
    }

    async executeAgents(intent, lat, lon, displayName) {
        let weatherResult = '';
        let placesResult = '';

        console.log(`Executing agents for: ${displayName} at ${lat}, ${lon}`);

        // Execute agents based on intent
        if (intent === 'weather' || intent === 'both') {
            try {
                weatherResult = await this.weatherAgent.fetchWeather(lat, lon);
                console.log('Weather agent completed');
            } catch (error) {
                console.error('Weather agent failed:', error);
                weatherResult = "weather information is currently unavailable.";
            }
        }

        if (intent === 'places' || intent === 'both') {
            try {
                const places = await this.placesAgent.fetchPlaces(lat, lon);
                placesResult = this.placesAgent.generatePlacesSummary(places, displayName);
                console.log('Places agent completed, found:', places.length, 'places');
            } catch (error) {
                console.error('Places agent failed:', error);
                placesResult = `<p class="mt-4 text-gray-500 italic">Unable to fetch tourist attractions at this time.</p>`;
            }
        }

        // Compile and format final response
        let finalOutput = '';

        if (weatherResult) {
            finalOutput += this.weatherAgent.generateWeatherSummary(weatherResult, displayName);
        }

        if (placesResult) {
            finalOutput += placesResult;
        }

        // Handle case where no agents were triggered (shouldn't happen with default 'both')
        if (!weatherResult && !placesResult) {
            // Default to showing both
            console.log('Defaulting to both agents');
            const [defaultWeather, defaultPlaces] = await Promise.all([
                this.weatherAgent.fetchWeather(lat, lon),
                this.placesAgent.fetchPlaces(lat, lon)
            ]);
            
            finalOutput = this.weatherAgent.generateWeatherSummary(defaultWeather, displayName);
            finalOutput += this.placesAgent.generatePlacesSummary(defaultPlaces, displayName);
        }

        return finalOutput;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TourismAISystem();
});