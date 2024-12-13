/**
 * @file game.js
 * @description This file contains the logic for the game, 
 *               including interactions with the server
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */


// ======================== Canvas Setup ========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ======================== Assets ========================
const backgroundImg = new Image();
backgroundImg.src = './imgs/env0.png';
const spriteImg = new Image();
spriteImg.src = './imgs/sprite1.png';
const wallSprite = new Image();
wallSprite.src = './imgs/wallSprite.png';
const wallSprite1 = new Image();
wallSprite1.src = './imgs/wallSprite1.png';
const wallSprite2 = new Image();
wallSprite2.src = './imgs/wallSprite2.png';
const spikeSprite = new Image();
spikeSprite.src = './imgs/spikeSprite.png';

// ======================== Game State Variables ========================
let isPaused = false; // Tracks whether the game is paused
let animationFrameId; // Tracks the current animation frame
const groundLevel = 350;

// ======================== Game State ========================
const gameState = createGameState(); // Main game state object

// Initialize game state
function createGameState() {
    return {
        scrollSpeed: 4,
        backgroundX: 0,
        player: createPlayer(),
        normalGravity: 1,
        reducedGravity: 0.3,
        currentGravity: 0.7,
        jumpForce: -10,
        maxFloatTime: 200,
        obstacles: [],
        obstacleTimer: 0,
        obstacleInterval: 120,
        gameRunning: true,
        startTime: null,
        elapsedTime: 0,
        pauseStart: null,
        totalPauseTime: null,
        lastSpeedUp: 0,
        multiplier: 1,
        score: 0.
    };
}

// Create player
function createPlayer() {
    return {
        x: 300,
        y: 300,
        width: 50,
        height: 50,
        velocityY: 0,
        isJumping: false,
        jumpStartTime: null,
        isHoldingJump: false
    };
}

// ======================== Event Listeners ========================
// Setup event listeners for the game.
function setupEventListeners() {
    canvas.addEventListener('keydown', handleJumpStart);
    canvas.addEventListener('keyup', handleJumpEnd);
    canvas.addEventListener('keydown', preventSpacebarScroll);
    canvas.addEventListener('keydown', handleRightArrowPress); // Add listener for the right arrow key
    canvas.addEventListener('keyup', handleRightArrowRelease); // Stop acceleration on release
    canvas.addEventListener('click', () => canvas.focus());
}


// Handle the start of a jump.

function handleJumpStart(e) {
    if (e.code === 'Space' && !gameState.player.isJumping) {
        gameState.player.velocityY = gameState.jumpForce;
        gameState.player.isJumping = true;
        gameState.player.jumpStartTime = Date.now();
    }
    if (e.code === 'Space') {
        gameState.player.isHoldingJump = true;
    }
}


// Handle the end of a jump.

function handleJumpEnd(e) {
    if (e.code === 'Space') {
        gameState.player.isHoldingJump = false;
        gameState.currentGravity = gameState.normalGravity;
    }
}


// Prevent the spacebar from scrolling the page.

function preventSpacebarScroll(e) {
    if (e.code === 'Space') {
        e.preventDefault();
    }
}


// Handle right arrow press for acceleration.

function handleRightArrowPress(e) {
    if (e.code === 'ArrowRight') {
        gameState.player.isAcceleratingRight = true;
    }
}


// Handle right arrow release to stop acceleration.

function handleRightArrowRelease(e) {
    if (e.code === 'ArrowRight') {
        gameState.player.isAcceleratingRight = false;
    }
}

// Set up a listener for pause button
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        e.preventDefault(); // Prevent default tab behavior
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
});


//Set up event handler for restart button
document.getElementById('restartButton').addEventListener('click', () => {
    resetGame();
});
// ======================== Obstacles ========================
// Generate obstacles in the game.
function generateObstacle() {
    const startX = canvas.width + 40;
    const clusterChance = Math.random();

    // Ensure no overlap
    const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1];
    const minSpacing = 80; // Minimum space between obstacles
    const adjustedStartX = lastObstacle
        ? Math.max(startX, lastObstacle.x + lastObstacle.width + minSpacing)
        : startX;

    // Adjust chance of clusters to be higher than single walls
    if (clusterChance < 0.7) {
        createWallCluster(adjustedStartX);
    } else {
        const randomObstacleType = Math.random();

        if (randomObstacleType < 0.3) {
            createWall(adjustedStartX);
        } else if (randomObstacleType < 0.6) {
            createWall2(adjustedStartX);
        } else if (randomObstacleType < 0.9) {
            createWall3(adjustedStartX);
        } else {
            createSpikes(adjustedStartX);
        }
    }

    // Randomize the next interval slightly for variety
    gameState.obstacleInterval = getRandomInterval(90, 150);
}

