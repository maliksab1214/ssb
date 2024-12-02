// Replace image links with local image paths
const startup_images = [
    'image1.png',
    'image2.png',
    'image3.png'
];

const background_image = 'start.png';

// Function to check if user is on mobile
function isMobile() {
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function showLoadingAnimation(isExistingUser, username) {
    // Create the entrance container
    const entranceContainer = document.createElement('div');
    entranceContainer.className = 'entrance-container';

    // Create and add the image with different image based on user type
    const image = document.createElement('img');
    image.src = isExistingUser ? 'start.png' : 'raib.png'; // Different images for new/existing users
    image.className = 'entrance-image';
    entranceContainer.appendChild(image);

    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';

    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    // Create progress fill
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressBar.appendChild(progressFill);

    // Create progress text
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    progressText.textContent = 'Loading... 0%';

    // Add progress elements to container
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    entranceContainer.appendChild(progressContainer);

    // Add everything to the body
    document.body.appendChild(entranceContainer);

    // Handle progress animation
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 1;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Loading... ${progress}%`;

        if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                if (isExistingUser) {
                    // For existing users, redirect to main page
                    window.location.href = 'index2.html?username=' + encodeURIComponent(username);
                } else {
                    // For new users, transition to username page
                    entranceContainer.style.opacity = '0';
                    entranceContainer.style.transition = 'opacity 0.5s ease';

                    setTimeout(() => {
                        entranceContainer.remove();
                        document.body.style.backgroundImage = `url('raib.png')`;
                        document.body.style.backgroundSize = 'cover';

                        const usernameSection = document.getElementById('username-section');
                        if (usernameSection) {
                            usernameSection.style.display = 'block';
                        }
                    }, 500);
                }
            }, 200);
        }
    }, 30);
}
function validateUsername(username) {
    if (!username || username.trim() === '') {
        return {
            isValid: false,
            message: 'Username cannot be empty'
        };
    }

    const specialChars = /[+_)(*&^%$#@!]/;
    if (specialChars.test(username)) {
        return {
            isValid: false,
            message: 'Username cannot contain special characters like +_)(*&^%$#@!'
        };
    }

    if (username.length > 20) {
        return {
            isValid: false,
            message: 'Please try a shorter username (maximum 20 characters)'
        };
    }

    return {
        isValid: true,
        message: ''
    };
}

// Telegram authentication function
async function authenticateWithTelegram() {
    try {
        if (!window.Telegram.WebApp) {
            throw new Error('Telegram WebApp not initialized');
        }

        const initData = window.Telegram.WebApp.initData;
        if (!initData) {
            throw new Error('No initialization data from Telegram');
        }

        const response = await fetch('/auth/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ initData })
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const data = await response.json();
        return data.user.telegramid;
    } catch (error) {
        console.error('Telegram authentication error:', error);
        displayMessage('Authentication failed. Please try again.', 'error');
        return null;
    }
}

async function checkUser(telegramId) {
    console.log("Checking user for Telegram ID:", telegramId);

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const referralUsername = urlParams.get('ref');

        if (telegramId === '{user_id}') {
            const authenticatedUser = await authenticateWithTelegram();
            if (!authenticatedUser) {
                throw new Error('Failed to authenticate with Telegram');
            }
            telegramId = String(authenticatedUser);
        }

        const telegramIdStr = String(telegramId);
        if (!telegramIdStr || telegramIdStr.trim() === '') {
            showLoadingAnimation(false);
            return;
        }

        const response = await fetch('/users');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const users = await response.json();

        if (referralUsername) {
            const referralExists = Object.values(users).some(
                user => user.username.toLowerCase() === referralUsername.toLowerCase()
            );

            if (!referralExists) {
                console.log("Invalid referral username, ignoring referral");
            } else if (!users[telegramIdStr]) {
                localStorage.setItem('referralUsername', referralUsername);
            }
        }

        if (users[telegramIdStr]) {
            console.log("Existing user found:", users[telegramIdStr]);
            showLoadingAnimation(true, users[telegramIdStr].username);
        } else {
            console.log("New user with Telegram ID:", telegramIdStr);
            showLoadingAnimation(false);

            const usernameInput = document.getElementById('username-input');
            if (usernameInput) {
                usernameInput.dataset.telegramId = telegramIdStr;
            }
        }
    } catch (error) {
        console.error('Error in checkUser:', error);
        displayMessage('An error occurred. Please try again later.', 'error');
    }
}

// Function to submit username
async function submitUsername() {
    const username = document.getElementById('username-input').value.trim();
    const telegramId = document.getElementById('username-input').dataset.telegramId;

    const validation = validateUsername(username);
    if (!validation.isValid) {
        displayMessage(validation.message, 'error');
        return;
    }

    try {
        const response = await fetch('/users');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const users = await response.json();

        const usernameExists = Object.values(users).some(
            user => user.username.toLowerCase() === username.toLowerCase()
        );
        if (usernameExists) {
            displayMessage('This username is already in use. Please try another one.', 'error');
            return;
        }

        let finalTelegramId = telegramId;
        if (!finalTelegramId || finalTelegramId === '{user_id}') {
            const authenticatedUser = await authenticateWithTelegram();
            if (!authenticatedUser) {
                throw new Error('Failed to get Telegram ID');
            }
            finalTelegramId = String(authenticatedUser);
        }

        users[finalTelegramId] = {
            telegramid: finalTelegramId,
            username: username
        };

        const updateResponse = await fetch('/users', {
            method: 'POST',
            body: JSON.stringify(users),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update users.json');
        }

        const referralUsername = localStorage.getItem('referralUsername');
        if (referralUsername) {
            try {
                await fetch('/friends/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: referralUsername,
                        friendUsername: username
                    })
                });
                localStorage.removeItem('referralUsername');
            } catch (error) {
                console.error('Error adding friend reference:', error);
            }
        }

        displayMessage('Username saved successfully!', 'success');
        window.location.href = `index2.html?username=${encodeURIComponent(username)}`;
    } catch (error) {
        console.error('Error updating users.json:', error);
        displayMessage('An error occurred while saving your username. Please try again.', 'error');
    }
}

// Function to display messages
function displayMessage(msg, type) {
    const messageElem = document.getElementById('message');
    messageElem.innerText = msg;
    messageElem.style.padding = '10px';
    messageElem.style.margin = '10px 0';
    messageElem.style.borderRadius = '4px';

    if (type === 'error') {
        messageElem.style.backgroundColor = '#ffebee';
        messageElem.style.color = '#c62828';
        messageElem.style.border = '1px solid #ef9a9a';
    } else if (type === 'success') {
        messageElem.style.backgroundColor = '#e8f5e9';
        messageElem.style.color = '#2e7d32';
        messageElem.style.border = '1px solid #a5d6a7';
    } else {
        messageElem.style.backgroundColor = '#e3f2fd';
        messageElem.style.color = '#1565c0';
        messageElem.style.border = '1px solid #90caf9';
    }
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    const telegramId = new URLSearchParams(window.location.search).get('telegramid');
    if (!isMobile()) {
        displayMessage('You can only play this game on mobile!', 'error');
    } else {
        checkUser(telegramId);
    }
});