/**
 * Utility functions for the Tourism AI System
 */

class Helpers {
    /**
     * Helper function to perform fetch with exponential backoff.
     * @param {string} url The URL to fetch.
     * @param {object} options Fetch options.
     * @param {number} retries Maximum number of retries.
     * @param {number} delay Initial delay in ms.
     * @returns {Promise<Response>}
     */
    static async fetchWithBackoff(url, options = {}, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    // Throw error to trigger retry for 5xx errors or API limits
                    if (response.status >= 500) throw new Error('Server error, retrying...');
                }
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                // Exponential backoff delay
                await new Promise(resolve => setTimeout(resolve, delay * (2 ** i)));
            }
        }
    }

    /**
     * Extract place name from natural language input
     * @param {string} input User input
     * @returns {string} Extracted place name
     */
    static extractPlaceFromInput(input) {
        // Clean the input first
        const cleanInput = input.trim();
        
        // Common patterns for travel queries
        const patterns = [
            /(?:i'm going to|i am going to|going to|visit|travel to|trip to|go to)\s+([^,.!?]+)/i,
            /(?:in|at|to)\s+([^,.!?]+)/i,
            /^([^,.!?]+)$/i
        ];
        
        for (const pattern of patterns) {
            const match = cleanInput.match(pattern);
            if (match && match[1]) {
                let place = match[1].trim();
                
                // Remove common prefixes and articles
                place = place.replace(/^(the|a|an)\s+/i, '');
                
                // Remove any trailing words like "let's plan my trip"
                place = place.replace(/\s+(let's|lets|plan|my|trip|what|where|can).*$/i, '');
                
                // Trim again and return if we have a valid place name
                const finalPlace = place.trim();
                if (finalPlace.length > 0) {
                    console.log(`Extracted place: "${finalPlace}" from input: "${cleanInput}"`);
                    return finalPlace;
                }
            }
        }
        
        // Fallback: return the entire input if no pattern matches
        console.log(`No pattern matched, using full input: "${cleanInput}"`);
        return cleanInput;
    }

    /**
     * Detect user intent from input
     * @param {string} input User input
     * @returns {string} Intent type
     */
    static detectIntent(input) {
        const lowerInput = input.toLowerCase();
        
        const intents = {
            weather: /\b(weather|temperature|rain|forecast|hot|cold)\b/i,
            places: /\b(places?|visit|see|attractions?|tourist|things to do)\b/i,
            both: /\b(and|&|\+)\b/i
        };
        
        if (intents.both.test(lowerInput) || 
            (intents.weather.test(lowerInput) && intents.places.test(lowerInput))) {
            return 'both';
        } else if (intents.weather.test(lowerInput)) {
            return 'weather';
        } else if (intents.places.test(lowerInput)) {
            return 'places';
        } else {
            return 'both';
        }
    }

    /**
     * Improved place name cleaning for better geocoding
     * @param {string} placeName 
     * @returns {string}
     */
    static cleanPlaceName(placeName) {
        return placeName
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^go to\s+/i, '')
            .replace(/^visit\s+/i, '')
            .replace(/^travel to\s+/i, '')
            .replace(/\s+let's.*$/i, '')
            .replace(/\s+please.*$/i, '')
            .replace(/\s+what.*$/i, '')
            .replace(/\s+where.*$/i, '');
    }
}