// Wall creation logic
function createWall(startX) {
    const obstacleWidth = 40; // Width of the wall
    const obstacleHeight = 100; // Height of the wall
    const y = groundLevel - obstacleHeight; // Calculate the vertical position
    // Add the wall to the game state
    gameState.obstacles.push({
        type: 'wall',
        x: startX,
        y: y,
        width: obstacleWidth,
        height: obstacleHeight
    });
}

// Wall creation logic
function createWall2(startX) {
    const obstacleWidth = 40; // Width of wall2
    const obstacleHeight = 80; // Height of wall2
    const y = groundLevel - obstacleHeight;
    gameState.obstacles.push({
        type: 'wall2',
        x: startX,
        y: y,
        width: obstacleWidth,
        height: obstacleHeight
    });
}

// Wall creation logic
function createWall3(startX) {
    const obstacleWidth = 40; // Same width as other walls
    const obstacleHeight = 60; // Slightly shorter than wall2
    const y = groundLevel - obstacleHeight;
    gameState.obstacles.push({
        type: 'wall3',
        x: startX,
        y: y,
        width: obstacleWidth,
        height: obstacleHeight
    });
}

// Wall creation logic
function createWallCluster(startX) {
    const clusterSize = Math.floor(Math.random() * 19) + 5; // Random size between 2 and 20
    const wallTypes = [createWall, createWall2, createWall3]; // Possible wall types

    let lastWallType = null; // Keep track of the previous wall type
    let sameTypeCount = 0; // Count of consecutive walls of the same type
    let currentX = startX; // Track the x-coordinate for proper spacing
    let lastSpikePosition = -Infinity; // Track the last spike's position
    const maxSpikes = Math.floor(clusterSize / 10); // Limit spikes to 1 per 10 walls
    let spikesAdded = 0; // Count spikes added

    for (let i = 0; i < clusterSize; i++) {
        // Choose a wall type. Ensure at least 5 of the same type next to each other.
        let wallType;
        if (sameTypeCount < 5) {
            wallType = lastWallType || wallTypes[Math.floor(Math.random() * wallTypes.length)];
        } else {
            wallType = wallTypes[Math.floor(Math.random() * wallTypes.length)];
        }
        // If the new wall type is different, reset the sameTypeCount.
        if (wallType !== lastWallType) {
            sameTypeCount = 1;
        } else {
            sameTypeCount++;
        }
        // Update the lastWallType for the next iteration.
        lastWallType = wallType;
        // Determine wall dimensions and position
        const obstacleWidth = 40;
        const obstacleHeight =
            wallType === createWall ? 100 : wallType === createWall2 ? 80 : 60;
        const y = groundLevel - obstacleHeight;
        // Add the wall to the game state
        gameState.obstacles.push({
            type: wallType === createWall ? 'wall' : wallType === createWall2 ? 'wall2' : 'wall3',
            x: currentX,
            y: y,
            width: obstacleWidth,
            height: obstacleHeight
        });
        // Add spikes only if conditions are met
        const isEligibleForSpike =
            i >= 7 &&               // Not in the first 7 walls
            i <= clusterSize - 3 && // Not in the last 2 walls
            i - lastSpikePosition >= 5 && // At least 5 walls apart
            spikesAdded < maxSpikes; // Spike count limit not exceeded

        if (isEligibleForSpike && Math.random() < 0.5) { // 50% chance for eligible walls
            createSpikes(currentX, y);
            lastSpikePosition = i;
            spikesAdded++;
        }
        // Increment x position for the next wall
        currentX += obstacleWidth; // Walls are 40px wide
    }
}

// Spike creation logic
function createSpikes(startX, wallTopY) {
    const spikeWidth = 20; // Width of each spike
    const spikeHeight = 30; // Height of each spike
    const y = wallTopY - spikeHeight; // Place spikes above the wall's top

    // Add the spike to the game state
    gameState.obstacles.push({
        type: 'spike',
        x: startX,
        y: y,
        width: spikeWidth,
        height: spikeHeight
    });
}

