// Level system with real-time updates
let currentLevel = 1;
let currentCoins = 0;

const RANKS = {
    BRONZE: { name: 'Warrior', range: [1, 2] },
    SILVER: { name: 'Elite', range: [3, 4] },
    GOLD: { name: 'Master', range: [5, 6] },
    PLATINUM: { name: 'GrandMaster', range: [7, 8] },
    DIAMOND: { name: 'Epic', range: [9, 10] },
    LEGEND: { name: 'Legend', range: [11, 12] },
    MYTHIC: { name: 'Mythic', range: [13] },
    STRONGEST: { name: 'Strongest', range: [14] },
    UNDFEATABLE: { name: 'Undfeatable', range: [15] }

};

function getRankFromLevel(level) {
    for (const rank of Object.values(RANKS)) {
        if (level >= rank.range[0] && level <= rank.range[1]) {
            return rank.name;
        }
    }
    return RANKS.BRONZE.name;
}

async function initializeLevelSystem() {
    try {
        const username = document.getElementById('usernameDisplay').textContent;
        const response = await fetch(`/levels?username=${username}`);
        const levelData = await response.json();

        if (levelData.shouldNotify) {

            showLevelUpNotification(levelData);
        }

        updateLevelDisplay(levelData);
        setupCoinObserver();
    } catch (error) {
        console.error('Error initializing level system:', error);
    }
}
const rankInfo = Object.values(RANKS).find(rank => 
    currentLevel >= rank.range[0] && 
    (rank.range[1] ? currentLevel <= rank.range[1] : true)
);
const rank = rankInfo ? rankInfo.name : RANKS.BRONZE.name;
function setupCoinObserver() {
    const coinsDisplay = document.getElementById('coinsDisplay');
    if (!coinsDisplay) return;

    // Create a MutationObserver to watch for changes in the coins display
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const newCoinsText = coinsDisplay.textContent.replace(/[^0-9]/g, '');
                const newCoins = parseInt(newCoinsText, 10);
                if (!isNaN(newCoins)) {
                    updateLevelOnCoinsChange(newCoins);
                }
            }
        }
    });

    // Start observing the coins display for changes
    observer.observe(coinsDisplay, {
        childList: true,
        characterData: true,
        subtree: true
    });
}

async function updateLevelOnCoinsChange(newCoins) {
    try {
        const username = document.getElementById('usernameDisplay').textContent;
        const response = await fetch(`/levels?username=${username}`);
        const levelData = await response.json();

        // Update current values
        currentCoins = levelData.currentCoins;
        currentLevel = levelData.currentLevel;

        // Smoothly animate the progress bar
        animateProgressBar(levelData);

        // Update the display with new data
        updateLevelDisplay(levelData);

        // Only show notification if shouldNotify is true
        if (levelData.shouldNotify) {
            showLevelUpNotification(levelData);
        }
    } catch (error) {
        console.error('Error updating level:', error);
    }
}

function animateProgressBar(levelData) {
    const { currentCoins, coinsNeeded } = levelData;
    const progressPercent = (currentCoins / coinsNeeded) * 100;

    const progressBar = document.querySelector('.level-progress-fill');
    if (progressBar) {
        progressBar.style.transition = 'width 0.5s ease-in-out';
        progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
    }
}
function updateLevelDisplay(levelData) {
    const { currentLevel, currentCoins, coinsNeeded } = levelData;
    const progressPercent = (currentCoins / coinsNeeded) * 100;
    const rank = getRankFromLevel(currentLevel);

    const levelButton = document.querySelector('.level-button');
    if (!levelButton) return;

    // Clear existing content to prevent duplication
    levelButton.innerHTML = '';

    // Add the updated level information
    function formatNumber(num) {
        return num.toLocaleString();
    }

    levelButton.innerHTML = `
        <span class="level-rank">${rank}</span>
        <span class="level-text">Level ${formatNumber(currentLevel)}/15</span>
        <div class="level-progress-container">
            <div class="level-progress-fill" style="width: ${Math.min(progressPercent, 100)}%"></div>
        </div>
    `;



    // Update popup details if it's visible
    const levelDetails = document.querySelector('.level-details');
    if (levelDetails) {
        levelDetails.innerHTML = `
            <h2>${rank.toUpperCase()} - Level ${currentLevel}</h2>
            <p>Current Coins: ${currentCoins.toLocaleString()}</p>
            <p>Coins Needed: ${coinsNeeded.toLocaleString()}</p>
            <p>Progress: ${progressPercent.toFixed(1)}%</p>
        `;
    }
}
// Level Up Celebration System

