class WordGame {
    constructor(username) {
        this.username = username;
        this.words = null;
        this.gameState = null;
        this.correctOrder = null;
        this.init();
    }

    async init() {
        try {
            await Promise.all([
                this.loadWords(),
                this.fetchGameState()
            ]);
            this.setupGame();
            this.setupEventListeners();
            this.updateGameStateUI();
        } catch (error) {
            console.error('Error initializing game:', error);
            this.showMessage('Failed to initialize game', 'error');
        }
    }

    async loadWords() {
        try {
            const response = await fetch('/words.json');
            if (!response.ok) {
                throw new Error('Failed to fetch words.json');
            }
            this.words = await response.json();
            if (!this.words.wordsraw1 || !this.words.wordsraw2) {
                throw new Error('Invalid words.json format');
            }

            // Sort the correct order by length for each column
            this.correctOrder = {
                left: [...this.words.wordsraw1].sort((a, b) => a.length - b.length),
                right: [...this.words.wordsraw2].sort((a, b) => a.length - b.length)
            };
        } catch (error) {
            console.error('Error loading words:', error);
            this.words = {
                wordsraw1: ['cat', 'book', 'phone', 'window', 'computer', 'adventure'],
                wordsraw2: ['dog', 'desk', 'chair', 'pencil', 'monitor', 'keyboard']
            };
            this.correctOrder = {
                left: ['cat', 'book', 'phone', 'window', 'computer', 'adventure'],
                right: ['dog', 'desk', 'chair', 'pencil', 'monitor', 'keyboard']
            };
        }
    }

