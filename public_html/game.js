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

// Event listeners
function setupEventListeners() {
    canvas.addEventListener('keydown', handleJumpStart);
    canvas.addEventListener('keyup', handleJumpEnd);
    canvas.addEventListener('keydown', preventSpacebarScroll);
    canvas.addEventListener('keydown', handleRightArrowPress); // Add listener for the right arrow key
    canvas.addEventListener('keyup', handleRightArrowRelease); // Stop acceleration on release
    canvas.addEventListener('click', () => canvas.focus());
}

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

function handleJumpEnd(e) {
    if (e.code === 'Space') {
        gameState.player.isHoldingJump = false;
        gameState.currentGravity = gameState.normalGravity;
    }
}

function preventSpacebarScroll(e) {
    if (e.code === 'Space') {
        e.preventDefault();
    }
}

// Generate obstacles
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
function resolveCollisions() {
    const player = gameState.player;

    gameState.obstacles.forEach(obstacle => {
        if (isColliding(player, obstacle)) {
            handleCollision(player, obstacle);
        }
    });
}

function isColliding(player, obstacle) {
    return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + player.height > obstacle.y
    );
}

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
function gameOver() {
    gameState.gameRunning = false;
    ctx.fillStyle = 'black';
    ctx.font = '48px sans-serif';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    console.log(`Player survived for ${gameState.elapsedTime/1000} seconds`);
    getScore();
}

// Update functions
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
function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.getElementById('restartButton').addEventListener('click', () => {
    resetGame();
});


function handleRightArrowPress(e) {
    if (e.code === 'ArrowRight') {
        gameState.player.isAcceleratingRight = true;
    }
}

function handleRightArrowRelease(e) {
    if (e.code === 'ArrowRight') {
        gameState.player.isAcceleratingRight = false;
    }
}


let animationFrameId;
let isPaused = false;

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

function speedUp(){
    gameState.scrollSpeed *= 1.05;
    gameState.multiplier *= 1.05;
    console.log(`Speed up to ${gameState.scrollSpeed.toFixed(2)}, multiplier is ${gameState.multiplier.toFixed(2)}`)
    getScore();
}


// will be changed to send the score to server, to be added to the database
function getScore(){
    console.log(`${gameState.score.toFixed(2)} points`);
}


// Initialization
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
    gameLoop();
});