// ======================== Game Mechanics ========================
// Resolve collisions between the player and obstacles.
function resolveCollisions() {
    const player = gameState.player;

    gameState.obstacles.forEach(obstacle => {
        if (isColliding(player, obstacle)) {
            handleCollision(player, obstacle);
        }
    });
}

// Check if the player is colliding with an obstacle.
function isColliding(player, obstacle) {
    return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + player.height > obstacle.y
    );
}

// Handle collision between the player and an obstacle.
function handleCollision(player, obstacle) {
    const overlapX = Math.min(
        player.x + player.width - obstacle.x,
        obstacle.x + obstacle.width - player.x
    );
    const overlapY = Math.min(
        player.y + player.height - obstacle.y,
        obstacle.y + obstacle.height - player.y
    );

    if (obstacle.type === 'spike') {
        // End the game immediately if the player hits spikes
        gameOver();
        return;
    }

    if (overlapX < overlapY) {
        // Horizontal collision (player hits the side of the wall)
        if (player.x + player.width / 2 < obstacle.x + obstacle.width / 2) {
            // Player hits the left side of the wall
            player.x = obstacle.x - player.width; // Position the player to the left of the wall
        } else {
            // Player hits the right side of the wall
            player.x = obstacle.x + obstacle.width; // Position the player to the right of the wall
        }

        // Allow upward movement to escape the wall
        if (player.velocityY < 0) {
            return; // Let the player move up if jumping
        }

        player.velocityY = 0; // Reset vertical velocity
    } else {
        // Vertical collision (player hits the top or bottom of the wall)
        if (player.y + player.height / 2 < obstacle.y + obstacle.height / 2) {
            // Player lands on top of the wall
            player.y = obstacle.y - player.height; // Position the player on top of the wall
            player.velocityY = 0;
            player.isJumping = false; // Allow the player to jump again
        } else {
            // Player hits the bottom of the wall (unlikely in this game)
            player.y = obstacle.y + obstacle.height;
            player.velocityY = 0;
        }
    }

    // End game if the player is pushed off the left edge
    if (player.x <= 0) {
        gameOver();
    }
}

// End the game when a game-over condition is met.
function gameOver() {
    gameState.gameRunning = false;

    // Change the content of the "playGameTitle" element to "Game Over"
    const titleElement = document.getElementById('playGameTitle');
    if (titleElement) {
        titleElement.textContent = "Game Over";
    } else {
        console.error('Element with ID "playGameTitle" not found.');
    }
    // Save the player's score
    saveScore();
}

// ======================== Updates ========================
// Player position updates
function updatePlayer() {
    const player = gameState.player;

    player.velocityY += gameState.currentGravity;
    player.y += player.velocityY;

    if (player.y > 300) {
        player.y = 300;
        player.velocityY = 0;
        player.isJumping = false;
    }

    if (player.isJumping && player.isHoldingJump) {
        const holdTime = Date.now() - player.jumpStartTime;
        gameState.currentGravity =
            holdTime <= gameState.maxFloatTime
                ? gameState.reducedGravity
                : gameState.normalGravity;
    }

    // Handle acceleration to the right
    if (player.isAcceleratingRight) {
        const maxRightPosition = 300; // Player's starting X position
        player.x = Math.min(player.x + 5, maxRightPosition);
    }
}

// Obstacle position updates
function updateObstacles() {
    gameState.obstacles.forEach(obstacle => {
        obstacle.x -= gameState.scrollSpeed;
    });

    gameState.obstacles = gameState.obstacles.filter(
        obstacle => obstacle.x + obstacle.width > 0
    );

    gameState.obstacleTimer++;

    if (gameState.obstacleTimer >= gameState.obstacleInterval) {
        generateObstacle();
        gameState.obstacleTimer = 0;
    }
}

// ======================== Rendering ========================
// Draw background logic
function drawBackground() {
    gameState.backgroundX -= gameState.scrollSpeed;

    ctx.drawImage(
        backgroundImg,
        gameState.backgroundX,
        0,
        backgroundImg.width,
        canvas.height
    );
    ctx.drawImage(
        backgroundImg,
        gameState.backgroundX + backgroundImg.width,
        0,
        backgroundImg.width,
        canvas.height
    );

    if (gameState.backgroundX <= -backgroundImg.width) {
        gameState.backgroundX = 0;
    }
}

// Draw player logic
function drawPlayer() {
    const player = gameState.player;

    ctx.drawImage(
        spriteImg,
        player.x,
        player.y,
        player.width,
        player.height
    );
}