function showLevelUpNotification(levelData) {
    // Create the notification container
    const notification = document.createElement('div');
    notification.className = 'level-up-celebration';

    // Create the confetti container
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';

    // Add confetti pieces
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confettiContainer.appendChild(confetti);
    }

    // Create the notification content
    notification.innerHTML = `
        ${confettiContainer.outerHTML}
        <div class="level-up-content">
            <button class="close-celebration">×</button>
            <div class="celebration-header">
                <div class="celebration-title">
                    <span class="celebrate-text">LEVEL UP!</span>
                    <div class="star-burst"></div>
                </div>
                <div class="level-number">LEVEL ${levelData.currentLevel}</div>
            </div>
            <div class="celebration-details">
                <div class="reward-info">
                    <div class="reward-icon">🏆</div>
                    <div class="reward-text">
                        <span>Reward Earned</span>
                        <span class="coins">${levelData.coinsReward.toLocaleString()} Coins</span>
                    </div>
                </div>
                <div class="new-rank">
                    <span>New Rank: </span>
                    <span class="rank-name">${getRankFromLevel(levelData.currentLevel).toUpperCase()}</span>
                </div>
                <div class="next-goal">
                    <span>Next Level Goal: </span>
                    <span class="goal-amount">${levelData.coinsNeeded.toLocaleString()} Coins</span>
                </div>
            </div>
            <button class="continue-button">CONTINUE</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Add event listeners for closing
    const closeButton = notification.querySelector('.close-celebration');
    const continueButton = notification.querySelector('.continue-button');

    const closeNotification = () => {
        notification.classList.add('closing');
        setTimeout(() => {
            notification.remove();
        }, 500);
    };

    closeButton.addEventListener('click', closeNotification);
    continueButton.addEventListener('click', closeNotification);

    // Play celebration sound (optional)
    playLevelUpSound();
}

function playLevelUpSound() {
    const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAsFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFiwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsP////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD5UqTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
    audio.play().catch(e => console.log('Audio play failed:', e));
}
function showLevelUpNotification(levelData) {
    // Create and show a notification for level up
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = `
        <h3>Level Up!</h3>
        <p>You've reached Level ${levelData.currentLevel}</p>
        <p>Reward: ${levelData.coinsReward} coins</p>
    `;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeLevelSystem();
});

// Listen for custom coins updated event
window.addEventListener('coinsUpdated', (event) => {
    const newCoins = event.detail.coins;
    updateLevelOnCoinsChange(newCoins);
});

// Function to dispatch coins update event
function dispatchCoinsUpdate(newCoins) {
    window.dispatchEvent(new CustomEvent('coinsUpdated', { 
        detail: { coins: newCoins }
    }));
}
document.querySelector('.level-button').addEventListener('click', function() {
    document.querySelector('.level-details-popup').classList.add('active');
});

const levels = {
    1: { coinsNeeded: 50000, coinsReward: 3000, ticketsreward: 4, rank: 'Warrior' },
    2: { coinsNeeded: 150000, coinsReward: 6000, ticketsreward: 5, rank: 'Warrior' },
    3: { coinsNeeded: 350000, coinsReward: 12000, ticketsreward: 6, rank: 'Elite' },
    4: { coinsNeeded: 750000, coinsReward: 20000, ticketsreward: 6, rank: 'Elite' },
    5: { coinsNeeded: 1500000, coinsReward: 35000, ticketsreward: 8, rank: 'Master' },
    6: { coinsNeeded: 3000000, coinsReward: 50000, ticketsreward: 8, rank: 'Master' },
    7: { coinsNeeded: 6000000, coinsReward: 80000, ticketsreward: 9, rank: 'GrandMaster' },
    8: { coinsNeeded: 10000000, coinsReward: 120000, ticketsreward: 10, rank: 'GrandMaster' },
    9: { coinsNeeded: 35000000, coinsReward: 120000, ticketsreward: 11, rank: 'Epic' },
    10: { coinsNeeded: 4000000, coinsReward: 50000, ticketsreward: 16, rank: 'Epic' },
    11: { coinsNeeded: 80000000, coinsReward: 800000, ticketsreward: 13, rank: 'Legend' },
    12: { coinsNeeded: 1000000000, coinsReward: 1100000, ticketsreward: 14, rank: 'Legendery' },
    13: { coinsNeeded: 3000000000, coinsReward: 1200000, ticketsreward: 15, rank: 'Mythic' },
    14: { coinsNeeded: 6000000000, coinsReward: 1300000, ticketsreward: 16, rank: 'Strongest' },
    15: { coinsNeeded: 10000000000, coinsReward: 1400000, ticketsreward: 17, rank: 'Undfeatable' }
};

function populateAllLevels() {
    const levelsContainer = document.querySelector('.all-levels');
    levelsContainer.innerHTML = '';

    for (let i = 1; i <= 15; i++) {
        const level = levels[i];
        const levelCard = `
            <div class="level-card">
                <h3>Level ${i}</h3>
                <div class="stat-item">
                    <span class="stat-label">Coins Needed:</span>
                    <span class="coins-needed">${level.coinsNeeded.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Reward Coins:</span>
                    <span class="coins-reward">${level.coinsReward.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Ticket Rewards:</span>
                    <span class="tickets-reward">${level.ticketsreward}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rank:</span>
                    <span class="rank-name">${level.rank.charAt(0).toUpperCase() + level.rank.slice(1)}</span>
                </div>
            </div>
        `;
        levelsContainer.innerHTML += levelCard;
    }
}

// Call this function when the page is loaded or the popup is opened
document.querySelector('.level-button').addEventListener('click', function () {
    document.querySelector('.level-details-popup').classList.add('active');
    populateAllLevels();
});

document.querySelector('.level-details-close').addEventListener('click', function () {
    document.querySelector('.level-details-popup').classList.remove('active');
});
