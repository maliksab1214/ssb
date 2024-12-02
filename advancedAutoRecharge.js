// advancedAutoRecharge.js
const fs = require('fs');
const path = require('path');
class AdvancedAutoRecharge {
    constructor(spinDataDir) {
        this.spinDataDir = spinDataDir;
        this.rechargeInterval = 10000; // Check every 3 seconds
    }

    start() {
        console.log('Starting fresh auto recharge system...');
        setInterval(() => this.processAllUsers(), this.rechargeInterval);
    }

    async processAllUsers() {
        try {
            const users = fs.readdirSync(this.spinDataDir);
            users.forEach(username => {
                this.processSingleUser(username);
            });
        } catch (error) {
            console.error('Error in processAllUsers:', error);
        }
    }

    calculateRechargeAmount(tapData) {
        const { tapcoins, resetCoins, pauseMinutes } = tapData;

        // Always check against current resetCoins
        if (tapcoins >= resetCoins) {
            return 0;
        }

        // Calculate recharge rate using current pauseMinutes and resetCoins
        const totalRechargeTime = pauseMinutes * 60 * 1000; // Convert minutes to milliseconds
        const totalIntervals = totalRechargeTime / this.rechargeInterval;
        const rechargePerInterval = resetCoins / totalIntervals;

        // Round to 1 decimal place
        return Math.round(rechargePerInterval * 10) / 10;
    }

    processSingleUser(username) {
        const tapFilePath = path.join(this.spinDataDir, username, 'tap.json');

        try {
            if (!fs.existsSync(tapFilePath)) {
                return;
            }

            // Read fresh data every time
            let tapData = JSON.parse(fs.readFileSync(tapFilePath, 'utf8'));

            // Calculate recharge amount based on current data
            const rechargeAmount = this.calculateRechargeAmount(tapData);

            if (rechargeAmount > 0) {
                // Calculate new tapcoins value using current resetCoins as maximum
                const newTapcoins = Math.min(
                    tapData.resetCoins,
                    tapData.tapcoins + rechargeAmount
                );

                // Only update if there's a meaningful change
                if (newTapcoins > tapData.tapcoins) {
                    tapData.tapcoins = newTapcoins;

                    // Save updated data
                    fs.writeFileSync(tapFilePath, JSON.stringify(tapData, null, 2));

                    // Log significant recharge events
                    if (Math.floor(newTapcoins) > Math.floor(tapData.tapcoins)) {
                        console.log(`User ${username} recharged to ${Math.floor(newTapcoins)} coins (Reset: ${tapData.resetCoins}, Pause: ${tapData.pauseMinutes}min)`);
                    }
                }
            }

        } catch (error) {
            console.error(`Error processing user ${username}:`, error);
        }
    }
}

module.exports = AdvancedAutoRecharge;