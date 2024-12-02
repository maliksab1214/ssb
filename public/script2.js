        // Global variables
        let username;
        let activeTimers = {};

        // Helper function for formatting numbers (k, m, b)
        function formatNumber(number) {
            const absNumber = Math.abs(number);
            if (absNumber < 1000) {
                return number.toString();
            } else if (absNumber < 1000000) {
                return (number / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
            } else if (absNumber < 1000000000) {
                return (number / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'm';
            } else {
                return (number / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'b';
            }
        }

        // Fetch and display tickets
        async function fetchAndDisplayTickets() {
            try {
                const ticketsResponse = await fetch(`/tickets?username=${encodeURIComponent(username)}`);
                if (!ticketsResponse.ok) {
                    throw new Error('Failed to fetch tickets data.');
                }
                const ticketsData = await ticketsResponse.json();
                const tickets = Number(ticketsData.tickets);
                document.getElementById('ticketsDisplay').textContent = `${isNaN(tickets) ? 0 : tickets}`;
            } catch (error) {
                console.error('Error fetching tickets:', error);
                displayError('Failed to load tickets data.');
            }
        }

        // Fetch and display coins
        async function fetchAndDisplayCoins() {
            try {
                const coinsResponse = await fetch(`/coins?username=${encodeURIComponent(username)}`);
                if (!coinsResponse.ok) {
                    throw new Error('Failed to fetch coins data.');
                }
                const coinsData = await coinsResponse.json();
                let coins = Number(coinsData.coins);
                if (isNaN(coins)) {
                    coins = 0;
                }
                document.getElementById('coinsDisplay').innerText = coins.toLocaleString();
            } catch (error) {
                console.error('Error fetching coins:', error);
                displayError('Failed to load coins data.');
            }
        }

        // Fetch and display profit
        async function feetchAndDisplayProfit() {
            try {
                const response = await fetch(`/profit?username=${encodeURIComponent(username)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch profit data.');
                }
                const profitData = await response.json();
                let profit = Number(profitData.profitPerHour);
                if (isNaN(profit)) {
                    profit = 0;
                }

                // Change to use globalProfitDisplay instead of profitDisplay
                const globalProfitDisplay = document.getElementById('globalProfitDisplay');
                if (globalProfitDisplay) {
                    globalProfitDisplay.innerText = `${formatNumber(profit)} ProfitPerHour`;
                }
            } catch (error) {
                console.error('Error fetching profit:', error);
                displayError('Failed to load profit data.');
            }
        }

        // Get section content
        async function getSectionContent(section) {
            const response = await fetch(`${section}.html`);
            if (!response.ok) {
                displayError('Failed to load section content.');
                return '<h2>Error</h2><p>Failed to load content.</p>';
            }
            return await response.text();
        }

        // Configuration for hiding elements based on section
        const hideElements = {
            tasks: [
                '#headerSection',
                '.username',
                '.logo-container',
                '.rdbox-button',
                '.decorative-bar',
                '.circular-logo',
                '.profit-info',
                '.ticketsDisplay',
                '.profit-logo',
                '.tickets-value',
                '.coins-value',
                '.stat-value',
                '.stats-info',
                '.stat-item-ticket',
                '.coins-logo',
                '.coins-info',
                '.user-info',
                '.spin-button',
                '.spin-popup',
                '.skins-button',
                '.level-button',
                '.rewards-popup',
                '.skins-popup',
                '.update-interface',
                '.level-details-popup',
                '.coins-info',
                '.rewards-button',
                '.dotted-line',
                '.update-btn',
                '.show-update-btn',
                '.tap-battery',
                '.username',
                '.user-info',
                '.profit-info'
            ],
            status: [
                '.level-button',
                '.logo-container',
                '.decorative-bar',
                '.circular-logo',
                '.rdbox-button',
                '.profit-info',
                '.stats-info',
                '.stat-item-ticket',
                '.profit-logo',
                '.tickets-value',
                '.coins-value',
                '.stat-value',
                '.coins-logo',
                '.coins-info',
                '.user-info',
                '.spin-button',
                '.spin-popup',
                '.skins-button',
                '.rewards-button',
                '.rewards-popup',
                '.skins-popup',
                '.username',
                '.update-interface',
                '.level-details-popup',
                '.overlay',
                '.popup',
                '.modal',
                '.dotted-line',
                '.show-update-btn',
                '.tap-battery',
                '.profit-info'
            ],
            reddit: [
                '.level-button',
                '.rewards-popup',
                '.rdbox-button',
                '.decorative-bar',
                '.skins-button',
                '.stats-info',
                '.stat-item-ticket',
                '.logo-container',
                    '.circular-logo',
                    '.profit-info',
                    '.profit-logo',
                    '.tickets-value',
                    '.coins-value',
                    '.stat-value',
                '.coins-logo',
                '.coins-info',
                '.user-info',
                '.spin-button',
                '.spin-popup',
                '.skins-popup',
                '.username',
                '.update-interface',
                '.coins-info',
                '.rewards-button',
                '.update-btn',
                '.show-update-btn',
                '.tap-battery',
                '.dotted-line',
                '.level-details-popup',
                '.profit-info'
            ],
            miniGames: [
                '#headerSection',
                    '.username',
                    '.rdbox-button',
                    '.logo-container',
                    '.circular-logo',
                    '.profit-info',
                    '.ticketsDisplay',
                    '.decorative-bar',
                    '.profit-logo',
                    '.tickets-value',
                    '.coins-value',
                    '.stat-value',
                    '.stats-info',
                    '.stat-item-ticket',
                    '.coins-logo',
                    '.coins-info',
                    '.user-info',
                    '.spin-button',
                    '.spin-popup',
                    '.skins-button',
                    '.level-button',
                    '.rewards-popup',
                    '.skins-popup',
                    '.update-interface',
                    '.level-details-popup',
                    '.coins-info',
                    '.rewards-button',
                    '.update-btn',
                    '.show-update-btn',
                    '.dotted-line',
                    '.tap-battery',
                    '.username',
                    '.user-info',
                    '.profit-info'
            ],
            cards: [
                '#headerSection',
                '.level-button',
                '.stats-info',
                '.rdbox-button',
                '.stat-item',
                '.rewards-button',
                '.decorative-bar',
                '.dotted-line',
                '.logo-container',
                '.circular-logo',
                '.profit-info',
                '.profit-logo',
                '.tickets-value',
                '.coins-value',
                '.stat-value',
                '.coins-logo',
                '.coins-info',
                '.user-info',
                '.spin-button',
                '.spin-popup',
                '.rewards-popup',
                '.skins-button',
                '.skins-popup',
                '.username',
                '.update-interface',
                '.level-details-popup',
                '.overlay',
                '.popup',
                '.modal',
                '.show-update-btn',
                '.tap-battery',
                '.profit-info'
            ],
            home: [] // Nothing to hide on home section
        };

        // Handle element visibility
        function handleElementVisibility(section) {
            // First show all elements that might have been hidden
            const allElements = new Set([].concat(...Object.values(hideElements)));
            allElements.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style.display = '';  // Reset to default display value
                });
            });

            // Then hide elements specific to current section
            if (hideElements[section]) {
                hideElements[section].forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        element.style.display = 'none';
                    });
                });
            }
        }

        // Show section function
        async function showSection(section) {
            const sections = ['home', 'tasks', 'reddit', 'miniGames', 'status', 'cards'];
            const content = document.getElementById('mainContent');

            if (!sections.includes(section)) {
                displayError('Invalid section.');
                return;
            }

            try {
                const sectionContent = await getSectionContent(section);
                content.innerHTML = sectionContent;

                // Handle element visibility for the current section
                handleElementVisibility(section);

                // Initialize specific section functionality
                if (section === 'tasks') {
                    const tasksManager = new TasksManager(username);
                    await tasksManager.loadTasks();
                } 
                else if (section === 'status') {
                    const statusInitEvent = new CustomEvent('statusInit', { 
                        detail: { username: username } 
                    });
                    window.dispatchEvent(statusInitEvent);
                }
                else if (section === 'reddit') {
                    new WordGame(username);
                }
                else if (section === 'miniGames') {
                        //new WordGame(username);
                    }
                else if (section === 'cards') {
                    new CardsManager(username);
                }

                content.style.display = 'block';

                // Show/hide back button based on section
                const backButton = document.getElementById('backButton');
                if (backButton) {
                    backButton.style.display = section !== 'home' ? 'block' : 'none';
                }
            } catch (error) {
                console.error(`Error loading ${section} section:`, error);
                content.innerHTML = '<h2>Error</h2><p>Failed to load content.</p>';
            }
        }

        // Main initialization when DOM is loaded
        document.addEventListener('DOMContentLoaded', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            username = urlParams.get('username');

            if (!username) {
                displayError('Username not provided.');
                return;
            }

            document.getElementById('usernameDisplay').innerText = username;

            // Initialize all displays
            await Promise.all([
                fetchAndDisplayCoins(),
                fetchAndDisplayTickets(),
                feetchAndDisplayProfit()
            ]);

            await showSection('home');

            // Set up navigation buttons
            document.querySelectorAll('.nav-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const section = button.getAttribute('data-section');
                    await showSection(section);
                });
            });

            // Set up back button
            document.getElementById('backButton').addEventListener('click', async () => {
                await showSection('home');
            });

            // Set up periodic updates
            setInterval(fetchAndDisplayCoins, 5000);
            setInterval(fetchAndDisplayTickets, 500000);
            setInterval(feetchAndDisplayProfit, 20000);
        });

        // Event listeners for updates
        window.addEventListener('profitUpdated', async () => {
            await feetchAndDisplayProfit();
        });

        window.addEventListener('tasksCoinsUpdated', async () => {
            await fetchAndDisplayCoins();
        });