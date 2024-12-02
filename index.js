const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const axios = require("axios");
const AdvancedAutoRecharge = require('./advancedAutoRecharge.js');
const ProfitManager = require('./profitManager');
const spinDataDir = path.join(__dirname, 'data');
const autoRecharge = new AdvancedAutoRecharge(spinDataDir);
autoRecharge.start();
const profitManager = new ProfitManager();
profitManager.start();

const app = express();


// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Ensure 'userdata' directory exists
const userdataDir = path.join(__dirname, 'userdata');
if (!fs.existsSync(userdataDir)) {
    fs.mkdirSync(userdataDir, { recursive: true });
    console.log("'userdata' directory created.");
}

// Route to get coins for a user
app.get("/coins", (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const userDir = path.join(userdataDir, username);
    const coinsFilePath = path.join(userDir, 'coins.txt');

    // Check if user directory exists; if not, create it
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log(`User directory created for ${username}.`);
    }

    // Check if coins.txt exists; if not, create it with 0
    if (!fs.existsSync(coinsFilePath)) {
        fs.writeFileSync(coinsFilePath, '0', 'utf8');
        console.log(`coins.txt created for ${username} with initial value 0.`);
    }

    // Read the coins value
    fs.readFile(coinsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading coins for user ${username}:`, err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        const coins = Number(data.trim()) || 0;
        res.json({ coins });
    });
});
app.get("/users", (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'users.json'), 'utf8', (err, data) => {
      if (err) {
          console.error("Error reading users.json:", err);
          return res.status(500).json({ error: "Internal Server Error" });
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
  });
});

// Route to update users.json
app.post("/users", (req, res) => {
  const updatedUsers = req.body;

  // Server-side validation
  if (typeof updatedUsers !== 'object' || Array.isArray(updatedUsers)) {
      return res.status(400).json({ error: "Invalid data format" });
  }

  // Read existing users to identify new users
  fs.readFile(path.join(__dirname, 'public', 'users.json'), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { // Allow ENOENT if users.json doesn't exist yet
          console.error("Error reading users.json:", err);
          return res.status(500).json({ error: "Internal Server Error" });
      }

      let existingUsers = {};
      if (data) {
          try {
              existingUsers = JSON.parse(data);
          } catch (parseErr) {
              console.error("Error parsing users.json:", parseErr);
              return res.status(500).json({ error: "Internal Server Error" });
          }
      }

      // Identify new users
      const newUsers = Object.keys(updatedUsers).filter(user => !existingUsers[user]);

      // Initialize userdata for new users
      newUsers.forEach(username => {
          const userDir = path.join(userdataDir, username);
          const coinsFilePath = path.join(userDir, 'coins.txt');

          if (!fs.existsSync(userDir)) {
              fs.mkdirSync(userDir, { recursive: true });
              console.log(`User directory created for ${username}.`);
          }

          if (!fs.existsSync(coinsFilePath)) {
              fs.writeFileSync(coinsFilePath, '0', 'utf8');
              console.log(`coins.txt created for new user ${username} with initial value 0.`);
          }
      });

      // Now, write the updated users.json
      fs.writeFile(path.join(__dirname, 'public', 'users.json'), JSON.stringify(updatedUsers, null, 2), 'utf8', (writeErr) => {
          if (writeErr) {
              console.error("Error writing to users.json:", writeErr);
              return res.status(500).json({ error: "Internal Server Error" });
          }
          res.json({ status: "success" });
      });
  });
});
// Route to increase coins for a user
app.post("/coins/increase", (req, res) => {
    const { username, amount } = req.body;

    if (!username || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Valid username and amount are required" });
    }

    const userDir = path.join(userdataDir, username);
    const coinsFilePath = path.join(userDir, 'coins.txt');

    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log(`User directory created for ${username}.`);
    }

    // Check if coins.txt exists; if not, create it with 0
    if (!fs.existsSync(coinsFilePath)) {
        fs.writeFileSync(coinsFilePath, '0', 'utf8');
        console.log(`coins.txt created for ${username} with initial value 0.`);
    }

    // Read current coins
    fs.readFile(coinsFilePath, 'utf8', (readErr, data) => {
        if (readErr) {
            console.error(`Error reading coins for user ${username}:`, readErr);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        let currentCoins = Number(data.trim()) || 0;
        let newCoins = currentCoins + amount;

        // Write updated coins
        fs.writeFile(coinsFilePath, newCoins.toString(), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error(`Error writing coins for user ${username}:`, writeErr);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            res.json({ status: "success", coins: newCoins });
        });
    });
});

// Optional: Route to decrease coins for a user
app.post("/coins/decrease", (req, res) => {
    const { username, amount } = req.body;

    if (!username || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Valid username and amount are required" });
    }

    const userDir = path.join(userdataDir, username);
    const coinsFilePath = path.join(userDir, 'coins.txt');

    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log(`User directory created for ${username}.`);
    }

    // Check if coins.txt exists; if not, create it with 0
    if (!fs.existsSync(coinsFilePath)) {
        fs.writeFileSync(coinsFilePath, '0', 'utf8');
        console.log(`coins.txt created for ${username} with initial value 0.`);
    }

    // Read current coins
    fs.readFile(coinsFilePath, 'utf8', (readErr, data) => {
        if (readErr) {
            console.error(`Error reading coins for user ${username}:`, readErr);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        let currentCoins = Number(data.trim()) || 0;
        let newCoins = currentCoins - amount;

        if (newCoins < 0) newCoins = 0; // Prevent negative coins

        // Write updated coins
        fs.writeFile(coinsFilePath, newCoins.toString(), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error(`Error writing coins for user ${username}:`, writeErr);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            res.json({ status: "success", coins: newCoins });
        });
    });
});

app.use(express.static('public'));

// Define the /tasks endpoint to fetch task data from user-specific file
const defaultTasksPath = path.join(__dirname, 'tasks.json');

app.get('/tasks', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    const userTasksDir = path.join(__dirname, 'tasks', username);
    const userTasksFile = path.join(userTasksDir, 'tasks.json');

    fs.mkdir(userTasksDir, { recursive: true }, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to create user tasks directory.' });
        }

        fs.readFile(userTasksFile, 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log('tasks.json not found for user, copying default...');
                    fs.copyFile(defaultTasksPath, userTasksFile, (copyErr) => {
                        if (copyErr) {
                            return res.status(500).json({ error: 'Failed to copy default tasks.json.' });
                        }
                        readTasksFile(userTasksFile, res);
                    });
                } else {
                    return res.status(500).json({ error: 'Error reading tasks file.' });
                }
            } else {
                readTasksFile(userTasksFile, res, data);
            }
        });
    });
});

function readTasksFile(userTasksFile, res, data) {
    if (!data) {
        fs.readFile(userTasksFile, 'utf8', (err, newData) => {
            if (err) {
                return res.status(500).json({ error: 'Error reading tasks data.' });
            }
            return sendTasksData(newData, res);
        });
    } else {
        sendTasksData(data, res);
    }
}

// Modify the sendTasksData function in index.js
function sendTasksData(data, res) {
    try {
        const tasks = JSON.parse(data);

        // Add friendsTasks section if not exists
        if (!tasks.friendsTasks) {
            tasks.friendsTasks = [];
        }

        // Add previousTasks section if not exists
        if (!tasks.previousTasks) {
            tasks.previousTasks = [];
        }

        // Ensure each task has a timer property
        ['dailyTasks', 'socialMediaTasks', 'friendsTasks', 'previousTasks'].forEach(taskType => {
            if (tasks[taskType]) {
                tasks[taskType].forEach(task => {
                    // Remove timer for friendsTasks and previousTasks
                    if (taskType === 'friendsTasks' || taskType === 'previousTasks') {
                        delete task.timer;
                    } else if (!task.hasOwnProperty('timer')) {
                        task.timer = 180; // Default timer value if not set
                    }
                });
            }
        });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error parsing tasks data.' });
    }
}

// Add a new route to check friends task completion
app.get('/tasks/check-friends-task', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    const friendsFilePath = path.join(__dirname, 'data', username, 'friends.json');
    const userTasksFile = path.join(__dirname, 'tasks', username, 'tasks.json');

    // Read friends data
    fs.readFile(friendsFilePath, 'utf8', (friendsErr, friendsData) => {
        if (friendsErr) {
            return res.status(500).json({ error: 'Error reading friends file.' });
        }

        try {
            const friendsInfo = JSON.parse(friendsData);
            const totalFriends = friendsInfo.totalFriends || 0;

            // Read tasks data
            fs.readFile(userTasksFile, 'utf8', (tasksErr, tasksData) => {
                if (tasksErr) {
                    return res.status(500).json({ error: 'Error reading tasks file.' });
                }

                try {
                    const tasks = JSON.parse(tasksData);

                    // Find friends task
                    const friendsTask = tasks.friendsTasks.find(task => task.taskId === 'friends-task');

                    if (friendsTask) {
                        // Check if friends task can be completed
                        if (totalFriends >= 3) {
                            friendsTask.completed = true;
                        }
                    }

                    // Write updated tasks back to file
                    fs.writeFile(userTasksFile, JSON.stringify(tasks, null, 2), 'utf8', (writeErr) => {
                        if (writeErr) {
                            return res.status(500).json({ error: 'Error updating tasks file.' });
                        }

                        res.json({ 
                            totalFriends, 
                            friendsTaskStatus: friendsTask 
                        });
                    });
                } catch (parseError) {
                    res.status(500).json({ error: 'Error parsing tasks data.' });
                }
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Error parsing friends data.' });
        }
    });
});

app.post('/tasks/complete', (req, res) => {
    const { username, taskId, points } = req.body;

    if (!username || !taskId || typeof points !== 'number') {
        return res.status(400).json({ error: 'Username, taskId, and points are required.' });
    }

    const userTasksDir = path.join(__dirname, 'tasks', username);
    const userTasksFile = path.join(userTasksDir, 'tasks.json');
    const userCoinsFile = path.join(userdataDir, username, 'coins.txt');

    // Read and update tasks
    fs.readFile(userTasksFile, 'utf8', (err, taskData) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading tasks file.' });
        }

        try {
            const tasks = JSON.parse(taskData);
            let taskUpdated = false;

            ['dailyTasks', 'socialMediaTasks'].forEach(taskType => {
                const taskIndex = tasks[taskType].findIndex(task => task.taskId === taskId);
                if (taskIndex !== -1) {
                    tasks[taskType][taskIndex].completed = true;
                    taskUpdated = true;
                }
            });

            if (!taskUpdated) {
                return res.status(404).json({ error: 'Task not found.' });
            }

            // Update tasks file
            fs.writeFile(userTasksFile, JSON.stringify(tasks, null, 2), 'utf8', (writeErr) => {
                if (writeErr) {
                    return res.status(500).json({ error: 'Error updating tasks file.' });
                }

                // Update coins
                fs.readFile(userCoinsFile, 'utf8', (readErr, coinData) => {
                    if (readErr) {
                        return res.status(500).json({ error: 'Error reading coins file.' });
                    }

                    let currentCoins = Number(coinData.trim()) || 0;
                    let newCoins = currentCoins + points;

                    fs.writeFile(userCoinsFile, newCoins.toString(), 'utf8', (coinWriteErr) => {
                        if (coinWriteErr) {
                            return res.status(500).json({ error: 'Error updating coins file.' });
                        }
                        res.json({ status: 'success', message: 'Task marked as completed and coins updated.', newCoins });
                    });
                });
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Error parsing tasks data.' });
        }
    });
});

const defaultSkins = {
    "defaultSkin": "default",
    "skins": {
        "default": {
            "id": "default",
            "name": "Default Skin",
            "path": "images/logo1.png",
            "thumbnail": "images/logo1.png",
            "description": "The classic default skin"
        },
        "skin2": {
            "id": "skin2",
            "name": "Skin 2",
            "path": "images/2.png",
            "thumbnail": "images/2.png",
            "description": "Skin gives 20% power boost"
        },
        "skin3": {
            "id": "skin3",
            "name": "Skin 3",
            "path": "images/3.png",
            "thumbnail": "images/3.png",
            "description": "Increases mining efficiency by 15%"
        },
        "skin4": {
            "id": "skin4",
            "name": "Skin 4",
            "path": "images/4.png",
            "thumbnail": "images/4.png",
            "description": "Enhances battery life by 25%"
        },
        "skin5": {
            "id": "skin5",
            "name": "Skin 5",
            "path": "images/5.png",
            "thumbnail": "images/5.png",
            "description": "Boosts coin generation by 30%"
        },
        "skin6": {
            "id": "skin6",
            "name": "Skin 6",
            "path": "images/6.png",
            "thumbnail": "images/6.png",
            "description": "Provides 40% faster recharge rate"
        },
        "skin7": {
            "id": "skin7",
            "name": "Skin 7",
            "path": "images/7.png",
            "thumbnail": "images/7.png",
            "description": "Double tap coins bonus"
        },
        "skin8": {
            "id": "skin8",
            "name": "Skin 8",
            "path": "images/8.png",
            "thumbnail": "images/8.png",
            "description": "Ultimate skin with 50% all stats boost"
        },
        "skin9": {
            "id": "skin9",
            "name": "Skin 9",
            "path": "images/9.png",
            "thumbnail": "images/9.png",
            "description": "Spin Luck 20%"
        },
        "skin10": {
            "id": "skin10",
            "name": "Skin 10",
            "path": "images/10.png",
            "thumbnail": "images/10.png",
            "description": "Bettry Recharge 5% faster"
        },
        "skin11": {
            "id": "skin11",
            "name": "Skin 11",
            "path": "images/11.png",
            "thumbnail": "images/11.png",
            "description": "Mining upgrads 5%"
        },
        "skin12": {
            "id": "skin12",
            "name": "Skin 12",
            "path": "images/12.png",
            "thumbnail": "images/12.png",
            "description": "Spin Luck 40%"
        },
        "skin13": {
            "id": "skin13",
            "name": "Skin 13",
            "path": "images/13.png",
            "thumbnail": "images/13.png",
            "description": "More Coins On Freinds Invitaion"
        },
        "skin14": {
            "id": "skin14",
            "name": "Skin 14",
            "path": "images/14.png",
            "thumbnail": "images/14.png",
            "description": "Cards Upgrading Discount"
        },
        "skin15": {
            "id": "skin15",
            "name": "Skin 15",
            "path": "images/15.png",
            "thumbnail": "images/15.png",
            "description": "faster 5% perhourprofit"
        }
    }
};

// Modified skins route with level checking
app.get('/skins', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const skinsFilePath = path.join(__dirname, 'data', username, 'skins.json');
    const levelsFilePath = path.join(__dirname, 'data', username, 'levels.json');

    try {
        // Ensure directory exists
        if (!fs.existsSync(path.dirname(skinsFilePath))) {
            fs.mkdirSync(path.dirname(skinsFilePath), { recursive: true });
        }

        // Read levels data
        let currentLevel = 1;
        if (fs.existsSync(levelsFilePath)) {
            const levelsData = JSON.parse(fs.readFileSync(levelsFilePath, 'utf8'));
            currentLevel = levelsData.currentLevel || 1;
        }

        // If skins.json doesn't exist, create it with default data
        if (!fs.existsSync(skinsFilePath)) {
            fs.writeFileSync(skinsFilePath, JSON.stringify(defaultSkins, null, 2));
            console.log(`Created new skins.json for user ${username} with default skins`);
        }

        // Read and modify the skins data based on level
        const skinsData = JSON.parse(fs.readFileSync(skinsFilePath, 'utf8'));

        // Add locked status to each skin based on level
        Object.keys(skinsData.skins).forEach((skinId, index) => {
            const requiredLevel = index + 1; // First skin requires level 1, second requires level 2, etc.
            skinsData.skins[skinId].locked = currentLevel < requiredLevel;
            skinsData.skins[skinId].requiredLevel = requiredLevel;
        });

        res.json(skinsData);
    } catch (error) {
        console.error('Error handling skins data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Modified update default skin route to check if skin is unlocked
app.post('/update-default-skin', (req, res) => {
    const { username, skinId } = req.body;

    if (!username || !skinId) {
        return res.status(400).json({ error: 'Username and skinId are required' });
    }

    const skinsFilePath = path.join(__dirname, 'data', username, 'skins.json');
    const levelsFilePath = path.join(__dirname, 'data', username, 'levels.json');

    try {
        // Check if skin is unlocked based on level
        const levelsData = JSON.parse(fs.readFileSync(levelsFilePath, 'utf8'));
        const currentLevel = levelsData.currentLevel || 1;

        // Get skin index (0-based) from skinId (e.g., "skin2" -> 1)
        const skinIndex = parseInt(skinId.replace('skin', '')) || 0;
        const requiredLevel = skinIndex || 1; // Default skin (index 0) requires level 1

        if (currentLevel < requiredLevel) {
            return res.status(403).json({ 
                error: 'Skin is locked',
                message: `This skin requires level ${requiredLevel} to use`
            });
        }

        // Rest of the update logic remains the same
        let skinsData;
        if (!fs.existsSync(skinsFilePath)) {
            skinsData = { ...defaultSkins };
        } else {
            skinsData = JSON.parse(fs.readFileSync(skinsFilePath, 'utf8'));
        }

        skinsData.defaultSkin = skinId;
        fs.writeFileSync(skinsFilePath, JSON.stringify(skinsData, null, 2));
        res.json({ success: true, message: 'Default skin updated successfully' });
    } catch (error) {
        console.error('Error updating default skin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/spin', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const spinFilePath = path.join(spinDataDir, username, 'spin.json');

    try {
        // Ensure directory exists
        if (!fs.existsSync(path.dirname(spinFilePath))) {
            fs.mkdirSync(path.dirname(spinFilePath), { recursive: true });
        }

        let spinData;
        const currentDate = new Date().toISOString().split('T')[0];
        let ticketsCollected = false;

        // If spin.json doesn't exist, create it with initial data
        if (!fs.existsSync(spinFilePath)) {
            spinData = {
                spin: {
                    current_date: currentDate,
                    collected_date: currentDate,
                    spintickets: 3,
                    notification: {
                        show: false,
                        message: "Welcome! You received 3 spin tickets!"
                    }
                }
            };
            ticketsCollected = false;
            fs.writeFileSync(spinFilePath, JSON.stringify(spinData, null, 2));
            console.log(`Created new spin.json for user ${username} with 3 initial tickets`);
        } else {
            // Read existing spin data
            spinData = JSON.parse(fs.readFileSync(spinFilePath, 'utf8'));

            // Update current_date
            spinData.spin.current_date = currentDate;

            // Check if user should get new tickets
            if (currentDate !== spinData.spin.collected_date) {
                spinData.spin.spintickets += 3;
                spinData.spin.collected_date = currentDate;
                spinData.spin.notification = {
                    show: true,
                    message: "Congratulations! You received 3 daily spin tickets!"
                };
                ticketsCollected = true;
            } else {
                // Reset notification if no new tickets
                spinData.spin.notification = {
                    show: false,
                    message: ""
                };
            }

            fs.writeFileSync(spinFilePath, JSON.stringify(spinData, null, 2));
            if (ticketsCollected) {
                console.log(`Added 3 daily tickets for user ${username}`);
            }
        }

        res.json(spinData.spin);
    } catch (error) {
        console.error('Error handling spin data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/spin/claim', async (req, res) => {
    const { username, reward } = req.body;

    if (!username || !reward) {
        return res.status(400).json({ error: 'Username and reward are required' });
    }

    const spinFilePath = path.join(spinDataDir, username, 'spin.json');

    try {
        // If spin.json doesn't exist, create it first
        if (!fs.existsSync(spinFilePath)) {
            const currentDate = new Date().toISOString().split('T')[0];
            const initialSpinData = {
                spin: {
                    current_date: currentDate,
                    collected_date: currentDate,
                    spintickets: 3
                }
            };
            fs.writeFileSync(spinFilePath, JSON.stringify(initialSpinData, null, 2));
            console.log(`Created new spin.json for user ${username} during claim`);
        }

        // Read spin data
        const spinData = JSON.parse(fs.readFileSync(spinFilePath, 'utf8'));

        if (spinData.spin.spintickets < 1) {
            return res.status(400).json({ error: 'No tickets available' });
        }

        // Decrease tickets
        spinData.spin.spintickets--;

        // Save updated spin data
        fs.writeFileSync(spinFilePath, JSON.stringify(spinData, null, 2));

        // Increase user's coins
        const userCoinsPath = path.join(userdataDir, username, 'coins.txt');
        const currentCoins = Number(fs.readFileSync(userCoinsPath, 'utf8')) || 0;
        fs.writeFileSync(userCoinsPath, (currentCoins + reward).toString());

        res.json({
            status: 'success',
            message: `Successfully claimed ${reward} coins`,
            spinData: spinData.spin
        });
    } catch (error) {
        console.error('Error processing spin claim:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add this route to index.js (server-side)
app.get("/tickets", (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const spinsFilePath = path.join(__dirname, 'data', username, 'spin.json');

    // Check if spins.json exists; if not, create it with default values
    if (!fs.existsSync(path.join(__dirname, 'data', username))) {
        fs.mkdirSync(path.join(__dirname, 'data', username), { recursive: true });
    }

    if (!fs.existsSync(spinsFilePath)) {
        const defaultSpinsData = {
            "spin": {
                "current_date": new Date().toISOString().split('T')[0],
                "collected_date": new Date().toISOString().split('T')[0],
                "spintickets": 3,
                "notification": {
                    "show": true,
                    "message": ""
                }
            }
        };
        fs.writeFileSync(spinsFilePath, JSON.stringify(defaultSpinsData, null, 2));
    }

    // Read the spins data
    fs.readFile(spinsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading tickets for user ${username}:`, err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        try {
            const spinsData = JSON.parse(data);
            res.json({ tickets: spinsData.spin.spintickets });
        } catch (parseErr) {
            console.error(`Error parsing spins data for user ${username}:`, parseErr);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });
});
app.get('/rewards', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const rewardsFilePath = path.join(__dirname, 'data', username, 'rewards.json');

    try {
        // Ensure directory exists
        if (!fs.existsSync(path.dirname(rewardsFilePath))) {
            fs.mkdirSync(path.dirname(rewardsFilePath), { recursive: true });
        }

        let rewardsData;
        const currentDate = new Date().toISOString().split('T')[0];

        // If rewards.json doesn't exist, create it with initial data
        if (!fs.existsSync(rewardsFilePath)) {
            rewardsData = {
                currentDate,
                collectedDate: '',
                currentDay: 1,
                collected: false
            };
            fs.writeFileSync(rewardsFilePath, JSON.stringify(rewardsData, null, 2));
        } else {
            // Read existing rewards data
            rewardsData = JSON.parse(fs.readFileSync(rewardsFilePath, 'utf8'));

            // Calculate days difference between current date and collected date
            const daysDifference = getDaysDifference(rewardsData.collectedDate, currentDate);

            // If more than 1 day has passed since last collection, reset to day 1
            if (daysDifference > 1) {
                rewardsData.currentDay = 1;
                rewardsData.collected = false;
            }
            // If exactly 1 day has passed and previous reward was collected
            else if (daysDifference === 1 && rewardsData.collected) {
                rewardsData.currentDay = rewardsData.currentDay === 7 ? 1 : rewardsData.currentDay + 1;
                rewardsData.collected = false;
            }

            rewardsData.currentDate = currentDate;
            fs.writeFileSync(rewardsFilePath, JSON.stringify(rewardsData, null, 2));
        }

        res.json(rewardsData);
    } catch (error) {
        console.error('Error handling rewards data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to calculate days difference between two dates
function getDaysDifference(date1, date2) {
    if (!date1) return 0;

    const d1 = new Date(date1);
    const d2 = new Date(date2);

    // Reset hours to midnight for accurate day calculation
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

app.post('/rewards/claim', async (req, res) => {
    const { username, day } = req.body;

    if (!username || !day) {
        return res.status(400).json({ error: 'Username and day are required' });
    }

    const rewardsFilePath = path.join(__dirname, 'data', username, 'rewards.json');
    const rewardAmounts = {
        1: 5000,
        2: 15000,
        3: 30000,
        4: 60000,
        5: 80000,
        6: 100000,
        7: 150000
    };

    try {
        // Read rewards data
        const rewardsData = JSON.parse(fs.readFileSync(rewardsFilePath, 'utf8'));
        const currentDate = new Date().toISOString().split('T')[0];

        if (rewardsData.collected || day !== rewardsData.currentDay) {
            return res.status(400).json({ error: 'Reward already collected or invalid day' });
        }

        // Mark as collected and update dates
        rewardsData.collected = true;
        rewardsData.collectedDate = currentDate;
        rewardsData.currentDate = currentDate;
        fs.writeFileSync(rewardsFilePath, JSON.stringify(rewardsData, null, 2));

        // Increase user's coins
        const userCoinsPath = path.join(userdataDir, username, 'coins.txt');
        const currentCoins = Number(fs.readFileSync(userCoinsPath, 'utf8')) || 0;
        const newCoins = currentCoins + rewardAmounts[day];
        fs.writeFileSync(userCoinsPath, newCoins.toString());

        res.json({
            status: 'success',
            message: `Successfully claimed day ${day} reward`,
            newCoins,
            rewardsData
        });
    } catch (error) {
        console.error('Error processing rewards claim:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
 
// Add these routes to your index.js

// Add this to your index.js file

const levelsDir = path.join(__dirname, 'data');
// First, let's create a comprehensive level configuration
const LEVEL_CONFIG = {
    1: {
        coinsNeeded: 50000,
        coinsReward: 3000,
        spintickets: 4,
        rank: 'warrior'
    },
    2: {
        coinsNeeded: 150000,
        coinsReward: 6000,
        spintickets: 5,
        rank: 'warrior'
    },
    3: {
        coinsNeeded: 350000,
        coinsReward: 12000,
        spintickets: 6,
        rank: 'Elite'
    },
    4: {
        coinsNeeded: 750000,
        coinsReward: 20000,
        spintickets: 6,
        rank: 'Elite'
    },
    5: {
        coinsNeeded: 1500000,
        coinsReward: 35000,
        spintickets: 8,
        rank: 'Master'
    },
    6: {
        coinsNeeded: 3000000,
        coinsReward: 50000,
        spintickets: 8,
        rank: 'Master'
    },
    7: {
        coinsNeeded: 6000000,
        coinsReward: 80000,
        spintickets: 9,
        rank: 'GrandMaster'
    },
    8: {
        coinsNeeded: 10000000,
        coinsReward: 100000,
        spintickets: 10,
        rank: 'GrandMaster'
    },
    9: {
        coinsNeeded: 35000000,
        coinsReward: 120000,
        spintickets: 11,
        rank: 'Epic'
    },
    10: {
        coinsNeeded: 40000000,
        coinsReward: 400000,
        spintickets: 12,
        rank: 'Epic'
    },
    11: {
        coinsNeeded: 80000000,
        coinsReward: 800000,
        spintickets: 13,
        rank: 'Legend'
    },
    12: {
        coinsNeeded: 1000000000,
        coinsReward: 1100000,
        spintickets: 14,
        rank: 'Legendery'
    },
    13: {
        coinsNeeded: 3000000000,
        coinsReward: 1200000,
        spintickets: 15,
        rank: 'Mythic'
    },
    14: {
        coinsNeeded: 6000000000,
        coinsReward: 1300000,
        spintickets: 16,
        rank: 'Strongets'
    },
    15: {
        coinsNeeded: 10000000000,
        coinsReward: 1400000,
        spintickets: 17,
        rank: 'Undfeatable'
    }
};

// Function to update spin tickets
async function updateSpinTickets(username, additionalTickets) {
    const spinFilePath = path.join(levelsDir, username, 'spin.json');

    try {
        // Ensure directory exists
        if (!fs.existsSync(path.dirname(spinFilePath))) {
            fs.mkdirSync(path.dirname(spinFilePath), { recursive: true });
        }

        const currentDate = new Date().toISOString().split('T')[0];

        // Default structure for new files
        let data = {
            spin: {
                current_date: currentDate,
                collected_date: currentDate,
                spintickets: additionalTickets,
                notification: {
                    show: false,
                    message: ""
                }
            }
        };

        // If file exists, read and update it
        if (fs.existsSync(spinFilePath)) {
            const fileContent = fs.readFileSync(spinFilePath, 'utf8');
            const existingData = JSON.parse(fileContent);

            // Add new tickets to existing amount
            data.spin.spintickets = existingData.spin.spintickets + additionalTickets;
        }

        // Save the data
        fs.writeFileSync(spinFilePath, JSON.stringify(data, null, 2));
        return data.spin.spintickets;
    } catch (error) {
        console.error('Error updating spin tickets:', error);
        throw error;
    }
}

// Levels endpoint
app.get('/levels', async (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const levelsFilePath = path.join(levelsDir, username, 'levels.json');
    const coinsFilePath = path.join(userdataDir, username, 'coins.txt');

    try {
        // Ensure directory exists
        if (!fs.existsSync(path.dirname(levelsFilePath))) {
            fs.mkdirSync(path.dirname(levelsFilePath), { recursive: true });
        }

        // Read current coins
        const currentCoins = Number(fs.readFileSync(coinsFilePath, 'utf8')) || 0;

        let levelData;
        let leveledUp = false;
        let shouldNotify = false;

        // Initialize or read level data
        if (!fs.existsSync(levelsFilePath)) {
            levelData = {
                currentLevel: 1,
                coinsNeeded: LEVEL_CONFIG[1].coinsNeeded,
                coinsReward: LEVEL_CONFIG[1].coinsReward,
                spintickets: LEVEL_CONFIG[1].spintickets,
                notificationPending: false
            };
        } else {
            levelData = JSON.parse(fs.readFileSync(levelsFilePath, 'utf8'));
            if (!('notificationPending' in levelData)) {
                levelData.notificationPending = false;
            }
        }

        levelData.currentCoins = currentCoins;

        // Check for level up
        if (currentCoins >= levelData.coinsNeeded && levelData.currentLevel < 10) {
            const previousLevel = levelData.currentLevel;
            levelData.currentLevel++;

            // Get new level configuration
            const newLevelConfig = LEVEL_CONFIG[levelData.currentLevel];
            levelData.coinsNeeded = newLevelConfig.coinsNeeded;
            levelData.coinsReward = newLevelConfig.coinsReward;

            // Update spin tickets
            const newSpinTickets = await updateSpinTickets(username, newLevelConfig.spintickets);
            levelData.spintickets = newLevelConfig.spintickets;

            leveledUp = true;
            levelData.notificationPending = true;
            shouldNotify = true;

            // Award coins reward
            const newCoins = currentCoins + levelData.coinsReward;
            fs.writeFileSync(coinsFilePath, newCoins.toString());
            levelData.currentCoins = newCoins;
        }

        // Check notification status
        if (levelData.notificationPending) {
            shouldNotify = true;
            levelData.notificationPending = false;
        }

        // Save updated level data
        const levelDataToSave = {
            currentLevel: levelData.currentLevel,
            coinsNeeded: levelData.coinsNeeded,
            coinsReward: levelData.coinsReward,
            spintickets: levelData.spintickets,
            notificationPending: levelData.notificationPending
        };
        fs.writeFileSync(levelsFilePath, JSON.stringify(levelDataToSave, null, 2));

        // Add rank information
        levelData.rank = LEVEL_CONFIG[levelData.currentLevel].rank;

        // Send response
        res.json({
            ...levelData,
            shouldNotify,
            nextLevelConfig: levelData.currentLevel < 10 ? 
                LEVEL_CONFIG[levelData.currentLevel + 1] : null
        });
    } catch (error) {
        console.error('Error handling level data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add these routes after your existing routes but before app.listen()

// Add this near the top of index.js with other directory declarations
const dataDir = path.join(__dirname, 'data');

// Ensure 'data' directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("'data' directory created.");
}

app.get('/tap', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const tapFilePath = path.join(spinDataDir, username, 'tap.json');

    try {
        if (!fs.existsSync(path.dirname(tapFilePath))) {
            fs.mkdirSync(path.dirname(tapFilePath), { recursive: true });
        }

        let tapData;
        const currentTime = new Date().getTime();

        if (!fs.existsSync(tapFilePath)) {
            tapData = {
                tapcoins: 2000,          // Initial tapcoins
                resetCoins: 2000,        // Value to reset to when recharging
                pauseMinutes: 20,           // Hours to pause for
                currentTime: currentTime,
                pauseTime: null,
                tapper: 1
            };
            fs.writeFileSync(tapFilePath, JSON.stringify(tapData, null, 2));
            console.log(`Created new tap.json for user ${username}`);
        } else {
            tapData = JSON.parse(fs.readFileSync(tapFilePath, 'utf8'));

            // Reset tapcoins to resetCoins value when pause time is over
            if (tapData.pauseTime && currentTime >= tapData.pauseTime) {
                tapData.tapcoins = tapData.resetCoins; // Use resetCoins value here
                tapData.pauseTime = null;
                fs.writeFileSync(tapFilePath, JSON.stringify(tapData, null, 2));
            }
        }

        res.json(tapData);
    } catch (error) {
        console.error('Error handling tap data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/tap', async (req, res) => {
    const { username, tapCount } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    const userDataDir = path.join(spinDataDir, username);
    const tapFilePath = path.join(userDataDir, 'tap.json');
    const userCoinsPath = path.join(userdataDir, username, 'coins.txt');
    try {
        // Ensure directories exist
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        // Initialize tap data if not exists
        if (!fs.existsSync(tapFilePath)) {
            const initialTapData = {
                tapcoins: 2000,
                resetCoins: 2000,
                pauseMinutes: 20,
                currentTime: new Date().getTime(),
                pauseTime: null,
                tapper: 1
            };
            fs.writeFileSync(tapFilePath, JSON.stringify(initialTapData, null, 2));
        }

        // Read current tap data
        const tapData = JSON.parse(fs.readFileSync(tapFilePath, 'utf8'));

        // Calculate tap values
        const tapperValue = tapData.tapper || 1;
        const totalTapCoins = tapperValue * (tapCount || 1);

        // Check if enough tapcoins
        if (tapData.tapcoins < totalTapCoins) {
            return res.json({
                status: 'insufficient_coins',
                message: 'Not enough tap coins'
            });
        }

        // Deduct tapcoins
        tapData.tapcoins = Math.max(0, tapData.tapcoins - totalTapCoins);
        fs.writeFileSync(tapFilePath, JSON.stringify(tapData, null, 2));

        // Update user coins
        const currentCoins = Number(fs.readFileSync(userCoinsPath, 'utf8')) || 0;
        const newCoinBalance = currentCoins + totalTapCoins;
        fs.writeFileSync(userCoinsPath, newCoinBalance.toString());

        res.json({
            status: 'success',
            coinsAdded: totalTapCoins,
            tapcoins: tapData.tapcoins,
            resetCoins: tapData.resetCoins
        });
    } catch (error) {
        console.error('Error processing tap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add these constants at the top of your index.js
const UPGRADE_CONFIGS = {
    resetCoins: {
        baseIncrease: 1750,
        baseCost: 25000,
        costMultiplier: 1.5,
        maxLevel: 50
    },
    pauseMinutes: {
        baseDecrease: 1,  // Changed from 5 to 1
        baseCost: 50000,
        costMultiplier: 1.8,
        maxLevel: 10,
        minValue: 1      // Changed from 5 to 1 to allow going down to 1 minute
    },
    tapper: {
        baseIncrease: 5,
        baseCost: 1000,
        costMultiplier: 0.3,
        maxLevel: 200
    }
};

app.get('/updatetap', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const tapFilePath = path.join(spinDataDir, username, 'tap.json');
    const upgradeDataPath = path.join(spinDataDir, username, 'upgrade_levels.json');

    try {
        // Read tap data with corrected default values
        let tapData = { 
            resetCoins: 2000, 
            pauseMinutes: 15,  // Changed from pauseHour, default 180 minutes (3 hours)
            tapper: 1 
        };
        if (fs.existsSync(tapFilePath)) {
            tapData = JSON.parse(fs.readFileSync(tapFilePath, 'utf8'));
        }

        let upgradeLevels = {
            resetCoins: 0,
            pauseMinutes: 0,  // Changed from pauseHour
            tapper: 0
        };

        if (fs.existsSync(upgradeDataPath)) {
            upgradeLevels = JSON.parse(fs.readFileSync(upgradeDataPath, 'utf8'));
        } else {
            fs.writeFileSync(upgradeDataPath, JSON.stringify(upgradeLevels, null, 2));
        }

        const nextUpgradeCosts = {
            resetCoins: Math.floor(UPGRADE_CONFIGS.resetCoins.baseCost * 
                Math.pow(UPGRADE_CONFIGS.resetCoins.costMultiplier, upgradeLevels.resetCoins)),
            pauseMinutes: Math.floor(UPGRADE_CONFIGS.pauseMinutes.baseCost * 
                Math.pow(UPGRADE_CONFIGS.pauseMinutes.costMultiplier, upgradeLevels.pauseMinutes)),
            tapper: Math.floor(UPGRADE_CONFIGS.tapper.baseCost * 
                Math.pow(UPGRADE_CONFIGS.tapper.costMultiplier, upgradeLevels.tapper))
        };

        res.json({
            currentValues: tapData,
            upgradeLevels,
            nextUpgradeCosts,
            maxLevels: {
                resetCoins: UPGRADE_CONFIGS.resetCoins.maxLevel,
                pauseMinutes: UPGRADE_CONFIGS.pauseMinutes.maxLevel,
                tapper: UPGRADE_CONFIGS.tapper.maxLevel
            }
        });
    } catch (error) {
        console.error('Error fetching update status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Updated POST endpoint for upgrades
app.post('/updatetap', async (req, res) => {
    const { username, updateType } = req.body;
    if (!username || !updateType) {
        return res.status(400).json({ error: 'Username and update type are required' });
    }

    const tapFilePath = path.join(spinDataDir, username, 'tap.json');
    const upgradeDataPath = path.join(spinDataDir, username, 'upgrade_levels.json');
    const userCoinsPath = path.join(userdataDir, username, 'coins.txt');

    try {
        // Read upgrade levels
        let upgradeLevels = {
            resetCoins: 0,
            pauseMinutes: 0,
            tapper: 0
        };

        if (fs.existsSync(upgradeDataPath)) {
            upgradeLevels = JSON.parse(fs.readFileSync(upgradeDataPath, 'utf8'));
        }

        // Check if max level reached
        if (upgradeLevels[updateType] >= UPGRADE_CONFIGS[updateType].maxLevel) {
            return res.status(400).json({ error: 'Max level reached' });
        }

        // Calculate upgrade cost
        const upgradeCost = Math.floor(UPGRADE_CONFIGS[updateType].baseCost * 
            Math.pow(UPGRADE_CONFIGS[updateType].costMultiplier, upgradeLevels[updateType]));

        // Check if user has enough coins
        const currentCoins = Number(fs.readFileSync(userCoinsPath, 'utf8')) || 0;
        if (currentCoins < upgradeCost) {
            return res.status(400).json({ error: 'Insufficient coins' });
        }

        // Read current tap data
        let tapData = {
            resetCoins: 500,
            pauseMinutes: 180,
            tapper: 1
        };

        if (fs.existsSync(tapFilePath)) {
            tapData = JSON.parse(fs.readFileSync(tapFilePath, 'utf8'));
        }

        // Apply updates based on type
        switch (updateType) {
            case 'resetCoins':
                tapData.resetCoins += UPGRADE_CONFIGS.resetCoins.baseIncrease;
                break;
            case 'pauseMinutes':
                // Only decrease by 1 minute each time, but don't go below minValue
                const newPauseMinutes = Math.max(
                    UPGRADE_CONFIGS.pauseMinutes.minValue,
                    tapData.pauseMinutes - UPGRADE_CONFIGS.pauseMinutes.baseDecrease
                );
                // Make sure we actually update the value in tapData
                tapData.pauseMinutes = newPauseMinutes;
                break;
            case 'tapper':
                tapData.tapper += UPGRADE_CONFIGS.tapper.baseIncrease;
                break;
            default:
                return res.status(400).json({ error: 'Invalid update type' });
        }

        // Increment upgrade level
        upgradeLevels[updateType]++;

        // Save updated data
        fs.writeFileSync(tapFilePath, JSON.stringify(tapData, null, 2));
        fs.writeFileSync(upgradeDataPath, JSON.stringify(upgradeLevels, null, 2));

        // Deduct coins
        const newCoins = currentCoins - upgradeCost;
        fs.writeFileSync(userCoinsPath, newCoins.toString());

        // Calculate next upgrade cost
        const nextUpgradeCost = Math.floor(UPGRADE_CONFIGS[updateType].baseCost * 
            Math.pow(UPGRADE_CONFIGS[updateType].costMultiplier, upgradeLevels[updateType]));

        res.json({
            status: 'success',
            tapData,
            remainingCoins: newCoins,
            currentLevel: upgradeLevels[updateType],
            nextUpgradeCost,
            maxLevel: UPGRADE_CONFIGS[updateType].maxLevel
        });
    } catch (error) {
        console.error('Error updating tap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/status', (req, res) => {
    const { username } = req.query;

    try {
        // Get all user directories
        const users = fs.readdirSync(userdataDir)
            .filter(file => fs.statSync(path.join(userdataDir, file)).isDirectory());

        // Get per-hour profit for each user
        const usersData = users.map(user => {
            const cardsPath = path.join(dataDir, user, 'cards.json');

            let perHourProfit = 0;

            if (fs.existsSync(cardsPath)) {
                try {
                    const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
                    perHourProfit = cardsData.profitPerHour || 0;
                } catch (error) {
                    console.error(`Error reading cards.json for user ${user}:`, error);
                }
            }

            return { username: user, perHourProfit };
        });

        // Sort users by per-hour profit (descending)
        usersData.sort((a, b) => b.perHourProfit - a.perHourProfit);

        // Find current user's position
        const currentUserRank = usersData.findIndex(user => user.username === username) + 1;
        const currentUserData = usersData.find(user => user.username === username) || 
                              { username, perHourProfit: 0 };

        // Limit to top 300 users
        const topUsers = usersData.slice(0, 300);

        res.json({
            topUsers,
            currentUserRank: currentUserRank > 300 ? null : currentUserRank,
            currentUserData
        });

    } catch (error) {
        console.error('Error processing status request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const gameDataDir = path.join(__dirname, 'userdata');

const increaseAmount = async (username, amount) => {
    const userDir = path.join(userdataDir, username);
    const coinsFilePath = path.join(userDir, 'coins.txt');

    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    // Check if coins.txt exists; if not, create it with 0
    if (!fs.existsSync(coinsFilePath)) {
        fs.writeFileSync(coinsFilePath, '0', 'utf8');
    }

    // Read current amount
    const data = fs.readFileSync(coinsFilePath, 'utf8');
    let currentAmount = Number(data.trim()) || 0;
    let newAmount = currentAmount + amount;

    // Write updated amount
    fs.writeFileSync(coinsFilePath, newAmount.toString(), 'utf8');
    return newAmount;
};

app.post("/amount/increase", async (req, res) => {
    const { username, amount } = req.body;

    if (!username || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Valid username and amount are required" });
    }

    try {
        const newAmount = await increaseAmount(username, amount);
        res.json({ status: "success", coins: newAmount });
    } catch (error) {
        console.error('Error increasing amount:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/game', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const userDir = path.join(gameDataDir, username);
    const gameFilePath = path.join(userDir, 'game.json');

    try {
        // Ensure user directory exists
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        let gameData;
        const currentDate = new Date().toISOString().split('T')[0];

        // If game.json doesn't exist, create it with initial data
        if (!fs.existsSync(gameFilePath)) {
            gameData = {
                currentDate: currentDate,
                collectedDate: currentDate,
                rpcoins: 1000000,
                Retry: 3,
                collected: false,
                banned: false
            };
            fs.writeFileSync(gameFilePath, JSON.stringify(gameData, null, 2));
        } else {
            // Read existing game data
            gameData = JSON.parse(fs.readFileSync(gameFilePath, 'utf8'));

            // Update current date
            gameData.currentDate = currentDate;

            // Check if it's a new day
            if (currentDate !== gameData.collectedDate) {
                gameData.collected = false;
                gameData.banned = false;
                gameData.Retry = 3;
                gameData.collectedDate = currentDate;
                fs.writeFileSync(gameFilePath, JSON.stringify(gameData, null, 2));
            }
        }

        res.json(gameData);
    } catch (error) {
        console.error('Error handling game data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/game/update', async (req, res) => {
    const { username, success } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const gameFilePath = path.join(gameDataDir, username, 'game.json');

    try {
        const gameData = JSON.parse(fs.readFileSync(gameFilePath, 'utf8'));

        if (gameData.Retry <= 0 || gameData.banned) {
            return res.status(400).json({ error: 'No more retries available' });
        }

        if (success) {
            gameData.collected = true;
            // Use the new increaseAmount function
            await increaseAmount(username, gameData.rpcoins);
        } else {
            gameData.Retry--;
            if (gameData.Retry <= 0) {
                gameData.banned = true;
            }
        }

        fs.writeFileSync(gameFilePath, JSON.stringify(gameData, null, 2));
        res.json(gameData);
    } catch (error) {
        console.error('Error updating game state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
const friendsDataDir = path.join(__dirname, 'data');
app.get('/friends', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const friendsFilePath = path.join(friendsDataDir, username, 'friends.json');
    try {
        // Ensure the directory for friends data exists
        if (!fs.existsSync(path.dirname(friendsFilePath))) {
            fs.mkdirSync(path.dirname(friendsFilePath), { recursive: true });
        }

        // Initialize friends.json if it doesn't exist
        if (!fs.existsSync(friendsFilePath)) {
            const initialData = {
                totalFriends: 0,
                friends: {}
            };
            fs.writeFileSync(friendsFilePath, JSON.stringify(initialData, null, 2));
            return res.json(initialData);
        }

        const friendsData = JSON.parse(fs.readFileSync(friendsFilePath, 'utf8'));
        const processedFriends = {};

        for (const [friendId, friendInfo] of Object.entries(friendsData.friends)) {
            const friendName = friendInfo.name;

            // Get coins from userdata directory
            const friendUserDir = path.join(userdataDir, friendName);
            const coinsPath = path.join(friendUserDir, 'coins.txt');

            // Get skin from data directory
            const friendDataDir = path.join(friendsDataDir, friendName);
            const skinsPath = path.join(friendDataDir, 'skins.json');

            let coins = 0;
            if (fs.existsSync(coinsPath)) {
                coins = Number(fs.readFileSync(coinsPath, 'utf8').trim()) || 0;
            }

            let skinPath = 'images/logo1.png'; // Default fallback path
            if (fs.existsSync(skinsPath)) {
                try {
                    const skinsData = JSON.parse(fs.readFileSync(skinsPath, 'utf8'));
                    const defaultSkinId = skinsData.defaultSkin;

                    // Get the path of the default skin from the skins object
                    if (skinsData.skins[defaultSkinId]) {
                        skinPath = skinsData.skins[defaultSkinId].path;
                    }
                } catch (skinError) {
                    console.error(`Error reading skins for ${friendName}:`, skinError);
                }
            }

            processedFriends[friendName] = {
                coins,
                skinPath
            };
        }

        res.json({
            totalFriends: Object.keys(processedFriends).length,
            friends: processedFriends
        });
    } catch (error) {
        console.error('Error handling friends data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add a friend
app.post('/friends/add', (req, res) => {
    const { username, friendUsername } = req.body;
    if (!username || !friendUsername) {
        return res.status(400).json({ error: 'Username and friend username are required' });
    }

    try {
        // Verify username exists in users.json
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'users.json'), 'utf8'));
        const usernameExists = Object.values(usersData).some(
            user => user.username.toLowerCase() === username.toLowerCase()
        );

        if (!usernameExists) {
            return res.status(400).json({ error: 'Referral username not found' });
        }

        const friendsFilePath = path.join(friendsDataDir, username, 'friends.json');

        // Create directory if it doesn't exist
        if (!fs.existsSync(path.dirname(friendsFilePath))) {
            fs.mkdirSync(path.dirname(friendsFilePath), { recursive: true });
        }

        // Read or create friends data
        let friendsData;
        if (!fs.existsSync(friendsFilePath)) {
            friendsData = {
                totalFriends: 0,
                friends: {}
            };
        } else {
            friendsData = JSON.parse(fs.readFileSync(friendsFilePath, 'utf8'));
        }

        // Add new friend
        const friendId = `friend${friendsData.totalFriends + 1}`;
        friendsData.friends[friendId] = {
            name: friendUsername
        };
        friendsData.totalFriends++;

        // Save updated friends data
        fs.writeFileSync(friendsFilePath, JSON.stringify(friendsData, null, 2));

        res.json({
            status: 'success',
            message: 'Friend added successfully',
            data: friendsData
        });
    } catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post("/auth/telegram", async (req, res) => {
    const { initData } = req.body;

    console.log("Received initData:", initData);  // Debugging: Check if initData is received

    if (!initData) {
        console.log("No initialization data provided");
        return res.status(400).json({ error: "No initialization data provided" });
    }

    try {
        const decoded = decodeURIComponent(initData);
        const params = new URLSearchParams(decoded);
        const user = JSON.parse(params.get('user'));

        console.log("Parsed user data:", user);  // Debugging: Check parsed user data

        if (!user || !user.id) {
            return res.status(400).json({ error: "No user data found" });
        }

        const telegramId = user.id;
        res.json({ user: { telegramid: telegramId } });
    } catch (error) {
        console.error('Error processing Telegram authentication:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/tap/refuel', (req, res) => {
    const { username, tapcoins } = req.body;
    if (!username || tapcoins === undefined) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const tapFilePath = path.join(spinDataDir, username, 'tap.json');

    try {
        const tapData = JSON.parse(fs.readFileSync(tapFilePath, 'utf8'));

        // Update tapcoins, ensuring it doesn't exceed resetCoins
        tapData.tapcoins = Math.min(tapcoins, tapData.resetCoins);

        // Remove pauseTime as we're not using it anymore
        tapData.pauseTime = null;

        fs.writeFileSync(tapFilePath, JSON.stringify(tapData, null, 2));

        res.json({
            status: 'success',
            tapcoins: tapData.tapcoins
        });
    } catch (error) {
        console.error('Error processing refuel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const getDefaultCardData = () => {
    const currentTime = new Date();
    const threePM = new Date(currentTime);
    threePM.setHours(15, 0, 0, 0);

    let last3Hours;
    if (currentTime.getHours() < 15) {
        last3Hours = threePM.toISOString();
    } else {
        last3Hours = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000)).toISOString();
    }

    return {
        profitPerHour: 0,
        currentTime: currentTime.toISOString(),
        last3Hours: last3Hours,
        "miners": {
              "card1": {
                    "cardName": "Novice Mining Rig",
                    "coins": 3200,
                    "updateLevel": 0,
                    "perHourProfit": 670,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card2": {
                    "cardName": "Farming",
                    "coins": 4700,
                    "updateLevel": 0,
                    "perHourProfit": 1000,
                    "nextUpdateTime": "2024-11-15T09:38:27.142Z"
                },
                "card3": {
                    "cardName": "High-Performance Mining Station",
                    "coins": 4200,
                    "updateLevel": 0,
                    "perHourProfit": 2100,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card4": {
                    "cardName": "Staking",
                    "coins": 7500,
                    "updateLevel": 0,
                    "perHourProfit": 2300,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card5": {
                    "cardName": "Swap PNTR",
                    "coins": 7600,
                    "updateLevel": 0,
                    "perHourProfit": 3400,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card6": {
                    "cardName": "Budget plan",
                    "coins": 9800,
                    "updateLevel": 0,
                    "perHourProfit": 4300,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card7": {
                    "cardName": "Launch PNTR",
                    "coins": 11600,
                    "updateLevel": 0,
                    "perHourProfit": 6400,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card8": {
                    "cardName": "Liquidity",
                    "coins": 1000,
                    "updateLevel": 0,
                    "perHourProfit": 2500,
                    "lock": {
                        "currentLevel": 4
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                }
            },

            "economy": {
                "card9": {
                    "cardName": "Market",
                    "coins": 9500,
                    "updateLevel": 0,
                    "perHourProfit": 8900,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card10": {
                    "cardName": "Market management",
                    "coins": 12000,
                    "updateLevel": 0,
                    "perHourProfit": 13200,
                    "lock": {
                        "card": "card7",
                        "updateLevel": 6
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card11": {
                    "cardName": "Add liquidity",
                    "coins": 7600,
                    "updateLevel": 0,
                    "perHourProfit": 6800,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card12": {
                    "cardName": "Regional Hedge Fund",
                    "coins": 5000,
                    "updateLevel": 0,
                    "perHourProfit": 4800,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card13": {
                    "cardName": "Metropolitan Hedge Fund",
                    "coins": 13000,
                    "updateLevel": 0,
                    "perHourProfit": 11900,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card14": {
                    "cardName": "National Investment Network",
                    "coins": 14000,
                    "updateLevel": 0,
                    "perHourProfit": 9000,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card15": {
                    "cardName": "Global Investment Consortium",
                    "coins": 17000,
                    "updateLevel": 0,
                    "perHourProfit": 16500,
                    "lock": {
                        "friends": {
                            "totalFriends": 3
                        }
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card16": {
                    "cardName": "International Investment Powerhouse",
                    "coins": 24000,
                    "updateLevel": 0,
                    "perHourProfit": 19800,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                }
            },

            "company": {
                "card17": {
                    "cardName": "Collector",
                    "coins": 2300,
                    "updateLevel": 0,
                    "perHourProfit": 2600,
                    "lock": {
                        "currentLevel": 6
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card18": {
                    "cardName": "Crypto",
                    "coins": 7900,
                    "updateLevel": 0,
                    "perHourProfit": 6500,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card19": {
                    "cardName": "Def",
                    "coins": 27000,
                    "updateLevel": 0,
                    "perHourProfit": 26500,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card20": {
                    "cardName": "Panther games",
                    "coins": 43000,
                    "updateLevel": 0,
                    "perHourProfit": 32000,
                    "lock": {
                        "friends": {
                            "totalFriends": 2
                        }
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card21": {
                    "cardName": "Ai - market",
                    "coins": 36000,
                    "updateLevel": 0,
                    "perHourProfit": 24000,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card22": {
                    "cardName": "Upgrade platform",
                    "coins": 53000,
                    "updateLevel": 0,
                    "perHourProfit": 47900,
                    "lock": {
                        "card": "card18",
                        "updateLevel": 8
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card23": {
                    "cardName": "NFT collection",
                    "coins": 8200,
                    "updateLevel": 0,
                    "perHourProfit": 3700,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card24": {
                    "cardName": "Donation",
                    "coins": 13000,
                    "updateLevel": 0,
                    "perHourProfit": 18700,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                }
            },

            "lifestyle": {
                "card25": {
                    "cardName": "Compact Urban Studio",
                    "coins": 23000,
                    "updateLevel": 0,
                    "perHourProfit": 17600,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card26": {
                    "cardName": "Crypto management",
                    "coins": 31000,
                    "updateLevel": 0,
                    "perHourProfit": 30000,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card27": {
                    "cardName": "Defi protocol",
                    "coins": 65000,
                    "updateLevel": 0,
                    "perHourProfit": 54000,
                    "lock": {
                        "currentLevel": 7
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card28": {
                    "cardName": "Fait payment",
                    "coins": 46000,
                    "updateLevel": 0,
                    "perHourProfit": 25000,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card29": {
                    "cardName": "Exotic Island Resort",
                    "coins": 76000,
                    "updateLevel": 0,
                    "perHourProfit": 82000,
                    "lock": {
                        "friends": {
                            "totalFriends": 5
                        }
                    },
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card30": {
                    "cardName": "Remote Island Sanctuary",
                    "coins": 5500,
                    "updateLevel": 0,
                    "perHourProfit": 2500,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card31": {
                    "cardName": "Tranquil Island Estate",
                    "coins": 39000,
                    "updateLevel": 0,
                    "perHourProfit": 17000,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                },
                "card32": {
                    "cardName": "Luxury Private Island",
                    "coins": 54000,
                    "updateLevel": 0,
                    "perHourProfit": 34200,
                    "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                }
            }
};
};

// Function to sync cards from updatecards.json to cards.json
const syncNewCards = (existingCards, updateCards) => {
    let hasNewCards = false;
    const updatedCards = { ...existingCards };

    // Find all card entries in both files
    const existingCardKeys = Object.keys(existingCards).filter(key => key.startsWith('card'));
    const updateCardKeys = Object.keys(updateCards).filter(key => key.startsWith('card'));

    // Get the highest card number from existing cards
    const getCardNumber = (key) => parseInt(key.replace('card', ''));
    const existingCardNumbers = existingCardKeys.map(getCardNumber);
    const maxExistingCardNumber = Math.max(...existingCardNumbers, 0);

    // Add new cards that don't exist in cards.json
    updateCardKeys.forEach(cardKey => {
        const cardNumber = getCardNumber(cardKey);
        // Only add cards that have higher numbers than existing ones
        if (cardNumber > maxExistingCardNumber) {
            updatedCards[cardKey] = updateCards[cardKey];
            hasNewCards = true;
        }
    });

    return { updatedCards, hasNewCards };
};

// Add this function in index.js after the getDefaultCardData function

const mergeCardsData = (existingCards, updateCards) => {
    // Create a deep copy of existing cards to avoid mutations
    const mergedCards = JSON.parse(JSON.stringify(existingCards));

    // Preserve these top-level properties from existing cards
    const preserveProps = ['profitPerHour', 'currentTime', 'last3Hours'];

    // Get all sections (miners, economy, company, lifestyle)
    const sections = ['miners', 'economy', 'company', 'lifestyle'];

    // Process each section
    sections.forEach(section => {
        if (!mergedCards[section]) {
            mergedCards[section] = {};
        }

        // If section exists in update cards, process it
        if (updateCards[section]) {
            // Check each card in the update section
            Object.entries(updateCards[section]).forEach(([cardId, cardData]) => {
                // Only add new cards that don't exist in current data
                if (!mergedCards[section][cardId]) {
                    mergedCards[section][cardId] = {
                        ...cardData,
                        updateLevel: 0, // Reset level for new cards
                        nextUpdateTime: new Date().toISOString() // Reset update time
                    };
                }
                // Existing cards retain their current values
            });
        }
    });

    // Preserve original top-level properties
    preserveProps.forEach(prop => {
        if (existingCards[prop] !== undefined) {
            mergedCards[prop] = existingCards[prop];
        }
    });

    return mergedCards;
};

            app.get("/cards", async (req, res) => {
                const username = req.query.username;
                if (!username) {
                    return res.status(400).json({ error: "Username is required" });
                }

                const userDir = path.join(__dirname, "data", username);
                const cardsFilePath = path.join(userDir, "cards.json");
                const levelsFilePath = path.join(userDir, "levels.json");
                const friendsFilePath = path.join(userDir, "friends.json");
                const updateCardsPath = path.join(__dirname, "updatecards.json");

                try {
                    if (!fs.existsSync(userDir)) {
                        fs.mkdirSync(userDir, { recursive: true });
                    }

                    let cardsData;
                    let hasUpdates = false;

                    // If cards.json doesn't exist, create it from updatecards.json or default
                    if (!fs.existsSync(cardsFilePath)) {
                        if (fs.existsSync(updateCardsPath)) {
                            const updateCardsData = JSON.parse(fs.readFileSync(updateCardsPath, "utf8"));
                            const currentTime = new Date();
                            cardsData = {
                                ...updateCardsData,
                                currentTime: currentTime.toISOString(),
                                last3Hours: new Date(currentTime.getTime() + (3 * 60 * 60 * 1000)).toISOString(),
                                profitPerHour: updateCardsData.profitPerHour || 0
                            };
                        } else {
                            cardsData = getDefaultCardData();
                        }
                        hasUpdates = true;
                    } else {
                        // Load existing cards data
                        cardsData = JSON.parse(fs.readFileSync(cardsFilePath, "utf8"));

                        // Check for updates from updatecards.json
                        if (fs.existsSync(updateCardsPath)) {
                            const updateCardsData = JSON.parse(fs.readFileSync(updateCardsPath, "utf8"));
                            const sections = ["miners", "economy", "company", "lifestyle"];

                            sections.forEach(section => {
                                if (updateCardsData[section] && typeof updateCardsData[section] === "object") {
                                    if (!cardsData[section]) {
                                        cardsData[section] = {};
                                    }

                                    Object.entries(updateCardsData[section]).forEach(([cardKey, cardData]) => {
                                        if (!cardsData[section][cardKey]) {
                                            cardsData[section][cardKey] = {
                                                ...cardData,
                                                updateLevel: 0,
                                                nextUpdateTime: new Date().toISOString(),
                                                perHourProfit: cardData.perHourProfit || 0
                                            };
                                            hasUpdates = true;
                                        }
                                    });
                                }
                            });
                        }
                    }

                    // Update timestamps
                    const currentTime = new Date();
                    cardsData.currentTime = currentTime.toISOString();
                    cardsData.last3Hours = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000)).toISOString();

                    // Save updated cards data if necessary
                    if (hasUpdates) {
                        fs.writeFileSync(cardsFilePath, JSON.stringify(cardsData, null, 2));
                    }

                    // Load levels and friends data
                    let levelsData = fs.existsSync(levelsFilePath)
                        ? JSON.parse(fs.readFileSync(levelsFilePath, "utf8"))
                        : { currentLevel: 1 };

                    let friendsData = fs.existsSync(friendsFilePath)
                        ? JSON.parse(fs.readFileSync(friendsFilePath, "utf8"))
                        : { totalFriends: 0 };

                    // Determine lock status for each card
                    Object.keys(cardsData).forEach(section => {
                        if (typeof cardsData[section] === "object" && !Array.isArray(cardsData[section])) {
                            Object.entries(cardsData[section]).forEach(([cardKey, card]) => {
                                card.isLocked = false;
                                card.lockReason = null;

                                if (card.lock) {
                                    if (card.lock.currentLevel && levelsData.currentLevel < card.lock.currentLevel) {
                                        card.isLocked = true;
                                        card.lockReason = `Reach level ${card.lock.currentLevel}`;
                                    }

                                    if (
                                        card.lock.friends &&
                                        friendsData.totalFriends < card.lock.friends.totalFriends
                                    ) {
                                        card.isLocked = true;
                                        card.lockReason = `Need ${card.lock.friends.totalFriends} friends`;
                                    }
                                }
                            });
                        }
                    });

                    res.json({
                        ...cardsData,
                        currentLevel: levelsData.currentLevel,
                        totalFriends: friendsData.totalFriends
                    });
                } catch (error) {
                    console.error("Error handling cards:", error);
                    res.status(500).json({ error: "Internal Server Error" });
                }
            });


app.post("/cards/update", async (req, res) => {
    const { username, cardId } = req.body;
    if (!username || !cardId) {
        return res.status(400).json({ error: "Username and cardId are required" });
    }

    const userDir = path.join(__dirname, 'data', username);
    const cardsFilePath = path.join(userDir, 'cards.json');
    const coinsFilePath = path.join(userdataDir, username, 'coins.txt');

    try {
        let cardsData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf8'));

        // Locate the card in its section
        let card = null;
        let section = null;
        ['miners', 'economy', 'company', 'lifestyle'].forEach(sec => {
            if (cardsData[sec] && cardsData[sec][cardId]) {
                card = cardsData[sec][cardId];
                section = sec;
            }
        });

        if (!card || !section) {
            return res.status(404).json({ error: "Card not found" });
        }

        const currentTime = new Date();
        const nextUpdateTime = new Date(card.nextUpdateTime);

        // Check cooldown
        if (currentTime < nextUpdateTime) {
            return res.status(400).json({ 
                error: "Cannot update yet",
                nextUpdateTime: nextUpdateTime
            });
        }

        const currentCoins = Math.floor(Number(fs.readFileSync(coinsFilePath, 'utf8')));

        // Check if the user has enough coins
        if (currentCoins < card.coins) {
            return res.status(400).json({ error: "Not enough coins" });
        }

        // Immediate update
        const oldProfit = card.perHourProfit; // Current profit from /cards
        const oldCost = card.coins; // Current cost from /cards

        // Deduct the current cost from user's coins
        const newUserCoins = currentCoins - oldCost;

        // Update total profit for the user
        cardsData.profitPerHour += oldProfit; // Add the current profit to total profit

        // Future update calculations
        const nextProfit = Math.floor(oldProfit * 1.45); // Next profit = +45%
        const nextCost = Math.floor(oldCost * 1.6); // Next cost = +60%

        // Apply future updates to the card
        card.perHourProfit = nextProfit; // Set next profit
        card.coins = nextCost; // Set next cost
        card.updateLevel++;
        card.nextUpdateTime = new Date(currentTime.getTime() + 60000).toISOString(); // 1-minute cooldown

        // Save updates
        fs.writeFileSync(coinsFilePath, newUserCoins.toString());
        fs.writeFileSync(cardsFilePath, JSON.stringify(cardsData, null, 2));

        res.json({
            success: true,
            card,
            newCoins: newUserCoins,
            profitPerHour: cardsData.profitPerHour
        });
    } catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




app.get("/profit", (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const userDir = path.join(__dirname, 'data', username);
    const cardsFilePath = path.join(userDir, 'cards.json');

    try {
        // Check if user directory and cards.json exist
        if (!fs.existsSync(cardsFilePath)) {
            return res.json({ profitPerHour: 0 });
        }

        // Read only the profitPerHour value from cards.json
        const cardsData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf8'));
        const profitPerHour = Number(cardsData.profitPerHour) || 0;

        res.json({ profitPerHour });
    } catch (error) {
        console.error('Error reading profit:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.get('/tron', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        // Create user-specific directory path
        const userDir = path.join(dataDir, username);
        const cardsFilePath = path.join(userDir, 'cards.json');

        // Ensure user directory exists
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        let cardsData;
        const currentTime = new Date();
        const last3Hours = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours

        // If cards.json doesn't exist or needs to be updated
        if (!fs.existsSync(cardsFilePath)) {
            // Create initial cards data structure
            cardsData = {
                profitPerHour: 0,
                currentTime: currentTime.toISOString(),
                last3Hours: last3Hours.toISOString(),
                "miners": {
                      "card1": {
                            "cardName": "Novice Mining Rig",
                            "coins": 3200,
                            "updateLevel": 0,
                            "perHourProfit": 670,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card2": {
                            "cardName": "Farming",
                            "coins": 4700,
                            "updateLevel": 0,
                            "perHourProfit": 1000,
                            "nextUpdateTime": "2024-11-15T09:38:27.142Z"
                        },
                        "card3": {
                            "cardName": "High-Performance Mining Station",
                            "coins": 4200,
                            "updateLevel": 0,
                            "perHourProfit": 2100,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card4": {
                            "cardName": "Staking",
                            "coins": 7500,
                            "updateLevel": 0,
                            "perHourProfit": 2300,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card5": {
                            "cardName": "Swap PNTR",
                            "coins": 7600,
                            "updateLevel": 0,
                            "perHourProfit": 3400,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card6": {
                            "cardName": "Budget plan",
                            "coins": 9800,
                            "updateLevel": 0,
                            "perHourProfit": 4300,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card7": {
                            "cardName": "Launch PNTR",
                            "coins": 11600,
                            "updateLevel": 0,
                            "perHourProfit": 6400,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card8": {
                            "cardName": "Liquidity",
                            "coins": 1000,
                            "updateLevel": 0,
                            "perHourProfit": 2500,
                            "lock": {
                                "currentLevel": 4
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        }
                    },

                    "economy": {
                        "card9": {
                            "cardName": "Market",
                            "coins": 9500,
                            "updateLevel": 0,
                            "perHourProfit": 8900,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card10": {
                            "cardName": "Market management",
                            "coins": 12000,
                            "updateLevel": 0,
                            "perHourProfit": 13200,
                            "lock": {
                                "card": "card7",
                                "updateLevel": 6
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card11": {
                            "cardName": "Add liquidity",
                            "coins": 7600,
                            "updateLevel": 0,
                            "perHourProfit": 6800,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card12": {
                            "cardName": "Regional Hedge Fund",
                            "coins": 5000,
                            "updateLevel": 0,
                            "perHourProfit": 4800,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card13": {
                            "cardName": "Metropolitan Hedge Fund",
                            "coins": 13000,
                            "updateLevel": 0,
                            "perHourProfit": 11900,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card14": {
                            "cardName": "National Investment Network",
                            "coins": 14000,
                            "updateLevel": 0,
                            "perHourProfit": 9000,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card15": {
                            "cardName": "Global Investment Consortium",
                            "coins": 17000,
                            "updateLevel": 0,
                            "perHourProfit": 16500,
                            "lock": {
                                "friends": {
                                    "totalFriends": 3
                                }
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card16": {
                            "cardName": "International Investment Powerhouse",
                            "coins": 24000,
                            "updateLevel": 0,
                            "perHourProfit": 19800,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        }
                    },

                    "company": {
                        "card17": {
                            "cardName": "Collector",
                            "coins": 2300,
                            "updateLevel": 0,
                            "perHourProfit": 2600,
                            "lock": {
                                "currentLevel": 6
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card18": {
                            "cardName": "Crypto",
                            "coins": 7900,
                            "updateLevel": 0,
                            "perHourProfit": 6500,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card19": {
                            "cardName": "Def",
                            "coins": 27000,
                            "updateLevel": 0,
                            "perHourProfit": 26500,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card20": {
                            "cardName": "Panther games",
                            "coins": 43000,
                            "updateLevel": 0,
                            "perHourProfit": 32000,
                            "lock": {
                                "friends": {
                                    "totalFriends": 2
                                }
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card21": {
                            "cardName": "Ai - market",
                            "coins": 36000,
                            "updateLevel": 0,
                            "perHourProfit": 24000,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card22": {
                            "cardName": "Upgrade platform",
                            "coins": 53000,
                            "updateLevel": 0,
                            "perHourProfit": 47900,
                            "lock": {
                                "card": "card18",
                                "updateLevel": 8
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card23": {
                            "cardName": "NFT collection",
                            "coins": 8200,
                            "updateLevel": 0,
                            "perHourProfit": 3700,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card24": {
                            "cardName": "Donation",
                            "coins": 13000,
                            "updateLevel": 0,
                            "perHourProfit": 18700,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        }
                    },

                    "lifestyle": {
                        "card25": {
                            "cardName": "Compact Urban Studio",
                            "coins": 23000,
                            "updateLevel": 0,
                            "perHourProfit": 17600,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card26": {
                            "cardName": "Crypto management",
                            "coins": 31000,
                            "updateLevel": 0,
                            "perHourProfit": 30000,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card27": {
                            "cardName": "Defi protocol",
                            "coins": 65000,
                            "updateLevel": 0,
                            "perHourProfit": 54000,
                            "lock": {
                                "currentLevel": 7
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card28": {
                            "cardName": "Fait payment",
                            "coins": 46000,
                            "updateLevel": 0,
                            "perHourProfit": 25000,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card29": {
                            "cardName": "Exotic Island Resort",
                            "coins": 76000,
                            "updateLevel": 0,
                            "perHourProfit": 82000,
                            "lock": {
                                "friends": {
                                    "totalFriends": 5
                                }
                            },
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card30": {
                            "cardName": "Remote Island Sanctuary",
                            "coins": 5500,
                            "updateLevel": 0,
                            "perHourProfit": 2500,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card31": {
                            "cardName": "Tranquil Island Estate",
                            "coins": 39000,
                            "updateLevel": 0,
                            "perHourProfit": 17000,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        },
                        "card32": {
                            "cardName": "Luxury Private Island",
                            "coins": 54000,
                            "updateLevel": 0,
                            "perHourProfit": 34200,
                            "nextUpdateTime": "2024-11-15T09:30:14.374Z"
                        }
                    }
                };
        } else {
            // Read existing data and update times
            cardsData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf8'));
            cardsData.currentTime = currentTime.toISOString();
            cardsData.last3Hours = last3Hours.toISOString();
        }

        // Save updated data
        fs.writeFileSync(cardsFilePath, JSON.stringify(cardsData, null, 2));

        res.json(cardsData);
    } catch (error) {
        console.error('Error handling cards data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Your app is listening on port " + PORT);
});

