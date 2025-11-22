class TourismAISystem {
    constructor() {
        this.geocodingAgent = new GeocodingAgent();
        this.weatherAgent = new WeatherAgent();
        this.placesAgent = new PlacesAgent();
        this.isPrinting = false;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        lucide.createIcons();

        document.getElementById('planButton').addEventListener('click', () => this.orchestrateAgents());
        
        document.getElementById('placeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                this.orchestrateAgents();
            }
        });

        document.getElementById('printButton').addEventListener('click', () => this.printReport());
    }

    async orchestrateAgents() {
        const inputElement = document.getElementById('placeInput');
        const outputElement = document.getElementById('agentOutput');
        const loadingElement = document.getElementById('loadingIndicator');
        const printButton = document.getElementById('printButton');
        const userInput = inputElement.value.trim();

        if (!userInput) {
            outputElement.innerHTML = "<div class='bg-red-50 border border-red-200 rounded-lg p-4'><p class='text-red-700 font-medium'>Please enter a place you want to visit.</p></div>";
            return;
        }

        outputElement.innerHTML = '';
        loadingElement.classList.remove('hidden');
        printButton.classList.add('hidden');
        
        let finalOutput = '';

        try {
            const placeName = Helpers.extractPlaceFromInput(userInput);
            const intent = Helpers.detectIntent(userInput);

            if (!placeName || placeName.length < 2) {
                throw new Error('Please enter a valid place name.');
            }

            const validation = await this.geocodingAgent.validatePlace(placeName);
            
            if (!validation.isValid) {
                const fallbackValidation = await this.geocodingAgent.validatePlace(userInput);
                
                if (!fallbackValidation.isValid) {
                    finalOutput = `<div class='bg-red-50 border border-red-200 rounded-lg p-4'><p class="text-red-700">I'm sorry, the Tourism AI Agent doesn't know if a place called <span class="font-semibold text-gray-900">${placeName}</span> exists. Please try a different location.</p></div>`;
                } else {
                    const { lat, lon, name } = fallbackValidation.coordinates;
                    const displayName = fallbackValidation.formattedName;
                    finalOutput = await this.executeAgents(intent, lat, lon, displayName);
                    printButton.classList.remove('hidden');
                }
            } else {
                const { lat, lon, name } = validation.coordinates;
                const displayName = validation.formattedName;
                finalOutput = await this.executeAgents(intent, lat, lon, displayName);
                printButton.classList.remove('hidden');
            }

        } catch (error) {
            console.error("Parent Agent orchestration failed:", error);
            finalOutput = `<div class='bg-red-50 border border-red-200 rounded-lg p-4'><p class='text-red-700 font-medium'>${error.message || 'A critical error occurred while planning your trip. The service might be temporarily unavailable.'}</p></div>`;
        } finally {
            loadingElement.classList.add('hidden');
            outputElement.innerHTML = finalOutput;
            lucide.createIcons();
        }
    }

    async executeAgents(intent, lat, lon, displayName) {
        let weatherResult = '';
        let placesResult = '';

        const headerHTML = `
            <div class="report-header slide-in">
                <div class="flex items-center space-x-3">
                    <i data-lucide="map-pin" class="w-6 h-6"></i>
                    <div>
                        <h2 class="text-xl font-bold">${displayName}</h2>
                        <p class="text-blue-100">Tourism Intelligence Report</p>
                    </div>
                </div>
            </div>
        `;

        if (intent === 'weather' || intent === 'both') {
            try {
                weatherResult = await this.weatherAgent.fetchWeather(lat, lon);
            } catch (error) {
                console.error('Weather agent failed:', error);
                weatherResult = `
                    <div class="weather-card">
                        <div class="flex items-center space-x-2 text-red-700">
                            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                            <span>Weather information currently unavailable</span>
                        </div>
                    </div>
                `;
            }
        }

        if (intent === 'places' || intent === 'both') {
            try {
                const places = await this.placesAgent.fetchPlaces(lat, lon);
                placesResult = this.placesAgent.generatePlacesSummary(places, displayName);
            } catch (error) {
                console.error('Places agent failed:', error);
                placesResult = `
                    <div class="report-section">
                        <div class="flex items-center space-x-2 mb-3">
                            <i data-lucide="landmark" class="w-5 h-5 text-green-600"></i>
                            <h3 class="text-lg font-semibold text-gray-800">Tourist Attractions</h3>
                        </div>
                        <p class="text-red-500">Unable to load attractions at this time.</p>
                    </div>
                `;
            }
        }

        let finalOutput = headerHTML;

        if (weatherResult) {
            finalOutput += weatherResult;
        }

        if (placesResult) {
            finalOutput += placesResult;
        }

        if (!weatherResult && !placesResult) {
            const [defaultWeather, defaultPlaces] = await Promise.all([
                this.weatherAgent.fetchWeather(lat, lon),
                this.placesAgent.fetchPlaces(lat, lon)
            ]);
            
            finalOutput += defaultWeather;
            finalOutput += this.placesAgent.generatePlacesSummary(defaultPlaces, displayName);
        }

        finalOutput += `
            <div class="divider"></div>
            <div class="flex items-center justify-between text-sm text-gray-500">
                <div class="flex items-center space-x-2">
                    <i data-lucide="clock" class="w-4 h-4"></i>
                    <span>Report generated: ${new Date().toLocaleString()}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <i data-lucide="shield" class="w-4 h-4"></i>
                    <span>AI Tourism System</span>
                </div>
            </div>
        `;

        return finalOutput;
    }

    printReport() {
    if (this.isPrinting) return;
    
    this.isPrinting = true;
    
    const printButton = document.getElementById('printButton');
    const originalContent = printButton.innerHTML;
    printButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Preparing...';
    printButton.disabled = true;
    
    const placeName = document.getElementById('placeInput').value.trim() || 'Tourism Report';
    
    const agentOutput = document.getElementById('agentOutput').cloneNode(true);
    
    const interactiveElements = agentOutput.querySelectorAll('.map-button, .print-btn, [onclick]');
    interactiveElements.forEach(el => el.remove());
    
    const icons = agentOutput.querySelectorAll('[data-lucide]');
    icons.forEach(icon => {
        const parent = icon.parentElement;
        if (parent && parent.textContent.includes('View Map')) {
            parent.remove();
        } else {
            icon.remove();
        }
    });
    
    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tourism Report - ${placeName}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="styles/print.css" media="print">
            <style>
                /* Inline critical print styles */
                body { 
                    font-family: 'Inter', sans-serif; 
                    padding: 0.5in; 
                    margin: 0; 
                    background: white; 
                    color: #000; 
                    font-size: 12pt; 
                    line-height: 1.4; 
                }
                .print-container { max-width: 7.5in; margin: 0 auto; }
                .no-print { display: none !important; }
            </style>
        </head>
        <body>
            <div class="print-container">
                ${agentOutput.innerHTML}
            </div>
            <script>
                // Auto-print and close
                setTimeout(() => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                }, 1000);
            </script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    const handleAfterPrint = () => {
        printWindow.close();
        printButton.innerHTML = originalContent;
        printButton.disabled = false;
        this.isPrinting = false;
        lucide.createIcons();
    };
    
    printWindow.addEventListener('afterprint', handleAfterPrint);
    
    setTimeout(() => {
        if (!printWindow.closed) {
            printWindow.close();
        }
        printButton.innerHTML = originalContent;
        printButton.disabled = false;
        this.isPrinting = false;
        lucide.createIcons();
    }, 15000);
}
}

document.addEventListener('DOMContentLoaded', () => {
    new TourismAISystem();
});