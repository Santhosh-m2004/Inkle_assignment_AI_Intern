/**
 * Geocoding Agent - Uses Nominatim to get coordinates for places
 */

class GeocodingAgent {
    /**
     * Uses Nominatim to get coordinates for a place.
     * @param {string} placeName The name of the place.
     * @returns {Promise<{lat: string, lon: string, name: string}|null>} Coordinates or null on failure.
     */
    async geocodePlace(placeName) {
        // Clean the place name before geocoding
        const cleanPlaceName = Helpers.cleanPlaceName(placeName);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanPlaceName)}&limit=5`;
        
        console.log(`Geocoding place: "${cleanPlaceName}"`);
        
        try {
            const response = await Helpers.fetchWithBackoff(url);
            const data = await response.json();
            
            console.log(`Geocoding results for "${cleanPlaceName}":`, data);
            
            if (data && data.length > 0) {
                // Find the best match by checking importance and place_rank
                let bestMatch = data[0];
                
                for (const place of data) {
                    const placeRank = parseInt(place.place_rank, 10);
                    const importance = parseFloat(place.importance) || 0;
                    
                    // Prefer higher importance and appropriate place_rank
                    if (importance > (parseFloat(bestMatch.importance) || 0) && 
                        placeRank > 0 && placeRank <= 20) {
                        bestMatch = place;
                    }
                }
                
                const placeRank = parseInt(bestMatch.place_rank, 10);
                
                // Accept places with reasonable rank (cities, towns, etc.)
                if (placeRank > 0 && placeRank <= 20) { 
                    console.log(`Selected place: ${bestMatch.display_name} (rank: ${placeRank})`);
                    return { 
                        lat: bestMatch.lat, 
                        lon: bestMatch.lon,
                        name: bestMatch.display_name.split(',')[0], // Get the primary name
                        fullName: bestMatch.display_name
                    };
                } else {
                    console.log(`Place rank ${placeRank} too low for: ${bestMatch.display_name}`);
                }
            }
            
            console.log(`No valid geocoding results for: "${cleanPlaceName}"`);
            return null;
            
        } catch (error) {
            console.error("Geocoding failed:", error);
            return null;
        }
    }

    /**
     * Validate if a place exists and get its coordinates
     * @param {string} placeName 
     * @returns {Promise<{isValid: boolean, coordinates: object|null, error: string|null}>}
     */
    async validatePlace(placeName) {
        const coordinates = await this.geocodePlace(placeName);
        if (coordinates) {
            return {
                isValid: true,
                coordinates: coordinates,
                formattedName: coordinates.name
            };
        } else {
            return {
                isValid: false,
                coordinates: null,
                error: `Place "${placeName}" not found or not significant enough.`
            };
        }
    }
}