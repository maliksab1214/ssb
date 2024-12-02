class CardsManager {
    constructor(username) {
        this.username = username;
        this.cards = null;
        this.currentSection = 'miners'; // Default section
        this.countdownIntervals = {};
        this.sections = ['miners', 'economy', 'company', 'lifestyle'];
        this.sectionIcons = {
            miners: 'hammer',
            economy: 'chart-line',
            company: 'building',
            lifestyle: 'home'
        };
        this.init();
    }

    formatNumber(number) {
        if (typeof number !== 'number') return '0';

        number = Math.floor(number);

        if (number < 1000) return number.toString();

        if (number >= 1000000) {
            const millions = number / 1000000;
            if (millions % 1 === 0) {
                return millions + 'm';
            }
            return millions.toFixed(2).replace(/\.?0+$/, '') + 'm';
        }

        if (number >= 1000) {
            const thousands = number / 1000;
            if (thousands % 1 === 0) {
                return thousands + 'k';
            }
            return thousands.toFixed(2).replace(/\.?0+$/, '') + 'k';
        }

        return number.toLocaleString();
    }

    async init() {
        await this.loadCardsData();
        this.renderSectionTabs();
        this.addEventListeners();
        this.startProfitTimer();
    }

    async loadCardsData() {
        try {
            const response = await fetch(`/cards?username=${encodeURIComponent(this.username)}`);
            if (!response.ok) throw new Error('Failed to load cards');
            this.cards = await response.json();

            // Calculate current profit based on time difference
            const currentTime = new Date();
            const lastTime = new Date(this.cards.currentTime);
            const hoursDiff = Math.min(3, (currentTime - lastTime) / (1000 * 60 * 60));
            this.cards.last3Hours = this.cards.profitPerHour || 0;

            this.renderCards();
            this.updateProfitDisplay();
        } catch (error) {
            console.error('Error loading cards:', error);
        }
    }

    renderSectionTabs() {
        const container = document.getElementById('cardsContainer');
        const tabsHtml = `
            <div class="sections-tabs">
                ${this.sections.map(section => `
                    <button class="section-tab ${section === this.currentSection ? 'active' : ''}" 
                            data-section="${section}">
                        <i class="fas fa-${this.sectionIcons[section]}"></i>
                        ${section.charAt(0).toUpperCase() + section.slice(1)}
                    </button>
                `).join('')}
            </div>
        `;

        // Insert tabs at the beginning of container
        const existingTabs = container.querySelector('.sections-tabs');
        if (existingTabs) {
            existingTabs.remove();
        }
        container.insertAdjacentHTML('afterbegin', tabsHtml);
    }

    startProfitTimer() {
        setInterval(() => {
            if (this.cards && this.cards.profitPerHour) {
                this.cards.last3Hours = this.cards.profitPerHour;
                this.updateProfitDisplay();
            }
        }, 5000);
    }

    updateProfitDisplay() {
        const profitDisplay = document.getElementById('profitDisplayv2');
        if (profitDisplay && this.cards) {
            const displayValue = this.cards.profitPerHour || 0;
            profitDisplay.textContent = this.formatNumber(displayValue);
        }
    }

    renderCards() {
        const container = document.getElementById('cardsContainer');
        if (!container || !this.cards) return;

        const sectionCards = this.cards[this.currentSection] || {};

        let html = `
            <div class="profit-header">
                <h2>${this.currentSection.charAt(0).toUpperCase() + this.currentSection.slice(1)} Cards</h2>
                <div class="profit-value">
                    <span id="profitDisplay">${this.formatNumber(this.cards.profitPerHour)}</span>
                    <span class="profit-label">ProfitPerHour</span>
                </div>
            </div>
            <div class="cards-grid">
        `;

        Object.entries(sectionCards).forEach(([key, card]) => {
            const nextUpdate = new Date(card.nextUpdateTime);
            const canUpdate = new Date() >= nextUpdate;
            const isLocked = this.isCardLocked(card);

            html += `
                <div class="card-box ${isLocked ? 'locked' : ''}" data-card="${key}">
                    <div class="card-image">
                        <img src="cards/${key}.png" alt="${card.cardName}">
                        ${!isLocked ? `<div class="card-level">Level ${card.updateLevel}</div>` : ''}
                    </div>
                    <div class="card-content">
                        <h3>${card.cardName}</h3>
                        ${isLocked ? `
                            <div class="lock-message">
                                <i class="fas fa-lock"></i>
                                <p>${this.getLockMessage(card)}</p>
                            </div>
                        ` : `
                            <div class="card-stats">
                                <div class="stat">
                                    <span class="stat-label">P/h</span>
                                    <span class="stat-value">${this.formatNumber(card.perHourProfit)}</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-label">Cost</span>
                                    <span class="stat-value">${this.formatNumber(card.coins)}</span>
                                </div>
                            </div>
                            <div class="card-update">
                                <button 
                                    class="update-card-btn ${!canUpdate ? 'cooling-down' : ''}" 
                                    data-card-id="${key}"
                                    ${!canUpdate ? 'disabled' : ''}
                                >
                                    <span>${canUpdate ? 'Update' : 'Cooling Down'}</span>
                                </button>
                                <div class="countdown" data-countdown="${key}"></div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        const cardsContent = container.querySelector('.cards-content') || document.createElement('div');
        cardsContent.className = 'cards-content';
        cardsContent.innerHTML = html;

        if (!container.querySelector('.cards-content')) {
            container.appendChild(cardsContent);
        }
    }

    isCardLocked(card) {
        if (!card.lock) return false;

        if (card.lock.currentLevel && this.cards.currentLevel < card.lock.currentLevel) {
            return true;
        }

        if (card.lock.friends && this.cards.totalFriends < card.lock.friends.totalFriends) {
            return true;
        }

        return false;
    }

    getLockMessage(card) {
        if (!card.lock) return '';

        if (card.lock.currentLevel) {
            return `Reach player level ${card.lock.currentLevel}`;
        }

        if (card.lock.friends) {
            return `Have ${card.lock.friends.totalFriends} friends to unlock`;
        }

        return 'Locked';
    }

    addEventListeners() {
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.section-tab')) {
                const tab = e.target.closest('.section-tab');
                const section = tab.dataset.section;

                document.querySelectorAll('.section-tab').forEach(t => 
                    t.classList.remove('active'));
                tab.classList.add('active');

                this.currentSection = section;
                this.renderCards();
            }

            if (e.target.closest('.update-card-btn')) {
                const button = e.target.closest('.update-card-btn');
                const cardId = button.getAttribute('data-card-id');
                if (!cardId) return;

                try {
                    const response = await fetch('/cards/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: this.username,
                            cardId: cardId
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        await this.loadCardsData();
                    } else {
                        console.error('Update failed:', result.error);
                    }
                } catch (error) {
                    console.error('Error updating card:', error);
                }
            }
        });
    }
}
