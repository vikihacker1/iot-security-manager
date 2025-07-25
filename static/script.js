document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const targetIpInput = document.getElementById('target-ip');
    const statusText = document.getElementById('status-text');
    const devicesGrid = document.getElementById('devices-grid');

    scanBtn.addEventListener('click', async () => {
        const target = targetIpInput.value;
        if (!target) {
            alert('Please enter a target network range.');
            return;
        }

        // --- UI Update: Show loading state ---
        devicesGrid.innerHTML = '';
        devicesGrid.classList.add('hidden');
        statusText.innerHTML = `
            <div class="flex justify-center items-center text-emerald-400">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="text-lg">Scanning ${target}... This may take a few minutes<span class="blinking-cursor border-r-2"></span></p>
            </div>`;
        statusText.classList.remove('hidden');
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scanning...';

        try {
            // --- API Call to Flask Backend ---
            const response = await fetch('/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target })
            });

            const results = await response.json();

            if (!response.ok || results.error) {
                throw new Error(results.error || 'Network response was not ok.');
            }
            
            displayResults(results);

        } catch (error) {
            console.error('Scan failed:', error);
            statusText.innerHTML = `<p class="text-red-400">Scan failed. ${error.message}</p>`;
        } finally {
            scanBtn.disabled = false;
            scanBtn.textContent = 'Start Scan';
        }
    });

    function displayResults(data) {
        statusText.classList.add('hidden');
        devicesGrid.classList.remove('hidden');
        devicesGrid.innerHTML = ''; // Clear previous results

        if (Object.keys(data).length === 0) {
            statusText.innerHTML = '<p class="text-lg text-gray-400">No devices found on the network.</p>';
            statusText.classList.remove('hidden');
            return;
        }

        for (const ip in data) {
            const device = data[ip];
            const deviceCard = document.createElement('div');
            deviceCard.className = 'bg-gray-700/50 border border-gray-700 rounded-lg p-5 transition-all hover:border-emerald-500/50';

            let portsHtml = '<p class="text-sm text-gray-400">No open ports found.</p>';
            if (device.ports && device.ports.length > 0) {
                portsHtml = device.ports.map(p => {
                    const port = p.port;
                    const service = p.service;
                    let color = 'text-green-400';
                    // Highlight potentially risky ports
                    if ([21, 22, 23, 80, 8080].includes(port)) color = 'text-yellow-400';
                    if ([23, 21].includes(port)) color = 'text-red-400'; // Telnet/FTP are very insecure

                    return `<span class="inline-block bg-gray-600 rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2 ${color}">${port} <span class="text-gray-300">(${service})</span></span>`;
                }).join('');
            }

            deviceCard.innerHTML = `
                <div class="flex items-center mb-3">
                    <svg class="w-6 h-6 mr-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <h3 class="text-xl font-bold">${ip}</h3>
                </div>
                <p class="text-sm text-gray-400 mb-4">${device.vendor || 'Unknown Vendor'}</p>
                <div>
                    <h4 class="font-semibold mb-2 text-gray-300">Open Ports:</h4>
                    <div class="flex flex-wrap">
                        ${portsHtml}
                    </div>
                </div>
            `;
            devicesGrid.appendChild(deviceCard);
        }
    }
});
