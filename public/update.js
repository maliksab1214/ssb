document.addEventListener('DOMContentLoaded', () => {
    // Helper function to safely query elements
    const getElement = (selector, context = document) => {
        const element = context.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return null;
        }
        return element;
    };

    const username = getElement('#usernameDisplay')?.textContent || 'default';

    // Create and append the show update button if it doesn't exist
    let showUpdateBtn = getElement('.show-update-btn');
    if (!showUpdateBtn) {
        showUpdateBtn = document.createElement('button');
        showUpdateBtn.textContent = 'Upgrades';
        showUpdateBtn.className = 'show-update-btn';
        document.body.appendChild(showUpdateBtn);
    }

    // Function to refresh update data
            async function refreshUpdateData() {
                try {
                    const response = await fetch(`/updatetap?username=${username}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Update values using helper function
                    const elements = {
                        resetCoins: getElement('#currentResetCoins'),
                        pauseMinutes: getElement('#currentPauseHour'),
                        tapper: getElement('#currentTapper')
                    };

                    if (elements.resetCoins) {
                        elements.resetCoins.textContent = data.currentValues.resetCoins;
                    }

                    if (elements.pauseMinutes) {
                        // Display pause time in minutes instead of hours
                        elements.pauseMinutes.textContent = data.currentValues.pauseMinutes + ' min';
                    }

                    if (elements.tapper) {
                        elements.tapper.textContent = data.currentValues.tapper;
                    }

            // Update levels
            const levelElements = {
                resetCoins: getElement('#resetCoinsLevel'),
                pauseMinutes: getElement('#pauseMinutesLevel'),
                tapper: getElement('#tapperLevel')
            };

            Object.entries(levelElements).forEach(([key, element]) => {
                if (element && data.upgradeLevels[key] !== undefined) {
                    element.textContent = data.upgradeLevels[key];
                }
            });

            // Update progress bars
            updateProgressBars(data.upgradeLevels, data.maxLevels);

            // Update update cards using event delegation
            const updateInterface = getElement('#updateInterface');
            if (updateInterface) {
                updateInterface.querySelectorAll('.update-card').forEach(card => {
                    const updateType = card.dataset.type;
                    const costElement = getElement('.cost', card);

                    if (costElement && data.nextUpgradeCosts[updateType]) {
                        costElement.textContent = data.nextUpgradeCosts[updateType].toLocaleString();
                    }

                    // Check max level
                    if (data.upgradeLevels[updateType] >= data.maxLevels[updateType]) {
                        const updateBtn = getElement('.update-btn', card);
                        if (updateBtn) {
                            updateBtn.disabled = true;
                            updateBtn.innerHTML = '<span>Max Level</span>';
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error fetching update data:', error);
        }
    }

    function updateProgressBars(currentLevels, maxLevels) {
        Object.keys(currentLevels).forEach(type => {
            const progressElement = getElement(`#${type}Progress`);
            if (progressElement) {
                const percentage = (currentLevels[type] / maxLevels[type]) * 100;
                progressElement.style.width = `${percentage}%`;
            }
        });
    }

    // Add event listener to show update button
    if (showUpdateBtn) {
        showUpdateBtn.addEventListener('click', () => {
            const interface = getElement('.update-interface');
            if (interface) {
                interface.style.display = 'block';
                // Force a reflow
                interface.offsetHeight;
                interface.classList.add('show');
                refreshUpdateData();
            }
        });
    }

    const updateInterface = getElement('#updateInterface');
    if (!updateInterface) {
        console.error('Update interface not found');
        return;
    }

    // Find or create close button within the update header
    let closeBtn = getElement('.close-btn', updateInterface);
    if (!closeBtn) {
        console.warn('Close button not found, creating one');
        closeBtn = document.createElement('div');
        closeBtn.textContent = '×';
        closeBtn.className = 'close-btn';
        const updateHeader = getElement('.update-header', updateInterface);
        if (updateHeader) {
            updateHeader.appendChild(closeBtn);
        }
    }

    // Add event listener to close button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            updateInterface.classList.remove('show');
            setTimeout(() => {
                updateInterface.style.display = 'none';
            }, 300); // Match the animation duration
        });
    }

    // Use event delegation for update button clicks
    updateInterface.addEventListener('click', async (e) => {
        const updateBtn = e.target.closest('.update-btn');
        if (!updateBtn) return;

        const card = updateBtn.closest('.update-card');
        if (!card) return;

        const updateType = card.dataset.type;
        if (!updateType) return;

        try {
            const response = await fetch('/updatetap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    updateType
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                const coinsDisplay = getElement('#coinsDisplay');
                if (coinsDisplay) {
                    coinsDisplay.textContent = result.remainingCoins;
                }
                refreshUpdateData();
            }
        } catch (error) {
            console.error('Error updating:', error);
        }
    });

    // Initial data load
    refreshUpdateData();
});
document.querySelector('.show-update-btn').addEventListener('click', () => {
    const interface = document.querySelector('.update-interface');
    interface.style.display = 'block';
    // Force a reflow
    interface.offsetHeight;
    interface.classList.add('show');
    refreshUpdateData();
});

document.querySelector('.close-btn').addEventListener('click', () => {
    const interface = document.querySelector('.update-interface');
    interface.classList.remove('show');
    setTimeout(() => {
        interface.style.display = 'none';
    }, 300); // Match the animation duration
});