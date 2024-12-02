let spinData = null;

async function initializeSpin() {
    await loadSpinData();
}
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
async function loadSpinData() {
    try {
        const response = await fetch(`/spin?username=${encodeURIComponent(username)}`);
        if (!response.ok) throw new Error('Failed to load spin data');
        const data = await response.json();
        spinData = data;

        // Check for notification from server
        if (data.notification && data.notification.show) {
            showDailyTicketsToast(data.notification.message);
        }

        updateSpinDisplay();
    } catch (error) {
        console.error('Error loading spin data:', error);
    }
}

function showDailyTicketsToast(message) {
    const toast = document.createElement('div');
    toast.className = 'daily-tickets-toast';
    toast.innerHTML = `
        <span class="ticket-icon">🎫</span>
        <div class="message">${message}</div>
    `;
    document.body.appendChild(toast);

    // Remove the toast after animation completes
    setTimeout(() => {
        toast.remove();
    }, 5500);
}
function createConfetti() {
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    document.body.appendChild(celebration);

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeead'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s linear forwards`;
        confetti.style.animationDelay = Math.random() * 3 + 's';
        celebration.appendChild(confetti);
    }

    setTimeout(() => celebration.remove(), 5000);
}

function showWinnerModal(tickets) {
    const modal = document.createElement('div');
    modal.className = 'winner-modal';
    modal.innerHTML = `
        <div class="winner-title">🎉 Congratulations! 🎉</div>
        <div>You've Won</div>
        <div class="winner-tickets">${tickets} Coins!</div>
        <button class="spin-play" onclick="this.parentElement.remove()">Awesome!</button>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 100);
    createConfetti();
}

function createSpinSegments() {
    const rewards = [200, 3000, 5000, 10000, 20000, 800, 4000, 1000];
    return rewards.map((reward, index) => `
        <div class="spin-segment" style="transform: rotate(${index * (360 / rewards.length)}deg)">
            <div class="segment-content">
                ${reward}
            </div>
        </div>
    `).join('');
}

// Update wheel creation to include pointer
function openSpinPopup() {
    const popup = document.createElement('div');
    popup.className = 'spin-popup active';
    popup.innerHTML = `
        <span class="spin-close" onclick="closeSpinPopup()">×</span>
        <div class="spin-info">
            <div class="spin-tickets">🎫 Spin Tickets: ${spinData?.spintickets || 0}</div>
            <button class="spin-play" onclick="startSpin()" ${(!spinData?.spintickets || spinData.spintickets < 1) ? 'disabled' : ''}>
                🎯 SPIN TO WIN!
            </button>
        </div>
        <div class="spin-wheel-container">
            <div class="wheel-pointer"></div>
            <div class="spin-wheel">
                ${createSpinSegments()}
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function getSegmentColor(index) {
    const colors = [
        'linear-gradient(135deg, #FF6B6B, #FF8787)',
        'linear-gradient(135deg, #4ECDC4, #45B7D1)',
        'linear-gradient(135deg, #45B7D1, #96CEB4)',
        'linear-gradient(135deg, #96CEB4, #FFEEAD)',
        'linear-gradient(135deg, #FFEEAD, #D4A5A5)',
        'linear-gradient(135deg, #D4A5A5, #9FA8DA)',
        'linear-gradient(135deg, #9FA8DA, #80DEEA)',
        'linear-gradient(135deg, #80DEEA, #FF6B6B)'
    ];
    return colors[index % colors.length];
}

function closeSpinPopup() {
    const popup = document.querySelector('.spin-popup');
    if (popup) {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 300);
    }
}


async function startSpin() {
    if (!spinData?.spintickets || spinData.spintickets < 1) return;

    const wheel = document.querySelector('.spin-wheel');
    const segments = document.querySelectorAll('.spin-segment');
    const playButton = document.querySelector('.spin-play');
    playButton.disabled = true;

    // Instant reset to 0 degrees
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';

    // Force reflow
    void wheel.offsetWidth;

    segments.forEach(segment => segment.classList.remove('winner'));

    const rewards = [3000, 5000, 10000, 20000, 800, 4000, 1000];
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const rotations = 10 + Math.random() * 3; // More aggressive spinning
    const degreePerSegment = 360 / rewards.length;
    const finalRotation = (rotations * 360) + (randomIndex * degreePerSegment) + (Math.random() * degreePerSegment);

    // Faster, more dynamic spin
    wheel.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
    wheel.style.transform = `rotate(${finalRotation}deg)`;

    setTimeout(async () => {
        const reward = rewards[randomIndex];
        try {
            const response = await fetch('/spin/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    reward
                })
            });

            if (!response.ok) throw new Error('Failed to claim reward');

            const result = await response.json();
            fetchAndDisplayTickets()
            spinData = result.spinData;

            segments[randomIndex].classList.add('winner');

            showWinnerModal(reward);
            await fetchAndDisplayCoins();
            updateSpinDisplay();

            // Prepare for next spin - instant reset
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';

            playButton.disabled = spinData.spintickets < 1;
        } catch (error) {
            console.error('Error claiming reward:', error);
            alert('Failed to claim reward. Please try again.');
        }
    }, 3000);
}

function updateSpinDisplay() {
    const ticketsDisplay = document.querySelector('.spin-tickets');
    if (ticketsDisplay) {
        ticketsDisplay.textContent = `🎫Spin Tickets: ${spinData?.spintickets || 0}`;
    }
}

document.addEventListener('DOMContentLoaded', initializeSpin);