const fs = require('fs');
const path = require('path');

class ProfitManager {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.userdataDir = path.join(__dirname, 'userdata');
        this.updateInterval = 5000; // 5 seconds interval
        this.running = false;
        this.userSessions = new Map(); // Track active sessions and their states
        this.activeUsers = new Set(); // Track currently active users
    }

    start() {
        if (this.running) return;
        this.running = true;

        // Initial scan for users
        this.updateActiveUsers();

        // Set up recurring processes
        setInterval(() => {
            this.updateActiveUsers();
            this.processUsers();
        }, this.updateInterval);

        // Log startup
        console.log('ProfitManager started successfully');
        this.logActiveUsers();
    }

    updateActiveUsers() {
        try {
            // Get all user directories
            const currentUsers = new Set(fs.readdirSync(this.dataDir));

            // Check for new users
            for (const user of currentUsers) {
                if (!this.activeUsers.has(user)) {
                    console.log(`New user detected: ${user}`);
                    this.initializeUserSession(user);
                }
            }

            // Check for removed users
            for (const user of this.activeUsers) {
                if (!currentUsers.has(user)) {
                    console.log(`User removed: ${user}`);
                    this.cleanupUserSession(user);
                }
            }

            this.activeUsers = currentUsers;
        } catch (error) {
            console.error('Error updating active users:', error);
        }
    }

    initializeUserSession(username) {
        this.userSessions.set(username, {
            lastUpdate: new Date(),
            lastProcessedLast3Hours: null,
            active: false,
            totalCoinsAdded: 0,
            errors: 0
        });
    }

    cleanupUserSession(username) {
        this.userSessions.delete(username);
        this.activeUsers.delete(username);
    }

    getLatestUserData(username) {
        try {
            const cardsPath = path.join(this.dataDir, username, 'cards.json');

            // Check if file exists
            if (!fs.existsSync(cardsPath)) {
                return null;
            }

            const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
            return cardsData;
        } catch (error) {
            const session = this.userSessions.get(username);
            if (session) {
                session.errors++;
            }
            console.error(`Error reading data for user ${username}:`, error);
            return null;
        }
    }

    async processUsers() {
        for (const username of this.activeUsers) {
            await this.processUserProfit(username);
        }
    }

    async processUserProfit(username) {
        const session = this.userSessions.get(username);
        if (!session) {
            this.initializeUserSession(username);
            return;
        }

        try {
            const cardsData = this.getLatestUserData(username);
            if (!cardsData) {
                session.active = false;
                return;
            }

            const currentTime = new Date();
            const last3HoursTime = new Date(cardsData.last3Hours);

            // Check if this is a new last3Hours session
            if (session.lastProcessedLast3Hours !== cardsData.last3Hours) {
                console.log(`New profit session detected for ${username}`);
                session.lastProcessedLast3Hours = cardsData.last3Hours;
                session.lastUpdate = currentTime;
                session.active = true;
                session.totalCoinsAdded = 0;
            }

            // If session expired, mark as inactive
            if (currentTime > last3HoursTime) {
                if (session.active) {
                    console.log(`Profit session ended for ${username}. Total coins added: ${session.totalCoinsAdded}`);
                    session.active = false;
                }
                return;
            }

            // Only process active sessions
            if (!session.active) {
                return;
            }

            const timeElapsedMs = currentTime.getTime() - session.lastUpdate.getTime();
            if (timeElapsedMs < 1000) return; // Minimum 1 second between updates

            const timeRemainingMs = last3HoursTime.getTime() - currentTime.getTime();
            const calculationTimeMs = Math.min(timeElapsedMs, timeRemainingMs);

            const profitPerHour = cardsData.profitPerHour || 0;
            const profitPerMs = profitPerHour / (3600 * 1000);
            const coinsToAdd = Math.floor(profitPerMs * calculationTimeMs);

            if (coinsToAdd > 0) {
                await this.updateUserCoins(username, coinsToAdd, session);
                session.lastUpdate = currentTime;
            }

        } catch (error) {
            session.errors++;
            console.error(`Error processing profit for user ${username}:`, error);

            // If too many errors, mark session as inactive
            if (session.errors > 5) {
                console.error(`Deactivating ${username}'s session due to too many errors`);
                session.active = false;
            }
        }
    }

    async updateUserCoins(username, coinsToAdd, session) {
        const coinsPath = path.join(this.userdataDir, username, 'coins.txt');

        try {
            // Ensure directory exists
            const userCoinsDir = path.dirname(coinsPath);
            if (!fs.existsSync(userCoinsDir)) {
                fs.mkdirSync(userCoinsDir, { recursive: true });
            }

            // Read current coins (or start at 0 if file doesn't exist)
            let currentCoins = 0;
            if (fs.existsSync(coinsPath)) {
                currentCoins = parseInt(fs.readFileSync(coinsPath, 'utf8')) || 0;
            }

            // Update coins
            currentCoins += coinsToAdd;
            session.totalCoinsAdded += coinsToAdd;

            // Write updated coins
            await fs.promises.writeFile(coinsPath, currentCoins.toString(), 'utf8');

            // Log the update
            this.logProfitUpdate(username, {
                added: coinsToAdd,
                total: currentCoins,
                sessionTotal: session.totalCoinsAdded,
                remainingTime: this.formatTime(
                    new Date(session.lastProcessedLast3Hours).getTime() - new Date().getTime()
                )
            });

        } catch (error) {
            session.errors++;
            console.error(`Error updating coins for user ${username}:`, error);
            throw error; // Re-throw to be handled by caller
        }
    }

    logProfitUpdate(username, details) {
        console.log(`Profit update for ${username}:`, {
            coinsAdded: details.added,
            totalCoins: details.total,
            sessionTotal: details.sessionTotal,
            remainingTime: details.remainingTime
        });
    }

    logActiveUsers() {
        console.log('Current active users:', Array.from(this.activeUsers));
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
}

module.exports = ProfitManager;