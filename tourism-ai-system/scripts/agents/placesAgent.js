/**
 * Places Agent - Fetches tourist attractions from Overpass API
 */

class PlacesAgent {
    /**
     * Suggests up to 5 tourist attractions using Overpass API.
     * @param {string} lat Latitude.
     * @param {string} lon Longitude.
     * @returns {Promise<string[]>} Array of place names.
     */
    async fetchPlaces(lat, lon) {
        // Overpass Query Language (QL) to find tourist attractions within a 5km radius
        const overpassQuery = `
            [out:json];
            (
                node["tourism"~"attraction|museum|theme_park|zoo|viewpoint|historical"](around:5000,${lat},${lon});
                way["tourism"~"attraction|museum|theme_park|zoo|viewpoint|historical"](around:5000,${lat},${lon});
            );
            out 5;
        `;

        const url = "https://overpass-api.de/api/interpreter";
        
        try {
            const response = await Helpers.fetchWithBackoff(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(overpassQuery)}`
            });
            const data = await response.json();

            const places = [];
            if (data.elements) {
                // Filter for elements that have a 'name' tag
                data.elements.forEach(element => {
                    if (element.tags && element.tags.name) {
                        places.push(element.tags.name);
                    }
                });
            }
            
            // Return only the top 5 unique places
            return Array.from(new Set(places)).slice(0, 5);
        } catch (error) {
            console.error("Places Agent failed:", error);
            return []; // Return empty array on failure
        }
    }

    /**
     * Generate places summary for display
     * @param {string[]} placesResult 
     * @param {string} placeName 
     * @returns {string} Formatted HTML
     */
    generatePlacesSummary(placesResult, placeName) {
        if (placesResult.length > 0) {
            const listItems = placesResult.map(place => 
                `<li class="list-none py-1 pl-4 text-gray-700 relative hover:text-primary-indigo transition duration-150">
                    <i data-lucide="map-pin" class="w-4 h-4 text-primary-indigo absolute left-0 top-1/2 transform -translate-y-1/2"></i>
                    ${place}
                </li>`
            ).join('');
            return `
                <div class="mt-6 pt-4 border-t border-gray-300">
                    <p class="text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
                        <i data-lucide="camera" class="w-5 h-5 text-green-600"></i>
                        <span>Tourist Attractions (Top 5):</span>
                    </p>
                    <ul class="styled-list space-y-1">${listItems}</ul>
                </div>
            `;
        } else {
            return `<p class="mt-4 text-gray-500 italic">The Places Agent could not find any specific attractions nearby (within 5km).</p>`;
        }
    }
}