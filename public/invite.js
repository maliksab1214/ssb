// invite.js
class FriendsManager {
    constructor(username) {
        this.username = username;
        this.initialize();
    }

    initialize() {
        const leaderboardContainer = document.querySelector('.leaderboard-container');
        if (!leaderboardContainer) return;

        const friendsButton = document.createElement('button');
        friendsButton.className = 'friends-button';
        friendsButton.textContent = 'Friends';
        friendsButton.onclick = () => this.showFriendsModal();
        leaderboardContainer.insertBefore(friendsButton, leaderboardContainer.firstChild);

        this.createModalElements();
    }

    createModalElements() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.className = 'friends-modal';
        modal.innerHTML = `
            <div class="friends-modal-header">
                <div class="friends-modal-title">
                    Friends List
                    <span class="total-friends">0</span>
                </div>
                <button class="close-friends-modal">×</button>
            </div>
            <div class="friends-list"></div>
            <div class="invite-section">
                <div class="invite-url"></div>
                <button class="copy-invite-button">Copy Invite Link</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeButton = modal.querySelector('.close-friends-modal');
        closeButton.onclick = () => this.hideFriendsModal();
        overlay.onclick = () => this.hideFriendsModal();

        const copyButton = modal.querySelector('.copy-invite-button');
        copyButton.onclick = () => this.copyInviteLink();

        this.modal = modal;
        this.overlay = overlay;
    }

    async showFriendsModal() {
        try {
            const response = await fetch(`/friends?username=${encodeURIComponent(this.username)}`);
            if (!response.ok) throw new Error('Failed to fetch friends data');

            const data = await response.json();
            this.updateTotalFriends(Object.keys(data.friends).length);
            await this.renderFriendsList(data.friends);
            this.updateInviteLink();

            this.modal.style.display = 'block';
            this.overlay.style.display = 'block';
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    }

    hideFriendsModal() {
        this.modal.style.display = 'none';
        this.overlay.style.display = 'none';
    }

    updateTotalFriends(count) {
        const totalFriendsElement = this.modal.querySelector('.total-friends');
        totalFriendsElement.textContent = count.toString();
    }
    async renderFriendsList(friends) {
        const friendsList = this.modal.querySelector('.friends-list');
        friendsList.innerHTML = '';

        for (const [friendName, friendData] of Object.entries(friends)) {
            const friendCard = document.createElement('div');
            friendCard.className = 'friend-card';
            friendCard.innerHTML = `
                <div class="friend-info">
                    <div class="friend-skin">
                        <img src="${friendData.skinPath}" alt="Player Skin">
                    </div>
                    <div class="friend-details">
                        <div class="friend-name">${friendName}</div>
                        <div class="friend-coins">
                            <img src="images/coins.png" alt="Coins">
                            ${friendData.coins || 0}
                        </div>
                    </div>
                </div>
            `;
            friendsList.appendChild(friendCard);
        }
    }

    updateInviteLink() {
        const inviteUrl = `https://t.me/PantherPNTR_bot?start=ref=${encodeURIComponent(this.username)}`;
        const inviteUrlElement = this.modal.querySelector('.invite-url');
        inviteUrlElement.textContent = inviteUrl;
    }

    async copyInviteLink() {
        const inviteUrl = `https://t.me/PantherPNTR_bot?start=ref=${encodeURIComponent(this.username)}`;
        try {
            await navigator.clipboard.writeText(inviteUrl);

            const copyButton = this.modal.querySelector('.copy-invite-button');
            copyButton.classList.add('copied', 'copy-feedback');
            copyButton.textContent = 'Copied!';

            setTimeout(() => {
                copyButton.classList.remove('copied', 'copy-feedback');
                copyButton.textContent = 'Copy Invite Link';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy invite link:', error);
        }
    }
}

window.addEventListener('statusInit', (event) => {
    const friendsManager = new FriendsManager(event.detail.username);
});