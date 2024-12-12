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
    reducedGravity: 0.3,  // Reduced gravity while holding space allows for long jump
    currentGravity: .7,
    jumpForce: -15,
    maxFloatTime: 200    // 0.2
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

// Game loop
function gameLoop() {
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
    // Draw first instance of the background
    ctx.drawImage(
        backgroundImg,
        gameState.backgroundX,
        0,
        backgroundImg.width,
        canvas.height
    );

    // Draw second instance of the background
    ctx.drawImage(
        backgroundImg,
        gameState.backgroundX + backgroundImg.width,
        0,
        backgroundImg.width,
        canvas.height
    );

    // Reset background position when first image is fully off screen
    if (gameState.backgroundX <= -backgroundImg.width) {
        gameState.backgroundX = 0;
    }

    // Update player position with current gravity
    gameState.player.velocityY += gameState.currentGravity;
    gameState.player.y += gameState.player.velocityY;

    // Ground collision
    if (gameState.player.y > 300) {
        gameState.player.y = 300;
        gameState.player.velocityY = 0;
        gameState.player.isJumping = false;
        gameState.currentGravity = gameState.normalGravity;
        gameState.player.jumpStartTime = null;
    }

    // Draw player
    ctx.drawImage(
        spriteImg,
        gameState.player.x,
        gameState.player.y,
        gameState.player.width,
        gameState.player.height
    );

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