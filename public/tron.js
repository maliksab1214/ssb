let tronData = null;

async function initializeTron() {
    await loadTronData();
}

async function loadTronData() {
    try {
        const response = await fetch(`/tron?username=${encodeURIComponent(username)}`);
        if (!response.ok) throw new Error('Failed to load Tron data');
        tronData = await response.json();

        console.log('Tron data loaded successfully', tronData);
        updateTronDisplay();
    } catch (error) {
        console.error('Error loading Tron data:', error);
    }
}

function updateTronDisplay() {
    // You can add any specific display updates here if needed
    console.log('Current Tron Data:', tronData);
}

async function startTronUpdate() {
    try {
        const response = await fetch('/tron', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to update Tron times');

        tronData = await response.json();
        updateTronDisplay();
        console.log('Tron times updated successfully');
    } catch (error) {
        console.error('Error updating Tron times:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeTron);