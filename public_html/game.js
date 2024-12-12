const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Prevent spacebar from scrolling the page
canvas.addEventListener('keydown', function(e) {
    if(e.code === 'Space') {
        e.preventDefault();
    }
});

// Focus canvas on click to ensure it captures keyboard events
canvas.addEventListener('click', function() {
    canvas.focus();
});

// Game state
const gameState = {
    scrollSpeed: 3,
    backgroundX: 0,
    player: {
        x: 100,
        y: 300,
        width: 50,
        height: 50,
        velocityY: 0,
        isJumping: false,
        jumpStartTime: null,
        isHoldingJump: false
    },
    normalGravity: 1,
    reducedGravity: 0.3,
    currentGravity: 0.7,
    jumpForce: -10,
    maxFloatTime: 200,
    obstacles: [],          
    obstacleTimer: 0,       
    obstacleInterval: 120,  // Initial interval
    gameRunning: true
};

// Jump handler - keydown
function handleJumpStart(e) {
    if (e.code === 'Space') {
        if (!gameState.player.isJumping) {
            // Initial jump
            gameState.player.velocityY = gameState.jumpForce;
            gameState.player.isJumping = true;
            gameState.player.jumpStartTime = Date.now();
        }
        gameState.player.isHoldingJump = true;
    }
}

// Jump handler - keyup
function handleJumpEnd(e) {
    if (e.code === 'Space') {
        gameState.player.isHoldingJump = false;
        gameState.currentGravity = gameState.normalGravity;
    }
}

canvas.addEventListener('keydown', handleJumpStart);
canvas.addEventListener('keyup', handleJumpEnd);

const groundLevel = 350; // Adjust as needed

function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate a new obstacle (wall or spike)
function generateObstacle() {
    const startX = canvas.width + 40; 
    const obstacleChoice = Math.random();
    
    if (obstacleChoice < 0.5) {
        // Generate a wall
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
    } else {
        // Generate spike(s)
        // Spikes are smaller and rest on the ground
        // Decide if 1 or 2 spikes
        const spikeCount = Math.random() < 0.5 ? 1 : 2;
        const spikeWidth = 20;  // width of each spike
        const spikeHeight = 30; // height of each spike
        // Spikes sit on the ground
        const y = groundLevel - spikeHeight; 

        // If two spikes, spawn them next to each other
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

    // After spawning an obstacle, set a new random interval for the next obstacle
    // For example, between 90 and 150 frames
    gameState.obstacleInterval = getRandomInterval(90, 150);
}

// Check and resolve collisions between the player and obstacles
function resolveCollisions() {
    const p = gameState.player;

    for (let i = 0; i < gameState.obstacles.length; i++) {
        const o = gameState.obstacles[i];

        // AABB collision check
        const overlapX = (p.x < o.x + o.width) && (p.x + p.width > o.x);
        const overlapY = (p.y < o.y + o.height) && (p.y + p.height > o.y);

        if (overlapX && overlapY) {
            // Determine how much overlap on each axis
            const overlapAmountX = Math.min(p.x + p.width - o.x, o.x + o.width - p.x);
            const overlapAmountY = Math.min(p.y + p.height - o.y, o.y + o.height - p.y);

            if (o.type === 'wall') {
                // Walls stop or support the player
                if (overlapAmountY < overlapAmountX) {
                    // Resolve vertical collision
                    if (p.velocityY > 0 && p.y < o.y) {
                        // Place player on top of the wall
                        p.y = o.y - p.height;
                        p.velocityY = 0;
                        p.isJumping = false;
                        p.isHoldingJump = false;
                        gameState.currentGravity = gameState.normalGravity;
                    } else if (p.y > o.y) {
                        // Player is underneath wall (uncommon scenario)
                        p.y = o.y + o.height;
                    }
                } else {
                    // Resolve horizontal collision
                    if (p.x < o.x) {
                        p.x = o.x - p.width;
                    } else {
                        p.x = o.x + o.width;
                    }
                }
            } else if (o.type === 'spike') {
                // Spikes do not kill immediately as per your requirement,
                // but they do act as obstacles. We'll treat them like walls here.
                // If needed, you can add different behavior for spikes.
                if (overlapAmountY < overlapAmountX) {
                    // Vertical collision
                    if (p.velocityY > 0 && p.y < o.y) {
                        p.y = o.y - p.height;
                        p.velocityY = 0;
                        p.isJumping = false;
                        p.isHoldingJump = false;
                        gameState.currentGravity = gameState.normalGravity;
                    } else if (p.y > o.y) {
                        p.y = o.y + o.height;
                    }
                } else {
                    // Horizontal collision
                    if (p.x < o.x) {
                        p.x = o.x - p.width;
                    } else {
                        p.x = o.x + o.width;
                    }
                }
            }

            // After resolving collision, check if player is off-screen
            if (p.x < 0) {
                // Player got pushed off screen - game over
                gameOver();
                return;
            }
        }
    }
}

function gameOver() {
    gameState.gameRunning = false;
    ctx.fillStyle = 'black';
    ctx.font = '48px sans-serif';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
}

// Game loop
function gameLoop() {
    if (!gameState.gameRunning) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Handle floating mechanic
    if (gameState.player.isJumping && gameState.player.isHoldingJump) {
        const holdTime = Date.now() - gameState.player.jumpStartTime;
        if (holdTime <= gameState.maxFloatTime) {
            gameState.currentGravity = gameState.reducedGravity;
        } else {
            gameState.currentGravity = gameState.normalGravity;
        }
    }

    // Update background position
    gameState.backgroundX -= gameState.scrollSpeed;

    // Draw background with proper looping
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

    // Reset background position
    if (gameState.backgroundX <= -backgroundImg.width) {
        gameState.backgroundX = 0;
    }

    // Update player position with current gravity
    gameState.player.velocityY += gameState.currentGravity;
    gameState.player.y += gameState.player.velocityY;

    // Ground collision (treating the ground as y=300)
    if (gameState.player.y > 300) {
        gameState.player.y = 300;
        gameState.player.velocityY = 0;
        gameState.player.isJumping = false;
        gameState.currentGravity = gameState.normalGravity;
        gameState.player.jumpStartTime = null;
    }

    // Handle obstacle generation
    gameState.obstacleTimer++;
    if (gameState.obstacleTimer >= gameState.obstacleInterval) {
        generateObstacle();
        gameState.obstacleTimer = 0;
    }

    // Move obstacles
    for (let i = 0; i < gameState.obstacles.length; i++) {
        const o = gameState.obstacles[i];
        o.x -= gameState.scrollSpeed;
    }

    // Remove obstacles that have gone off-screen
    gameState.obstacles = gameState.obstacles.filter(o => o.x + o.width > 0);

    // Resolve collisions with obstacles
    resolveCollisions();

    // Draw player
    ctx.drawImage(
        spriteImg,
        gameState.player.x,
        gameState.player.y,
        gameState.player.width,
        gameState.player.height
    );

    // Draw obstacles
    for (let i = 0; i < gameState.obstacles.length; i++) {
        const o = gameState.obstacles[i];

        if (o.type === 'wall') {
            ctx.fillStyle = 'gray';
            ctx.fillRect(o.x, o.y, o.width, o.height);
        } else if (o.type === 'spike') {
            ctx.fillStyle = 'red';
            // Draw a triangle or a series of triangles for a spike
            ctx.beginPath();
            ctx.moveTo(o.x, o.y + o.height);
            ctx.lineTo(o.x + o.width / 2, o.y);
            ctx.lineTo(o.x + o.width, o.y + o.height);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Load images
const backgroundImg = new Image();
backgroundImg.src = './imgs/env0.png';
const spriteImg = new Image();
spriteImg.src = './imgs/sprite1.png';

// Start game when images are loaded
Promise.all([
    new Promise(resolve => backgroundImg.onload = resolve),
    new Promise(resolve => spriteImg.onload = resolve)
]).then(() => {
    gameLoop();
});