    async fetchGameState() {
        try {
            const response = await fetch(`/game?username=${encodeURIComponent(this.username)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch game state');
            }
            this.gameState = await response.json();
        } catch (error) {
            console.error('Error fetching game state:', error);
            this.gameState = {
                Retry: 3,
                rpcoins: 1000000,
                collected: false,
                banned: false
            };
        }
    }

    async updateGameState(success) {
        try {
            const response = await fetch('/game/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.username,
                    success: success
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update game state');
            }

            this.gameState = await response.json();
            this.updateGameStateUI();
        } catch (error) {
            console.error('Error updating game state:', error);
        }
    }

    setupGame() {
        if (!this.words) {
            console.error('Words not loaded');
            return;
        }

        const gameGrid = document.querySelector('.game-grid');
        gameGrid.innerHTML = `
            <div class="grid-column" id="leftColumn">
                ${Array.from({length: 6}, (_, i) => `
                    <div class="word-slot">
                        <div class="slot-number">${i + 1}</div>
                        <div class="word-box" draggable="true" data-slot="${i}" data-column="left"></div>
                    </div>
                `).join('')}
            </div>
            <div class="grid-column" id="rightColumn">
                ${Array.from({length: 6}, (_, i) => `
                    <div class="word-slot">
                        <div class="slot-number">${i + 7}</div>
                        <div class="word-box" draggable="true" data-slot="${i}" data-column="right"></div>
                    </div>
                `).join('')}
            </div>
        `;

        // Combine and shuffle all words
        const allWords = [...this.words.wordsraw1, ...this.words.wordsraw2];
        const shuffledWords = this.shuffleArray(allWords);

        // Distribute shuffled words to boxes
        const wordBoxes = document.querySelectorAll('.word-box');
        wordBoxes.forEach((box, index) => {
            box.textContent = shuffledWords[index];
            box.setAttribute('data-word', shuffledWords[index]);
        });
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    setupEventListeners() {
        const wordBoxes = document.querySelectorAll('.word-box');
        let draggedElement = null;

        wordBoxes.forEach(box => {
            box.addEventListener('dragstart', (e) => {
                draggedElement = box;
                box.classList.add('dragging');
                e.dataTransfer.setData('text/plain', box.getAttribute('data-word'));
            });

            box.addEventListener('dragend', () => {
                box.classList.remove('dragging');
                draggedElement = null;
                document.querySelectorAll('.word-box').forEach(box => {
                    box.classList.remove('drag-over');
                });
            });

            box.addEventListener('dragover', (e) => {
                e.preventDefault();
                box.classList.add('drag-over');
            });

            box.addEventListener('dragleave', () => {
                box.classList.remove('drag-over');
            });

            box.addEventListener('drop', (e) => {
                e.preventDefault();
                box.classList.remove('drag-over');

                if (draggedElement && box !== draggedElement) {
                    // Swap the content and data attributes
                    const tempWord = box.getAttribute('data-word');
                    const tempText = box.textContent;

                    box.textContent = draggedElement.textContent;
                    box.setAttribute('data-word', draggedElement.getAttribute('data-word'));

                    draggedElement.textContent = tempText;
                    draggedElement.setAttribute('data-word', tempWord);
                }
            });
        });

        const checkButton = document.getElementById('checkButton');
        if (checkButton) {
            checkButton.addEventListener('click', () => this.checkAnswer());
        }
    }

    updateGameStateUI() {
        const container = document.querySelector('.reddit-game-container');
        const retriesEl = document.getElementById('retriesCount');
        const rpCoinsEl = document.getElementById('rpCoins');

        if (this.gameState.collected) {
            container.classList.add('game-collected');
            container.classList.remove('game-banned');
        } else if (this.gameState.banned) {
            container.classList.add('game-banned');
            container.classList.remove('game-collected');
        } else {
            container.classList.remove('game-collected', 'game-banned');
        }

        if (retriesEl) retriesEl.textContent = this.gameState.Retry;
        if (rpCoinsEl) rpCoinsEl.textContent = this.gameState.rpcoins.toLocaleString();
    }

    async checkAnswer() {
        if (this.gameState.Retry <= 0 || this.gameState.banned || this.gameState.collected) {
            return;
        }

        // Get current words in left column
        const leftWords = Array.from(document.querySelectorAll('#leftColumn .word-box'))
            .map(box => box.getAttribute('data-word'));

        // Get current words in right column
        const rightWords = Array.from(document.querySelectorAll('#rightColumn .word-box'))
            .map(box => box.getAttribute('data-word'));

        // Check if the words are in correct columns
        const leftCorrect = this.areWordsInCorrectOrder(leftWords, this.words.wordsraw1);
        const rightCorrect = this.areWordsInCorrectOrder(rightWords, this.words.wordsraw2);

        const isCorrect = leftCorrect && rightCorrect;

        await this.updateGameState(isCorrect);

        if (isCorrect) {
            this.showMessage('Congratulations! You won RP Coins!', 'success');
        } else {
            this.showMessage('Wrong answer. Try again!', 'error');
        }
    }

    areWordsInCorrectOrder(currentWords, targetWordList) {
        // Check if all words are from the correct list
        const allWordsFromCorrectList = currentWords.every(word => 
            targetWordList.includes(word)
        );

        if (!allWordsFromCorrectList) {
            return false;
        }

        // Check if words are arranged by length
        for (let i = 0; i < currentWords.length - 1; i++) {
            if (currentWords[i].length > currentWords[i + 1].length) {
                return false;
            }
        }

        return true;
    }

     showMessage(text, type) {
            // Remove any existing messages first
            const existingMessages = document.querySelectorAll('.game-message');
            existingMessages.forEach(msg => msg.remove());

            const messageEl = document.createElement('div');
            messageEl.className = `game-message ${type}`;
            messageEl.textContent = text;

            // Styling for message interface
            messageEl.style.position = 'fixed';
            messageEl.style.top = '50%';
            messageEl.style.left = '50%';
            messageEl.style.transform = 'translate(-50%, -50%)';
            messageEl.style.backgroundColor = type === 'success' ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
            messageEl.style.color = 'white';
            messageEl.style.padding = '20px 40px';
            messageEl.style.borderRadius = '12px';
            messageEl.style.zIndex = '1000';
            messageEl.style.textAlign = 'center';
            messageEl.style.fontSize = '1.2em';
            messageEl.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

            document.body.appendChild(messageEl);

            // Different timing for success and error
            const duration = type === 'success' ? 3000 : 1000;

            // Add celebration effect for success
            if (type === 'success') {
                this.addCelebrationEffect(messageEl);
            }

            setTimeout(() => {
                messageEl.remove();
            }, duration);
        }

        addCelebrationEffect(messageEl) {
            // Create celebration confetti
            const createConfetti = () => {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.borderRadius = '50%';
                confetti.style.backgroundColor = this.getRandomColor();
                confetti.style.top = '-10px';
                confetti.style.left = `${Math.random() * window.innerWidth}px`;
                confetti.style.zIndex = '999';

                document.body.appendChild(confetti);

                // Animate confetti
                const animation = confetti.animate([
                    { transform: 'translateY(0px)', opacity: 1 },
                    { transform: `translateY(${window.innerHeight + 100}px)`, opacity: 0 }
                ], {
                    duration: 3000,
                    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)'
                });

                animation.onfinish = () => {
                    confetti.remove();
                };
            };

            // Create multiple confetti pieces
            for (let i = 0; i < 50; i++) {
                createConfetti();
            }

            // Add pulsing effect to message
            messageEl.style.animation = 'pulse 0.5s infinite alternate';
            messageEl.style.transformOrigin = 'center';
        }

        getRandomColor() {
            const colors = ['#00ff9d', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#0000ff'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    }

    // Add CSS for pulse animation
    const style = document.createElement('style');
    style.textContent = `
    @keyframes pulse {
        from {
            transform: scale(1);
        }
        to {
            transform: scale(1.1);
        }
    }

    .game-message {
        transition: all 0.3s ease;
    }
    `;
    document.head.appendChild(style);

// Initialize the game
if (typeof window !== 'undefined') {
    window.initGame = (username) => {
        return new WordGame(username);
    };
}