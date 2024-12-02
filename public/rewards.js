document.addEventListener('DOMContentLoaded', () => {
    const rewardsButton = document.querySelector('.rewards-button');
    const rewardsPopup = document.querySelector('.rewards-popup');
    const closeRewards = document.querySelector('.close-rewards');
    const rewardsGrid = document.querySelector('.rewards-grid');

    const REWARDS = {
        day1: 5000,
        day2: 15000,
        day3: 30000,
        day4: 60000,
        day5: 80000,
        day6: 100000,
        day7: 150000,
        day8: 200000,
        day9: 250000,
        day10: 300000
    };

    let currentRewardsData = null;

    function hideOverlappingElements() {
        const interfaceElements = document.querySelectorAll(`
            .level-details-popup,
            .coins-info,
            .update-btn,
            .show-update-btn,
            .tap-battery,
            .profit-info,
            .spin-button,
            .tickets-display,
            .level-button,
            .ticketsDisplay,
            .stats-info,
            .tickets-value,
            .ticketsDisplay:hover,
            .stat-item
        `);
        interfaceElements.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    function showOverlappingElements() {
        const interfaceElements = document.querySelectorAll(`
            .level-details-popup,
            .coins-info,
            .update-btn,
            .show-update-btn,
            .tap-battery,
            .profit-info,
            .spin-button,
            .tickets-display,
            .level-button,
            .ticketsDisplay,
            .stats-info,
            .tickets-value,
            .ticketsDisplay:hover,
            .stat-item
        `);
        interfaceElements.forEach(element => {
            if (element) {
                element.style.display = '';
            }
        });
    }

    // Show/hide popup with element visibility control
    rewardsButton?.addEventListener('click', () => {
        rewardsPopup.style.display = 'flex';
        hideOverlappingElements();
        loadRewardsData();
    });

    closeRewards?.addEventListener('click', () => {
        rewardsPopup.style.display = 'none';
        showOverlappingElements();
    });

    // Close popup when clicking outside with element visibility control
    rewardsPopup?.addEventListener('click', (e) => {
        if (e.target === rewardsPopup) {
            rewardsPopup.style.display = 'none';
            showOverlappingElements();
        }
    });

    async function loadRewardsData() {
        try {
            const username = document.querySelector('#usernameDisplay')?.textContent.trim();
            if (!username) {
                console.error('Username not found');
                return;
            }

            const response = await fetch(`/rewards?username=${username}`);
            if (!response.ok) {
                throw new Error('Failed to fetch rewards data');
            }

            const data = await response.json();
            currentRewardsData = data;
            updateRewardsDisplay();
        } catch (error) {
            console.error('Error loading rewards:', error);
        }
    }

    function createRewardBox(day, currentDay) {
        const box = document.createElement('div');
        box.className = 'reward-box';

        if (day === 10) {
            box.className += ' day-10';
        }

        if (day < currentDay) {
            box.className += ' collected';
        } else if (day === currentDay && !currentRewardsData.collected) {
            box.className += ' available';
        } else if (day > currentDay) {
            box.className += ' future';
        }

        box.innerHTML = `
            <div class="day">Day ${day}</div>
            <div class="amount">${REWARDS['day' + day]} coins</div>
        `;

        if (day === currentDay && !currentRewardsData.collected) {
            box.addEventListener('click', () => claimReward(day));
        }

        return box;
    }

    function updateRewardsDisplay() {
        if (!rewardsGrid) return;

        rewardsGrid.innerHTML = '';
        const existingTitles = document.querySelectorAll('.rewards-title');
        existingTitles.forEach(title => title.remove());

        const title = document.createElement('div');
        title.className = 'rewards-title';
        title.textContent = 'Daily Rewards';
        rewardsPopup.querySelector('.rewards-popup-content').insertBefore(title, rewardsGrid);

        const currentDay = currentRewardsData.currentDay;

        const firstRow = document.createElement('div');
        firstRow.className = 'rewards-row';
        for (let i = 1; i <= 3; i++) {
            firstRow.appendChild(createRewardBox(i, currentDay));
        }
        rewardsGrid.appendChild(firstRow);

        const secondRow = document.createElement('div');
        secondRow.className = 'rewards-row';
        for (let i = 4; i <= 6; i++) {
            secondRow.appendChild(createRewardBox(i, currentDay));
        }
        rewardsGrid.appendChild(secondRow);

        const day7Box = createRewardBox(7, currentDay);
        rewardsGrid.appendChild(day7Box);
    }

    async function claimReward(day) {
        try {
            const username = document.querySelector('#usernameDisplay')?.textContent.trim();
            if (!username) {
                console.error('Username not found');
                return;
            }

            const response = await fetch('/rewards/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    day: currentRewardsData.currentDay
                })
            });

            if (!response.ok) {
                throw new Error('Failed to claim reward');
            }

            const result = await response.json();
            if (result.status === 'success') {
                const coinsDisplay = document.querySelector('#coinsDisplay');
                if (coinsDisplay) {
                    coinsDisplay.textContent = `${result.newCoins} Coins`;
                }
                showRewardNotification(REWARDS['day' + currentRewardsData.currentDay]);
                loadRewardsData();
            }
        } catch (error) {
            console.error('Error claiming reward:', error);
        }
    }

    function showRewardNotification(amount) {
        if (!document.querySelector('.reward-notification')) {
            const notification = document.createElement('div');
            notification.className = 'reward-notification';
            notification.innerHTML = `
                <div class="reward-notification-content">
                    <div class="reward-shine"></div>
                    <button class="close-reward-notification">&times;</button>
                    <h2>Congratulations!</h2>
                    <div class="reward-coins-icon">
                        <img src="/images/coin.png" alt="Coins" width="80" height="80" onerror="this.style.display='none'">
                    </div>
                    <div class="reward-coins">+${amount}</div>
                    <p style="color: white; font-size: 1.2em;">Coins Added to Your Balance!</p>
                </div>
            `;

            document.body.appendChild(notification);

            const closeButton = notification.querySelector('.close-reward-notification');
            closeButton.addEventListener('click', () => {
                notification.style.display = 'none';
                showOverlappingElements();
            });
        } else {
            const coinsElement = document.querySelector('.reward-coins');
            if (coinsElement) {
                coinsElement.textContent = `+${amount}`;
            }
        }

        const notification = document.querySelector('.reward-notification');
        notification.style.display = 'flex';
        hideOverlappingElements();

        notification.addEventListener('click', (e) => {
            if (e.target === notification) {
                notification.style.display = 'none';
                showOverlappingElements();
            }
        });
    }
});