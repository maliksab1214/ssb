class TapManager {
    constructor(username) {
        this.username = username;
        this.batteryElement = null;
        this.tapData = null;
        this.initialized = false;
        this.lastTapTime = 0;
    }

    async initialize() {
        if (this.initialized) return;

        // Create battery element
        this.batteryElement = document.createElement('div');
        this.batteryElement.className = 'tap-battery';
        document.body.appendChild(this.batteryElement);

        // Initial tap data fetch
        await this.refreshTapData();

        // Setup logo click handlers
        const logo = document.querySelector('.circular-logo');
        if (logo) {
            logo.style.cursor = 'pointer';

            // Touch events with multi-touch support
            logo.addEventListener('touchstart', (e) => {
                e.preventDefault();
                for (let touch of e.touches) {
                    this.handleTap({
                        x: touch.clientX,
                        y: touch.clientY,
                        type: 'touch'
                    });
                }
            }, { passive: false });

            // Pointer events for mouse and stylus
            logo.addEventListener('pointerdown', (e) => {
                this.handleTap({
                    x: e.clientX,
                    y: e.clientY,
                    type: 'pointer'
                });
            });
        } else {
            console.error('Circular logo element not found');
        }

        // Periodic tap data refresh
        setInterval(() => this.refreshTapData(), 5000);
        this.initialized = true;
    }

    handleTap(event) {
        const currentTime = Date.now();

        // Prevent excessive tapping (50ms cooldown)
        if (currentTime - this.lastTapTime < 50) return;
        this.lastTapTime = currentTime;

        // Optimistically show tap animation and coin increase
        this.showTapAnimation(event);
        this.processSingleTap(event);
    }

    async processSingleTap(event) {
        try {
            // Send tap to server
            const response = await fetch('/tap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: this.username, 
                    tapCount: 1
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                // Fully sync coins
                if (typeof window.fetchAndDisplayCoins === 'function') {
                    await window.fetchAndDisplayCoins();
                }

                // Refresh tap data
                await this.refreshTapData();
            } else if (result.status === 'insufficient_coins') {
                // Remove the coin animation if not enough tap coins
                this.clearLastCoinAnimation();
            }
        } catch (error) {
            console.error('Tap processing error:', error);
            this.clearLastCoinAnimation();
        }
    }

    showTapAnimation(event) {
        // Create coin animation
        const coin = document.createElement('div');
        coin.className = 'cosmic-coin';
        coin.dataset.timestamp = Date.now(); // Mark for potential removal

        const coinValue = document.createElement('span');
        coinValue.className = 'coin-value';
        coinValue.textContent = `+${this.tapData?.tapper || 1}`;
        coin.appendChild(coinValue);

        // Randomize position slightly around the tap point
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        coin.style.left = `${event.x + offsetX}px`;
        coin.style.top = `${event.y + offsetY}px`;

        document.body.appendChild(coin);

        // Animate coin
        coin.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(0, -50px) scale(1.2)`, opacity: 0 }
        ], {
            duration: 1000,
            easing: 'ease-out'
        });

        // Remove coin element after animation
        setTimeout(() => coin.remove(), 1000);
    }

    clearLastCoinAnimation() {
        // Find and remove the most recent coin animation
        const coins = document.querySelectorAll('.cosmic-coin');
        if (coins.length > 0) {
            const lastCoin = coins[coins.length - 1];
            lastCoin.remove();
        }
    }

    async refreshTapData() {
        try {
            const response = await fetch(`/tap?username=${encodeURIComponent(this.username)}`);
            if (!response.ok) throw new Error('Failed to fetch tap data');

            this.tapData = await response.json();
            this.updateBatteryDisplay();
        } catch (error) {
            console.error('Error refreshing tap data:', error);
        }
    }

    updateBatteryDisplay() {
        if (!this.tapData || !this.batteryElement) return;

        const percentage = (this.tapData.tapcoins / this.tapData.resetCoins) * 100;
        this.batteryElement.style.setProperty('--fill-percentage', `${percentage}%`);

        this.batteryElement.setAttribute('data-status', 
            this.tapData.tapcoins === 0 
                ? '⚡ Recharging' 
                : `${this.tapData.tapcoins} / ${this.tapData.resetCoins}`
        );
    }
}

// Initialize TapManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const username = new URLSearchParams(window.location.search).get('username');
        if (username) {
            const tapManager = new TapManager(username);
            tapManager.initialize();
        } else {
            console.error('Username not found in URL parameters');
        }
    }, 100);
});