// Draw obstacles logic
function drawObstacles() {
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.type === 'wall') {
            ctx.drawImage(wallSprite, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.type === 'wall2') {
            ctx.drawImage(wallSprite1, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.type === 'wall3') {
            ctx.drawImage(wallSprite2, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.type === 'spike') {
            ctx.drawImage(
                spikeSprite,
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );
        }
    });
}

// ======================== Game Loop ========================
// Main game loop to update and render the game.
function gameLoop() {
    if (!gameState.gameRunning || isPaused) return;

    // Calculate elapsed time
    getTime();

    // Store the animation frame ID to allow cancellation
    animationFrameId = requestAnimationFrame(gameLoop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    updatePlayer();
    updateObstacles();
    resolveCollisions();
    drawPlayer();
    drawObstacles();
}

// Reset the game to its initial state.
function resetGame() {
    // Reset all game state
    Object.assign(gameState, createGameState());

    // Reset the title element to "Play Shape Run"
    const titleElement = document.getElementById('playGameTitle');
    if (titleElement) {
        titleElement.textContent = "Play Shape Run";
    } else {
        console.error('Element with ID "playGameTitle" not found.');
    }

    // Set the start time to now
    gameState.startTime = Date.now();
    gameState.totalPauseTime = 0;
    gameState.elapsedTime = 0;

    // Cancel any ongoing animation frames
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    // Focus the canvas and restart the game loop
    canvas.focus();
    gameLoop();
}

// ======================== Utilities ========================
// Gets a random number in an interval
function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get the time survived
function getTime() {
    const now = Date.now();
    gameState.elapsedTime = now - gameState.startTime - gameState.totalPauseTime;
    gameState.score += 10// gameState.multiplier;

    // If elapsed time has passed another 5000ms interval since the last speed-up
    if (gameState.elapsedTime - gameState.lastSpeedUp >= 4950) {
        speedUp();
        gameState.lastSpeedUp = gameState.elapsedTime; // Update the last speed-up time
    }
}

// Speed up the game
function speedUp() {
    gameState.scrollSpeed *= 1.05;
    gameState.multiplier *= 1.05;
}

// Save the player's score
function saveScore() {
    fetch('/update-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies with the request
        body: JSON.stringify({
            score: gameState.score,
            time: gameState.elapsedTime / 1000
        })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .catch((err) => console.error('Error saving stats:', err));
}

// Pauses the game
function pauseGame() {
    isPaused = true;

    gameState.pauseStart = Date.now(); // Get the time the user paused

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Resumes the game
function resumeGame() {
    if (isPaused) {
        isPaused = false;
        const pausedDuration = Date.now() - gameState.pauseStart;
        gameState.totalPauseTime += pausedDuration;
        gameState.pauseStart = null;
        gameLoop(); // Restart the game loop
    }
}

// ======================== Initialization ========================
document.addEventListener("DOMContentLoaded", () => {
    const titleElement = document.getElementById('playGameTitle');
    const startOverlay = document.getElementById('startOverlay'); // Select the overlay

    if (!titleElement) {
        console.error('Element with ID "playGameTitle" not found.');
    } else {
        titleElement.textContent = "Play Shape Run"; // Set initial title
    }

    if (!startOverlay) {
        console.error('Element with ID "startOverlay" not found.');
    }

    // Wait for all assets to load before starting the game
    Promise.all([
        new Promise((resolve) => (backgroundImg.onload = resolve)),
        new Promise((resolve) => (spriteImg.onload = resolve)),
        new Promise((resolve) => (wallSprite.onload = resolve)),
        new Promise((resolve) => (wallSprite1.onload = resolve)),
        new Promise((resolve) => (wallSprite2.onload = resolve)),
        new Promise((resolve) => (spikeSprite.onload = resolve))
    ])
        .then(() => {
            setupEventListeners();
            gameState.startTime = Date.now();
            gameState.totalPauseTime = 0;
            gameState.pauseStart = null;
            gameState.lastSpeedUp = 0;
            gameState.score = 0;

            // Start the game loop after a short delay
            setTimeout(() => {
                if (startOverlay) {
                    startOverlay.style.display = "none"; // Hide the overlay
                }
                if (titleElement) {
                    titleElement.textContent = "Play Shape Run"; // Ensure title is reset
                }
                gameLoop(); // Begin the game loop
            }, 5000);
        })
        .catch((error) => {
            console.error("Error loading assets:", error);
        });
});