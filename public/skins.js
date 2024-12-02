// skins.js
document.addEventListener('DOMContentLoaded', function () {
    const skinsButton = document.getElementById('skinsButton');
    const skinsPopup = document.getElementById('skinsPopup');
    const mainLogo = document.getElementById('logo1');

    if (!skinsButton || !skinsPopup || !mainLogo) {
        console.error('Required elements not found');
        return;
    }

    let selectedSkin = 'default';
    let skinsData = null;
    let previewSkin = null;
    let currentUsername = '';

    // Create popup content structure
    skinsPopup.innerHTML = `
        <div class="skins-popup-content">
            <button class="close-button">×</button>
            <div class="skins-popup-header">
                <h3>Select a Skin</h3>
                <div class="level-guideline">Unlock new skins as you level up!</div>
            </div>
            <div class="skins-grid"></div>
            <div class="skin-description">Select a skin to see its description</div>
            <button class="skin-select-button locked">Select Skin</button>
        </div>
    `;

    const closeButton = skinsPopup.querySelector('.close-button');
    const descriptionBox = skinsPopup.querySelector('.skin-description');
    const selectButton = skinsPopup.querySelector('.skin-select-button');
    const skinsGrid = skinsPopup.querySelector('.skins-grid');

    function getCurrentUsername() {
        return document.getElementById('usernameDisplay')?.textContent || localStorage.getItem('username');
    }

    function loadDefaultLogoImmediately() {
        const username = getCurrentUsername();
        if (!username) {
            mainLogo.src = 'images/logo1.png';
            return;
        }

        const lastUsedSkin = localStorage.getItem(`${username}_defaultSkin`) || 'default';

        try {
            const skinPath = lastUsedSkin === 'default' 
                ? 'images/logo1.png' 
                : `images/skin${lastUsedSkin.replace('skin', '')}.png`;

            const testImage = new Image();
            testImage.onload = function() {
                mainLogo.src = skinPath;
            };
            testImage.onerror = function() {
                mainLogo.src = 'images/logo1.png';
            };
            testImage.src = skinPath;
        } catch (error) {
            console.error('Error loading default logo:', error);
            mainLogo.src = 'images/logo1.png';
        }
    }

    loadDefaultLogoImmediately();

    function loadSkinsData() {
        currentUsername = getCurrentUsername();
        if (!currentUsername) {
            console.error('No username found');
            return;
        }

        fetch(`/skins?username=${encodeURIComponent(currentUsername)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                skinsData = data;
                initializeSkins();

                const defaultSkin = skinsData.skins[skinsData.defaultSkin];
                if (!defaultSkin.locked) {
                    setMainLogoWithFallback(defaultSkin.path);
                    localStorage.setItem(`${currentUsername}_defaultSkin`, skinsData.defaultSkin);
                } else {
                    const firstUnlockedSkin = Object.values(skinsData.skins).find(skin => !skin.locked);
                    setMainLogoWithFallback(firstUnlockedSkin ? firstUnlockedSkin.path : 'images/logo1.png');
                }
            })
            .catch(error => {
                console.error('Error loading skins:', error);
                setMainLogoWithFallback('images/logo1.png');
            });
    }

    function updateDefaultSkin(skinId) {
        fetch('/update-default-skin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username: currentUsername,
                skinId 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Default skin updated successfully');
                localStorage.setItem(`${currentUsername}_defaultSkin`, skinId);
                loadSkinsData();
            } else {
                console.error('Failed to update default skin:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating default skin:', error);
        });
    }

    function updateSelectButton(skin) {
        if (!skin) {
            selectButton.className = 'skin-select-button locked';
            selectButton.textContent = 'Select a Skin';
            return;
        }

        if (skin.locked) {
            selectButton.className = 'skin-select-button locked';
            selectButton.textContent = `Unlock at Level ${skin.requiredLevel}`;
        } else {
            selectButton.className = 'skin-select-button available';
            selectButton.textContent = 'Select Skin';
        }
    }

    function showDescription(skin) {
        if (!skin) {
            descriptionBox.textContent = 'Select a skin to see its description';
            return;
        }
        descriptionBox.textContent = skin.description || 'No description available';
    }

    function setMainLogoWithFallback(imagePath) {
        const testImage = new Image();

        testImage.onload = function() {
            mainLogo.src = imagePath;
        };

        testImage.onerror = function() {
            console.warn(`Failed to load image: ${imagePath}, reverting to default`);
            mainLogo.src = 'images/logo1.png';
        };

        testImage.src = imagePath;
    }

    function initializeSkins() {
        skinsGrid.innerHTML = '';

        Object.values(skinsData.skins).forEach(skin => {
            const skinImg = document.createElement('img');
            skinImg.className = 'skin-option';

            const testThumbnail = new Image();
            testThumbnail.onload = function() {
                skinImg.src = skin.thumbnail;
            };
            testThumbnail.onerror = function() {
                skinImg.src = 'images/1.png';
            };
            testThumbnail.src = skin.thumbnail;

            skinImg.alt = skin.name;
            skinImg.dataset.skinId = skin.id;
            skinImg.dataset.requiredLevel = parseInt(skin.id.replace('skin', '')) || 1;

            if (skin.locked) {
                skinImg.classList.add('locked');
            }

            if (skin.id === skinsData.defaultSkin) {
                skinImg.classList.add('selected');
            }

            skinImg.addEventListener('click', function() {
                if (skin.locked) return;

                previewSkin = skin;
                document.querySelectorAll('.skin-option').forEach(s => {
                    s.classList.remove('preview-selected');
                });
                skinImg.classList.add('preview-selected');
                showDescription(skin);
                updateSelectButton(skin);
            });

            skinsGrid.appendChild(skinImg);
        });
    }

    // Select Button Event Listener
    selectButton.addEventListener('click', function () {
        if (!previewSkin || previewSkin.locked) return;

        selectButton.className = 'skin-select-button selected';
        selectButton.textContent = 'Selected';

        setMainLogoWithFallback(previewSkin.path);
        updateDefaultSkin(previewSkin.id);

        selectedSkin = previewSkin.id;
        document.querySelectorAll('.skin-option').forEach(skinOption => {
            skinOption.classList.remove('selected');
            if (skinOption.dataset.skinId === previewSkin.id) {
                skinOption.classList.add('selected');
            }
        });

        setTimeout(() => {
            selectButton.className = 'skin-select-button available';
            selectButton.textContent = 'Select Skin';
        }, 2000);
    });

    skinsButton.addEventListener('click', function (e) {
        e.stopPropagation();
        skinsPopup.style.display = 'flex';
        loadSkinsData();
    });

    closeButton.addEventListener('click', function () {
        skinsPopup.style.display = 'none';
        previewSkin = null;
        showDescription(null);
        updateSelectButton(null);
    });

    skinsPopup.addEventListener('click', function (e) {
        if (e.target === skinsPopup) {
            skinsPopup.style.display = 'none';
            previewSkin = null;
            showDescription(null);
            updateSelectButton(null);
        }
    });

    document.addEventListener('click', function (e) {
        if (!skinsPopup.contains(e.target) && e.target !== skinsButton) {
            skinsPopup.style.display = 'none';
        }
    });

    mainLogo.onerror = function () {
        console.warn('Main logo failed to load, reverting to default');
        this.src = 'images/logo1.png';
    };

    loadSkinsData();
});