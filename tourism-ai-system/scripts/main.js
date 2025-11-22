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
            outputElement.innerHTML = "<p class='text-red-500 font-medium'>Please enter a place you want to visit.</p>";
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
                    finalOutput = `<p class="text-red-700">I'm sorry, the Tourism AI Agent doesn't know if a place called <span class="font-semibold text-gray-900">${placeName}</span> exists. Please try a different location.</p>`;
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
            finalOutput = `<p class='text-red-500 font-medium'>${error.message || 'A critical error occurred while planning your trip. The service might be temporarily unavailable.'}</p>`;
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
            <div class="report-header">
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
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
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
                    <div class="mt-6 pt-4 border-t border-gray-300">
                        <div class="flex items-center space-x-2 mb-3">
                            <i data-lucide="landmark" class="w-5 h-5 text-green-600"></i>
                            <h3 class="text-lg font-bold text-gray-800">Tourist Attractions</h3>
                        </div>
                        <p class="text-red-500">Unable to load attractions at this time.</p>
                    </div>
                `;
            }
        }

        let finalOutput = headerHTML;

        if (weatherResult) {
            finalOutput += `<div class="report-section">${weatherResult}</div>`;
        }

        if (placesResult) {
            finalOutput += `<div class="report-section">${placesResult}</div>`;
        }

        if (!weatherResult && !placesResult) {
            const [defaultWeather, defaultPlaces] = await Promise.all([
                this.weatherAgent.fetchWeather(lat, lon),
                this.placesAgent.fetchPlaces(lat, lon)
            ]);
            
            finalOutput += `<div class="report-section">${defaultWeather}</div>`;
            finalOutput += `<div class="report-section">${this.placesAgent.generatePlacesSummary(defaultPlaces, displayName)}</div>`;
        }

        finalOutput += `
            <div class="mt-6 pt-4 border-t border-gray-300">
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
            </div>
        `;

        return finalOutput;
    }

    printReport() {
        if (this.isPrinting) return;
        
        this.isPrinting = true;
        
        const printButton = document.getElementById('printButton');
        printButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Printing...';
        printButton.disabled = true;
        
        const originalTitle = document.title;
        const placeName = document.getElementById('placeInput').value.trim() || 'Tourism Report';
        document.title = `Tourism Report - ${placeName}`;
        
        const printWindow = window.open('', '_blank');
        const reportContent = document.getElementById('outputCard').innerHTML;
        
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Tourism Report - ${placeName}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <script src="https://unpkg.com/lucide@latest"></script>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', sans-serif; 
                        padding: 20px; 
                        background: white;
                        color: #1f2937;
                        line-height: 1.6;
                    }
                    .container { max-width: 800px; margin: 0 auto; }
                    .report-header {
                        background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%);
                        border-radius: 12px;
                        padding: 24px;
                        color: white;
                        margin-bottom: 24px;
                    }
                    .report-section { margin-bottom: 24px; }
                    .bg-white { background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
                    .weather-grid { 
                        display: grid; 
                        grid-template-columns: repeat(5, 1fr); 
                        gap: 8px; 
                        margin: 16px 0; 
                    }
                    .forecast-day { 
                        background: #f8fafc; 
                        border: 1px solid #e2e8f0; 
                        border-radius: 8px; 
                        padding: 12px; 
                        text-align: center; 
                        font-size: 14px;
                    }
                    .place-card { 
                        border: 1px solid #e5e7eb; 
                        border-radius: 8px; 
                        padding: 16px; 
                        margin: 8px 0; 
                        background: white;
                    }
                    .text-primary-indigo { color: #1E3A8A; }
                    .border-gray-200 { border-color: #e5e7eb; }
                    .border-gray-300 { border-color: #d1d5db; }
                    .flex { display: flex; }
                    .items-center { align-items: center; }
                    .space-x-2 > * + * { margin-left: 8px; }
                    .space-x-3 > * + * { margin-left: 12px; }
                    .mb-3 { margin-bottom: 12px; }
                    .mb-4 { margin-bottom: 16px; }
                    .mt-6 { margin-top: 24px; }
                    .pt-4 { padding-top: 16px; }
                    .text-xl { font-size: 20px; }
                    .text-lg { font-size: 18px; }
                    .text-sm { font-size: 14px; }
                    .text-xs { font-size: 12px; }
                    .font-bold { font-weight: 700; }
                    .font-semibold { font-weight: 600; }
                    .text-red-600 { color: #dc2626; }
                    .text-blue-600 { color: #2563eb; }
                    .text-green-600 { color: #059669; }
                    .text-purple-600 { color: #7c3aed; }
                    .text-gray-600 { color: #4b5563; }
                    .text-gray-700 { color: #374151; }
                    .text-gray-800 { color: #1f2937; }
                    .text-gray-500 { color: #6b7280; }
                    .rounded-lg { border-radius: 8px; }
                    .text-center { text-align: center; }
                    .grid { display: grid; }
                    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
                    .gap-4 { gap: 16px; }
                    .justify-between { justify-content: space-between; }
                    .w-5 { width: 20px; }
                    .w-6 { width: 24px; }
                    .h-5 { height: 20px; }
                    .h-6 { height: 24px; }
                    
                    @media print {
                        body { padding: 0; margin: 0; }
                        .container { max-width: 100%; }
                        .report-header { -webkit-print-color-adjust: exact; color-adjust: exact; }
                        .bg-white { -webkit-print-color-adjust: exact; color-adjust: exact; }
                        .weather-grid { break-inside: avoid; }
                        .report-section { break-inside: avoid; }
                    }
                    
                    @media (max-width: 768px) {
                        .weather-grid { grid-template-columns: repeat(2, 1fr); }
                    }
                    
                    @media (max-width: 480px) {
                        .weather-grid { grid-template-columns: 1fr; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    ${reportContent}
                </div>
                <script>
                    lucide.createIcons();
                    window.addEventListener('afterprint', function() {
                        window.close();
                    });
                    
                    setTimeout(function() {
                        window.print();
                    }, 500);
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.open();
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        printWindow.addEventListener('load', function() {
            setTimeout(() => {
                printWindow.print();
            }, 1000);
        });
        
        const restoreButton = () => {
            printButton.innerHTML = '<i data-lucide="printer" class="w-5 h-5 text-primary-indigo"></i> Print Report';
            printButton.disabled = false;
            document.title = originalTitle;
            this.isPrinting = false;
            lucide.createIcons();
        };
        
        printWindow.addEventListener('afterprint', restoreButton);
        
        const checkPrintWindow = setInterval(() => {
            if (printWindow.closed) {
                clearInterval(checkPrintWindow);
                restoreButton();
            }
        }, 500);
        
        setTimeout(restoreButton, 10000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TourismAISystem();
});