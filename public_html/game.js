/**
 * @file server.js
 * @description This file contains the logic for the game, 
 *              including interactions with the server
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Images
const backgroundImg = new Image();
backgroundImg.src = './imgs/env0.png';
const spriteImg = new Image();
spriteImg.src = './imgs/sprite1.png';

// Constants
const groundLevel = 350;

// Game state
const gameState = createGameState();

// Initialize game
/**
 * Function createGameState - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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
/**
 * Function createPlayer - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

// Event listeners
/**
 * Function setupEventListeners - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function setupEventListeners() {
    canvas.addEventListener('keydown', handleJumpStart);
    canvas.addEventListener('keyup', handleJumpEnd);
    canvas.addEventListener('keydown', preventSpacebarScroll);
    canvas.addEventListener('keydown', handleRightArrowPress); // Add listener for the right arrow key
    canvas.addEventListener('keyup', handleRightArrowRelease); // Stop acceleration on release
    canvas.addEventListener('click', () => canvas.focus());
}

/**
 * Function handleJumpStart - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

/**
 * Function handleJumpEnd - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function handleJumpEnd(e) {
    if (e.code === 'Space') {
        gameState.player.isHoldingJump = false;
        gameState.currentGravity = gameState.normalGravity;
    }
}

/**
 * Function preventSpacebarScroll - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function preventSpacebarScroll(e) {
    if (e.code === 'Space') {
        e.preventDefault();
    }
}

// Generate obstacles
/**
 * Function generateObstacle - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function generateObstacle() {
    const startX = canvas.width + 40;
    const isWall = Math.random() < 0.5;

    if (isWall) {
        createWall(startX);
    } else {
        createSpikes(startX);
    }

    gameState.obstacleInterval = getRandomInterval(90, 150);
}

/**
 * Function createWall - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function createWall(startX) {
    const obstacleWidth = 40;
    const obstacleHeight = 100;
    const y = groundLevel - obstacleHeight;

    gameState.obstacles.push({
        type: 'wall',
        x: startX,
        y: y,
        width: obstacleWidth,
        height: obstacleHeight
    });
}

/**
 * Function createSpikes - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function createSpikes(startX) {
    const spikeCount = Math.random() < 0.5 ? 1 : 2;
    const spikeWidth = 20;
    const spikeHeight = 30;
    const y = groundLevel - spikeHeight;

    for (let i = 0; i < spikeCount; i++) {
        gameState.obstacles.push({
            type: 'spike',
            x: startX + i * (spikeWidth + 5),
            y: y,
            width: spikeWidth,
            height: spikeHeight
        });
    }
}

// Collision detection and resolution
/**
 * Function resolveCollisions - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function resolveCollisions() {
    const player = gameState.player;

    gameState.obstacles.forEach(obstacle => {
        if (isColliding(player, obstacle)) {
            handleCollision(player, obstacle);
        }
    });
}

/**
 * Function isColliding - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function isColliding(player, obstacle) {
    return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + player.height > obstacle.y
    );
}

/**
 * Function handleCollision - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

// Game over
/**
 * Function gameOver - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function gameOver() {
    gameState.gameRunning = false;
    ctx.fillStyle = 'black';
    ctx.font = '48px sans-serif';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    console.log(`Player survived for ${gameState.elapsedTime / 1000} seconds`);
    saveScore();
}

// Update functions
/**
 * Function updatePlayer - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

/**
 * Function updateObstacles - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

// Render functions
/**
 * Function drawBackground - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

/**
 * Function drawPlayer - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

/**
 * Function drawObstacles - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function drawObstacles() {
    gameState.obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.type === 'wall' ? 'gray' : 'red';

        if (obstacle.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });
}



// Utility functions
/**
 * Function getRandomInterval - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.getElementById('restartButton').addEventListener('click', () => {
    resetGame();
});


/**
 * Function handleRightArrowPress - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function handleRightArrowPress(e) {
    if (e.code === 'ArrowRight') {
        gameState.player.isAcceleratingRight = true;
    }
}

/**
 * Function handleRightArrowRelease - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function handleRightArrowRelease(e) {
    if (e.code === 'ArrowRight') {
        gameState.player.isAcceleratingRight = false;
    }
}


let animationFrameId;
let isPaused = false;

/**
 * Function pauseGame - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function pauseGame() {
    isPaused = true;

    gameState.pauseStart = Date.now(); // Get the time the user paused

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.fillText('Paused', canvas.width / 2 - 80, canvas.height / 2);
}

/**
 * Function resumeGame - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function resumeGame() {
    if (isPaused) {
        isPaused = false;
        const pausedDuration = Date.now() - gameState.pauseStart;
        gameState.totalPauseTime += pausedDuration;
        gameState.pauseStart = null;
        gameLoop(); // Restart the game loop
    }
}

// Event listener for Tab key to toggle pause/resume
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

// Update the game loop to account for pause
/**
 * Function gameLoop - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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

/**
 * Function resetGame - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function resetGame() {
    // Reset all game state
    Object.assign(gameState, createGameState());

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


/**
 * Function getTime - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function getTime() {
    const now = Date.now();
    gameState.elapsedTime = now - gameState.startTime - gameState.totalPauseTime;
    gameState.score += 10 * gameState.multiplier;

    // If elapsed time has passed another 5000ms interval since the last speed-up
    if (gameState.elapsedTime - gameState.lastSpeedUp >= 4950) {
        speedUp();
        gameState.lastSpeedUp = gameState.elapsedTime; // Update the last speed-up time
    }
}

/**
 * Function speedUp - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function speedUp() {
    gameState.scrollSpeed *= 1.05;
    gameState.multiplier *= 1.05;
    console.log(`Speed up to ${gameState.scrollSpeed.toFixed(2)}, multiplier is ${gameState.multiplier.toFixed(2)}`)
}


/**
 * Function saveScore - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function saveScore() {
/**
 * Fetch request to '/update-stats', { - [Purpose of request]
 * @param url Endpoint URL
 * @param options Fetch options (headers, body, etc.)
 * @returns Promise resolving with the response
 */

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
        .then((data) => {
            console.log('Stats saved:', data);
        })
        .catch((err) => console.error('Error saving stats:', err));
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Get the overlay text element
    const overlayText = document.querySelector(".overlay-text");

    // Debugging: Log to ensure the element is found
    if (!overlayText) {
        console.error("Overlay text element not found!");
        return;
    } else {
        console.log("Overlay text element found:", overlayText);
    }

    // Set a timeout to hide the overlay text after 5 seconds
    setTimeout(() => {
        console.log("Hiding overlay text...");
        overlayText.classList.add("hidden");
    }, 5000); // 5000 milliseconds = 5 seconds
});

Promise.all([
    new Promise(resolve => (backgroundImg.onload = resolve)),
    new Promise(resolve => (spriteImg.onload = resolve))
]).then(() => {
    setupEventListeners();
    gameState.startTime = Date.now();
    gameState.totalPauseTime = 0;
    gameState.pauseStart = null;
    gameState.lastSpeedUp = 0;
    gameState.score = 0;

    // Delay the game start for 5 minutes (300,000 milliseconds)
    setTimeout(() => {
        gameLoop(); // Start the game loop after 5 minutes
    }, 5000);
});