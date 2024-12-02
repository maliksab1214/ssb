function formatNumber(number) {
    const absNumber = Math.abs(number);
    if (absNumber < 1000) {
        return number.toString();
    } else if (absNumber < 1000000) {
        return (number / 1000).toFixed(1).replace(/\.?0+$/, '') + 'k';
    } else if (absNumber < 1000000000) {
        return (number / 1000000).toFixed(1).replace(/\.?0+$/, '') + 'm';
    } else {
        return (number / 1000000000).toFixed(1).replace(/\.?0+$/, '') + 'b';
    }
}

window.addEventListener('statusInit', async (event) => {
    const currentUsername = event.detail.username;

    try {
        const response = await fetch(`/status?username=${encodeURIComponent(currentUsername)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch status data');
        }
        const data = await response.json();

        // Render top 3 players
        renderTopThree(data.topUsers.slice(0, 3));

        // Render rest of the leaderboard
        renderLeaderboard(data.topUsers.slice(3, 30));

        // Show current user's position if not in top 300
        if (data.currentUserRank) {
            renderCurrentUserPosition(data.currentUserData, data.currentUserRank);
        }

    } catch (error) {
        console.error('Error fetching status:', error);
        document.querySelector('.leaderboard-container').innerHTML = 'Error loading leaderboard';
    }
});

function renderTopThree(topUsers) {
    const topThreeContainer = document.querySelector('.top-three-container');
    if (!topThreeContainer) return;

    topThreeContainer.innerHTML = '';

    // Second Place (Left)
    if (topUsers[1]) {
        const secondPlace = document.createElement('div');
        secondPlace.className = 'top-player second-place';
        secondPlace.innerHTML = `
            <div class="spusername">${topUsers[1].username}</div>
            <img src="trophy2.png" class="trophy" alt="Second Place Trophy">
            <div class="coins" title="Per Hour Profit">${formatNumber(topUsers[1].perHourProfit)} profit/hr</div>
        `;
        topThreeContainer.appendChild(secondPlace);
    }

    // First Place (Center)
    if (topUsers[0]) {
        const firstPlace = document.createElement('div');
        firstPlace.className = 'top-player first-place';
        firstPlace.innerHTML = `
            <div class="spusername">${topUsers[0].username}</div>
            <img src="trophy1.png" class="trophy" alt="First Place Trophy">
            <div class="coins" title="Per Hour Profit">${formatNumber(topUsers[0].perHourProfit)} profit/hr</div>
        `;
        topThreeContainer.appendChild(firstPlace);
    }

    // Third Place (Right)
    if (topUsers[2]) {
        const thirdPlace = document.createElement('div');
        thirdPlace.className = 'top-player third-place';
        thirdPlace.innerHTML = `
            <div class="spusername">${topUsers[2].username}</div>
            <img src="trophy3.png" class="trophy" alt="Third Place Trophy">
            <div class="coins" title="Per Hour Profit">${formatNumber(topUsers[2].perHourProfit)} profit/hr</div>
        `;
        topThreeContainer.appendChild(thirdPlace);
    }
}

function renderLeaderboard(users) {
    const leaderboardList = document.querySelector('.leaderboard-list');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = '';

    users.forEach((user, index) => {
        const rank = index + 4; // Starting from 4th place
        const listItem = document.createElement('div');
        listItem.className = 'leaderboard-item';
        listItem.innerHTML = `
            <div class="rank">#${rank}</div>
            <div class="spusername">${user.username}</div>
            <div class="coins" title="Per Hour Profit">${formatNumber(user.perHourProfit)} profit/hr</div>
        `;
        leaderboardList.appendChild(listItem);
    });
}

function renderCurrentUserPosition(userData, rank) {
    const currentUserContainer = document.querySelector('.current-user-position');
    if (!currentUserContainer) return;

    currentUserContainer.innerHTML = `
        <div class="leaderboard-item current-user">
            <div class="rank">#${rank}</div>
            <div class="spusername">${userData.username}</div>
            <div class="coins" title="Per Hour Profit">${formatNumber(userData.perHourProfit)} profit/hr</div>
        </div>
    `;
}