// tasks.js
class TasksManager {
    constructor(username) {
        this.username = username;
        this.activeTimers = {};
    }

    async loadTasks() {
        try {
            if (!this.username) {
                throw new Error('Username not provided.');
            }

            const response = await fetch(`/tasks?username=${encodeURIComponent(this.username)}`);

            if (!response.ok) {
                throw new Error('Failed to load tasks from the server.');
            }

            const tasks = await response.json();

            if (!tasks.dailyTasks || !tasks.socialMediaTasks) {
                throw new Error('Invalid task data received. Missing dailyTasks or socialMediaTasks.');
            }

            this.renderTasks(tasks.dailyTasks, 'dailyTaskList');
            this.renderTasks(tasks.socialMediaTasks, 'socialMediaTaskList');
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.displayError('Error loading tasks: ' + error.message);
        }
    }
    showCongratsModal(points) {
        const overlay = document.createElement('div');
        overlay.className = 'congrats-overlay';

        const modal = document.createElement('div');
        modal.className = 'congrats-modal';
        modal.innerHTML = `
            <h3>Congratulations! 🎉</h3>
            <p>You've successfully completed the task!</p>
            <div class="coins-earned">+${points} Coins</div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Create floating coins animation
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createFloatingCoin(modal);
            }, i * 200);
        }

        // Remove modal after 5 seconds
        setTimeout(() => {
            overlay.style.opacity = '0';
            modal.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                modal.remove();
            }, 300);
        }, 5000);
    }

    createFloatingCoin(modal) {
        const coin = document.createElement('div');
        coin.className = 'coins-animation';
        coin.textContent = '🪙';
        coin.style.left = `${Math.random() * 80 + 10}%`;
        modal.appendChild(coin);

        setTimeout(() => coin.remove(), 1000);
    }

    renderTasks(tasks, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.id = task.taskId;

            taskElement.innerHTML = `
                <div class="task-info">
                    <div class="task-details">${task.name}</div>
                </div>
                <div class="task-action">
                    <button class="points-button">${task.completed ? "Completed" : "+" + task.points}</button>
                    <button class="check-button" style="display: none;">Check</button>
                </div>
            `;

            const pointsButton = taskElement.querySelector('.points-button');
            const checkButton = taskElement.querySelector('.check-button');

            if (task.completed) {
                pointsButton.disabled = true;
                pointsButton.style.backgroundColor = '#a5a5a5';
            } else {
                pointsButton.onclick = () => this.openTask(task.url, pointsButton, checkButton, task.timer);
                checkButton.onclick = () => this.completeTask(checkButton, task.points, taskElement);
            }

            container.appendChild(taskElement);
        });
    }

    openTask(url, pointsButton, checkButton, timerDuration) {
        window.open(url, '_blank');
        pointsButton.style.display = "none";
        checkButton.style.display = "block";
        checkButton.disabled = true;

        const taskId = checkButton.closest('.task-item').id;
        let timeLeft = timerDuration;

        const timerId = setInterval(() => {
            timeLeft--;

            if (timeLeft <= 0) {
                clearInterval(timerId);
                checkButton.disabled = false;
            }
        }, 1000);

        this.activeTimers[taskId] = { timerId, endTime: Date.now() + timerDuration * 1000 };
    }

    async completeTask(checkButton, points, taskElement) {
        const taskId = taskElement.id;

        if (!this.username) {
            console.error('Username is not available');
            return;
        }

        const timer = this.activeTimers[taskId];
        if (timer) {
            clearInterval(timer.timerId);
            const timeLeft = Math.max(0, timer.endTime - Date.now());

            if (timeLeft > 0) {
                const secondsLeft = Math.ceil(timeLeft / 1000);
                alert(`Please wait ${secondsLeft} more seconds before completing the task.`);
                return;
            }

            delete this.activeTimers[taskId];
        }

        checkButton.innerText = "Completed";
        checkButton.disabled = true;
        taskElement.style.opacity = "0.5";

        try {
            const response = await fetch("/tasks/complete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    username: this.username, 
                    taskId, 
                    points 
                }),
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`Task completed: ${data.message}`);
                this.showCongratsModal(points);
                // Emit an event that the main script can listen for
                window.dispatchEvent(new CustomEvent('tasksCoinsUpdated'));
            } else {
                console.error(`Error completing task: ${data.error}`);
                this.resetTaskState(checkButton, taskElement);
            }
        } catch (error) {
            console.error('Network error:', error);
            this.resetTaskState(checkButton, taskElement);
        }
    }

    resetTaskState(checkButton, taskElement) {
        checkButton.innerText = "Check";
        checkButton.disabled = false;
        taskElement.style.opacity = "1";
    }

    displayError(message) {
        console.error(message);
        // You can implement your error display logic here
    }
}

// Export the TasksManager class
window.TasksManager = TasksManager;