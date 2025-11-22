class PlacesAgent {
    async fetchPlaces(lat, lon) {
        const overpassQuery = `
            [out:json];
            (
                node["tourism"~"attraction|museum|theme_park|zoo|viewpoint|historical|monument"](around:10000,${lat},${lon});
                way["tourism"~"attraction|museum|theme_park|zoo|viewpoint|historical|monument"](around:10000,${lat},${lon});
            );
            out 10;
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
                data.elements.forEach(element => {
                    if (element.tags && element.tags.name) {
                        const placeLat = element.lat || element.center?.lat;
                        const placeLon = element.lon || element.center?.lon;
                        
                        if (placeLat && placeLon) {
                            places.push({
                                name: element.tags.name,
                                type: element.tags.tourism || element.tags.historic || 'attraction',
                                lat: placeLat,
                                lon: placeLon
                            });
                        }
                    }
                });
            }
            
            return Array.from(new Set(places.map(p => p.name)))
                .map(name => places.find(p => p.name === name))
                .slice(0, 5);
        } catch (error) {
            console.error("Places Agent failed:", error);
            return [];
        }
    }

    generatePlacesSummary(placesResult, placeName) {
        if (placesResult.length > 0) {
            const listItems = placesResult.map(place => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}+${encodeURIComponent(placeName)}`;
                return `
                    <div class="place-card fade-in">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <i data-lucide="map-pin" class="w-5 h-5 text-primary-indigo flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-gray-800">${place.name}</div>
                                    <div class="text-sm text-green-600 capitalize">${place.type}</div>
                                </div>
                            </div>
                            <a href="${mapsUrl}" target="_blank" 
                               class="map-button">
                                <i data-lucide="navigation" class="w-4 h-4"></i>
                                <span>View Map</span>
                            </a>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="report-section">
                    <div class="flex items-center space-x-2 mb-4">
                        <i data-lucide="landmark" class="w-5 h-5 text-green-600"></i>
                        <h3 class="text-lg font-semibold text-gray-800">Top Tourist Attractions</h3>
                    </div>
                    <div class="space-y-3">${listItems}</div>
                    <div class="mt-3 text-xs text-gray-500 flex items-center space-x-1">
                        <i data-lucide="info" class="w-3 h-3"></i>
                        <span>Click "View Map" for directions and detailed information</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="report-section">
                    <div class="flex items-center space-x-2 mb-3">
                        <i data-lucide="landmark" class="w-5 h-5 text-green-600"></i>
                        <h3 class="text-lg font-semibold text-gray-800">Tourist Attractions</h3>
                    </div>
                    <p class="text-gray-500 italic">No specific attractions found within 10km radius. Try exploring the city center or popular areas.</p>
                </div>
            `;
        }
    }
}