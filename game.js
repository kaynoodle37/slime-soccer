// ============================================================================
// SLIME SOCCER - Retro Arcade Edition
// A 2D Physics-Based Sports Game
// Based on Product Requirements Document v1.0
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============================================================================
// PHYSICS CONSTANTS (Configurable as per PRD Section 8.2)
// ============================================================================
const PHYSICS = {
    GRAVITY: 0.8,
    FRICTION: 0.92,
    AIR_RESISTANCE: 0.998,
    BALL_RESTITUTION: 0.75,  // Bounciness
    SLIME_RESTITUTION: 0.6,
    MAX_VELOCITY: 15,
    SLIME_MOVE_SPEED: 0.8,
    SLIME_JUMP_POWER: 15,
};

// ============================================================================
// GAME CONSTANTS
// ============================================================================
const GAME = {
    WIDTH: canvas.width,
    HEIGHT: canvas.height,
    GROUND_Y: 600,
    GROUND_HEIGHT: 100,

    // Colors from PRD Section 6.1
    COLORS: {
        FIELD_BACKGROUND: '#3B82F6',
        GROUND: '#6B7280',
        PLAYER1: '#EF4444',  // Red - RIGHT SIDE
        PLAYER2: '#06B6D4',  // Cyan - LEFT SIDE
        BALL: '#FFFFFF',
        NET: '#4B5563',
    },

    // Goal specifications
    GOAL_WIDTH: 80,
    GOAL_HEIGHT: 200,
    GOAL_NET_DEPTH: 50,

    // Slime specifications
    SLIME_RADIUS: 60,

    // Ball specifications
    BALL_RADIUS: 18,

    // Anti-camping (PRD Section 6.6)
    CAMPING_WARNING_TIME: 180,  // 3 seconds at 60fps
    CAMPING_PENALTY_TIME: 300,  // 5 seconds at 60fps
};

// ============================================================================
// GAME STATE
// ============================================================================
let gameState = {
    currentScreen: 'mainMenu',  // mainMenu, instructions, setup, playing, paused, ended
    gameMode: 'single',          // single or multiplayer
    matchDuration: 180,          // seconds (default 3 minutes)
    timeRemaining: 180,
    score: { player1: 0, player2: 0 },
    isPaused: false,
    celebrationTimer: 0,
    goalScored: false,           // Prevent multiple goals from one ball entry
};

let player1, player2, ball, aiController;
let keys = {};
let lastTime = Date.now();

// ============================================================================
// SLIME CLASS (PRD Section 6.2)
// ============================================================================
class Slime {
    constructor(startX, color, side) {
        this.x = startX;
        this.y = GAME.GROUND_Y - GAME.SLIME_RADIUS;
        this.vx = 0;
        this.vy = 0;
        this.radius = GAME.SLIME_RADIUS;
        this.color = color;
        this.side = side;  // 'left' or 'right'

        // Movement properties
        this.onGround = false;
        this.moveSpeed = PHYSICS.SLIME_MOVE_SPEED;
        this.jumpPower = PHYSICS.SLIME_JUMP_POWER;

        // Grab mechanic (PRD Section 6.2)
        this.isGrabbing = false;
        this.aimAngle = side === 'left' ? -Math.PI / 4 : -Math.PI * 3 / 4;

        // Anti-camping system (PRD Section 6.6)
        this.campingTime = 0;
        this.campingWarning = false;
        this.campingPenalty = false;
        this.goalZoneX = side === 'left' ? GAME.GOAL_WIDTH + GAME.GOAL_NET_DEPTH : GAME.WIDTH - GAME.GOAL_WIDTH - GAME.GOAL_NET_DEPTH;

        // Animation
        this.squish = { x: 1, y: 1 };
        this.targetSquish = { x: 1, y: 1 };
    }

    update(deltaTime) {
        // Apply gravity
        if (!this.onGround) {
            this.vy += PHYSICS.GRAVITY;
        }

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Apply friction
        this.vx *= PHYSICS.FRICTION;

        // Constrain velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > PHYSICS.MAX_VELOCITY) {
            this.vx = (this.vx / speed) * PHYSICS.MAX_VELOCITY;
            this.vy = (this.vy / speed) * PHYSICS.MAX_VELOCITY;
        }

        // Ground collision
        if (this.y + this.radius >= GAME.GROUND_Y) {
            this.y = GAME.GROUND_Y - this.radius;
            this.vy = -this.vy * PHYSICS.SLIME_RESTITUTION;
            if (Math.abs(this.vy) < 0.5) {
                this.vy = 0;
                this.onGround = true;
            }
            // Squish animation on landing
            this.targetSquish = { x: 1.2, y: 0.8 };
        } else {
            this.onGround = false;
        }

        // Wall collision
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = -this.vx * 0.5;
        }
        if (this.x + this.radius > GAME.WIDTH) {
            this.x = GAME.WIDTH - this.radius;
            this.vx = -this.vx * 0.5;
        }

        // Ceiling collision
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = -this.vy * 0.5;
        }

        // Anti-camping detection (PRD Section 6.6)
        const inGoalZone = this.side === 'left' ?
            (this.x < this.goalZoneX) :
            (this.x > this.goalZoneX);

        if (inGoalZone) {
            this.campingTime++;
            if (this.campingTime > GAME.CAMPING_WARNING_TIME) {
                this.campingWarning = true;
            }
            if (this.campingTime > GAME.CAMPING_PENALTY_TIME) {
                this.campingPenalty = true;
            }
        } else {
            this.campingTime = Math.max(0, this.campingTime - 3);
            if (this.campingTime === 0) {
                this.campingWarning = false;
                this.campingPenalty = false;
            }
        }

        // Smooth squish animation
        this.squish.x += (this.targetSquish.x - this.squish.x) * 0.15;
        this.squish.y += (this.targetSquish.y - this.squish.y) * 0.15;
        this.targetSquish.x += (1 - this.targetSquish.x) * 0.1;
        this.targetSquish.y += (1 - this.targetSquish.y) * 0.1;
    }

    move(direction) {
        const speed = this.campingPenalty ? this.moveSpeed * 0.5 : this.moveSpeed;
        this.vx += direction * speed;
    }

    jump() {
        if (this.onGround) {
            this.vy = -this.jumpPower;
            this.onGround = false;
            this.targetSquish = { x: 0.8, y: 1.3 };
        }
    }

    // Grab mechanic with rotational control (PRD Section 6.2)
    tryGrab() {
        if (!ball.isGrabbed && this.distanceTo(ball) < this.radius + ball.radius + 20) {
            ball.grab(this);
            this.isGrabbing = true;
        }
    }

    rotateAim(direction) {
        if (this.isGrabbing && ball.isGrabbed && ball.grabbedBy === this) {
            this.aimAngle += direction * 0.08;
            // Clamp aim angle
            this.aimAngle = Math.max(-Math.PI, Math.min(0, this.aimAngle));
        }
    }

    releaseBall() {
        if (this.isGrabbing && ball.isGrabbed && ball.grabbedBy === this) {
            const power = 18;
            ball.release(this.aimAngle, power);
            this.isGrabbing = false;
        }
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw camping warning/penalty indicator
        if (this.campingPenalty) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2);
            ctx.fill();

            // Warning text
            ctx.fillStyle = '#EF4444';
            ctx.font = 'bold 18px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('PENALTY!', 0, -this.radius - 30);
        } else if (this.campingWarning) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#FFAA00';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('WARNING!', 0, -this.radius - 25);
        }

        // Draw aim indicator when grabbing
        if (this.isGrabbing && ball.isGrabbed && ball.grabbedBy === this) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const aimLength = this.radius + 50;
            ctx.lineTo(Math.cos(this.aimAngle) * aimLength, Math.sin(this.aimAngle) * aimLength);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            const arrowX = Math.cos(this.aimAngle) * aimLength;
            const arrowY = Math.sin(this.aimAngle) * aimLength;
            ctx.arc(arrowX, arrowY, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw slime body (semicircle)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Draw as ellipse for squish effect
        ctx.ellipse(0, 0, this.radius * this.squish.x, this.radius * this.squish.y, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw highlight/shine
        const gradient = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.3, 0,
            -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.6
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * this.squish.x, this.radius * this.squish.y, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw simple eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.radius * 0.2, -this.radius * 0.2, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.radius * 0.2, -this.radius * 0.2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================================================
// BALL CLASS (PRD Section 6.3)
// ============================================================================
class Ball {
    constructor() {
        this.reset();
        this.radius = GAME.BALL_RADIUS;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.isGrabbed = false;
        this.grabbedBy = null;
    }

    reset() {
        this.x = GAME.WIDTH / 2;
        this.y = GAME.HEIGHT / 3;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.isGrabbed = false;
        this.grabbedBy = null;
    }

    grab(slime) {
        this.isGrabbed = true;
        this.grabbedBy = slime;
        this.vx = 0;
        this.vy = 0;
    }

    release(angle, power) {
        this.isGrabbed = false;
        this.vx = Math.cos(angle) * power;
        this.vy = Math.sin(angle) * power;
        this.grabbedBy = null;
    }

    update() {
        if (this.isGrabbed && this.grabbedBy) {
            // Ball follows slime with rotational control
            const distance = this.grabbedBy.radius + this.radius + 10;
            this.x = this.grabbedBy.x + Math.cos(this.grabbedBy.aimAngle) * distance;
            this.y = this.grabbedBy.y + Math.sin(this.grabbedBy.aimAngle) * distance;
            this.rotation += 0.05;
            return;
        }

        // Physics when not grabbed
        this.vy += PHYSICS.GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Air resistance
        this.vx *= PHYSICS.AIR_RESISTANCE;
        this.vy *= PHYSICS.AIR_RESISTANCE;

        // Rotation based on velocity (PRD Section 6.3)
        this.rotationSpeed = this.vx * 0.05;
        this.rotation += this.rotationSpeed;

        // Ground collision
        if (this.y + this.radius >= GAME.GROUND_Y) {
            this.y = GAME.GROUND_Y - this.radius;
            this.vy = -this.vy * PHYSICS.BALL_RESTITUTION;
            this.vx *= 0.95;

            if (Math.abs(this.vy) < 0.5) {
                this.vy = 0;
            }
        }

        // Wall collisions (but not in goal areas)
        if (this.x - this.radius < 0 && this.y < GAME.GROUND_Y - GAME.GOAL_HEIGHT) {
            this.x = this.radius;
            this.vx = -this.vx * PHYSICS.BALL_RESTITUTION;
        }
        if (this.x + this.radius > GAME.WIDTH && this.y < GAME.GROUND_Y - GAME.GOAL_HEIGHT) {
            this.x = GAME.WIDTH - this.radius;
            this.vx = -this.vx * PHYSICS.BALL_RESTITUTION;
        }

        // Ceiling collision
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = -this.vy * PHYSICS.BALL_RESTITUTION;
        }

        // Collision with slimes
        this.collideWithSlime(player1);
        this.collideWithSlime(player2);
    }

    collideWithSlime(slime) {
        if (this.isGrabbed) return;

        const dx = this.x - slime.x;
        const dy = this.y - slime.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + slime.radius;

        if (distance < minDist) {
            // Collision detected - separate and transfer velocity
            const angle = Math.atan2(dy, dx);
            const overlap = minDist - distance;

            // Push ball away
            this.x += Math.cos(angle) * overlap;
            this.y += Math.sin(angle) * overlap;

            // Velocity transfer (PRD Section 6.3)
            const relativeVx = this.vx - slime.vx;
            const relativeVy = this.vy - slime.vy;

            const normalX = dx / distance;
            const normalY = dy / distance;

            const relativeVelocity = relativeVx * normalX + relativeVy * normalY;

            if (relativeVelocity < 0) {
                const impulse = 2 * relativeVelocity / (1 + 1); // Simplified for equal masses

                this.vx -= impulse * normalX;
                this.vy -= impulse * normalY;

                // Add slime velocity
                this.vx += slime.vx * 1.5;
                this.vy += slime.vy * 1.5;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw ball
        ctx.fillStyle = GAME.COLORS.BALL;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw ball pattern (pentagon)
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.radius * 0.8, Math.sin(angle) * this.radius * 0.8);
            ctx.stroke();
        }

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw grab indicator
        if (this.isGrabbed) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

// ============================================================================
// AI CONTROLLER (PRD Section 6.7)
// ============================================================================
class AIController {
    constructor(slime) {
        this.slime = slime;
        this.reactionDelay = 0;
        this.targetX = slime.x;
        this.decision = 'defend';
        this.skill = 0.5;  // Reduced from 0.7 to make AI easier
    }

    update() {
        this.reactionDelay--;

        if (this.reactionDelay <= 0) {
            this.makeDecision();
            this.reactionDelay = Math.floor(20 + Math.random() * 15);  // Slower reactions
        }

        this.execute();
    }

    makeDecision() {
        const scoreDiff = gameState.score.player2 - gameState.score.player1;
        const ballInMyHalf = ball.x < GAME.WIDTH / 2;  // CPU is on LEFT side
        const ballVx = ball.vx;

        // Adaptability: attacking when behind, defending when ahead
        if (scoreDiff < -1 && gameState.timeRemaining < 60) {
            this.decision = 'attack';
        } else if (scoreDiff > 1) {
            this.decision = 'defend';
        } else if (ballInMyHalf) {
            this.decision = 'intercept';
        } else {
            this.decision = 'defend';
        }

        // Predict ball trajectory
        let predictedX = ball.x + ballVx * 20;

        // Set target position based on decision
        switch (this.decision) {
            case 'attack':
                this.targetX = Math.max(ball.x - 50, 150);
                break;
            case 'intercept':
                this.targetX = Math.min(GAME.WIDTH / 2 - 100, predictedX);
                break;
            case 'defend':
                const defenseX = 200;
                this.targetX = ballInMyHalf ? predictedX : defenseX;
                break;
        }

        // Clamp to own half (LEFT side for CPU)
        this.targetX = Math.max(this.slime.radius + 20,
                               Math.min(GAME.WIDTH / 2 - this.slime.radius, this.targetX));
    }

    execute() {
        // Movement
        const dx = this.targetX - this.slime.x;
        if (Math.abs(dx) > 20) {  // Larger dead zone
            this.slime.move(dx > 0 ? 1 : -1);
        }

        // Jumping - less accurate
        const distToBall = this.slime.distanceTo(ball);
        const shouldJump = distToBall < 180 &&
                          ball.y < this.slime.y - 40 &&
                          this.slime.onGround &&
                          Math.random() < this.skill;

        if (shouldJump) {
            this.slime.jump();
        }

        // Grab ball - less aggressive
        if (distToBall < this.slime.radius + ball.radius + 30 && !ball.isGrabbed && Math.random() < 0.7) {
            this.slime.tryGrab();
        }

        // Aim and release - aim at RIGHT goal
        if (this.slime.isGrabbing && ball.isGrabbed && ball.grabbedBy === this.slime) {
            // Aim toward RIGHT goal (opponent's goal)
            const goalX = GAME.WIDTH - 50;  // Right goal
            const targetAngle = Math.atan2(GAME.GROUND_Y - 150 - this.slime.y, goalX - this.slime.x);
            const angleDiff = targetAngle - this.slime.aimAngle;

            if (Math.abs(angleDiff) > 0.15) {  // Less precise
                this.slime.rotateAim(angleDiff > 0 ? 1 : -1);
            } else {
                // More mistakes for fairness
                if (Math.random() < 0.85) {  // Reduced from 0.95
                    this.slime.releaseBall();
                }
            }
        }
    }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================
function drawField() {
    // Field background
    ctx.fillStyle = GAME.COLORS.FIELD_BACKGROUND;
    ctx.fillRect(0, 0, GAME.WIDTH, GAME.GROUND_Y);

    // Ground
    ctx.fillStyle = GAME.COLORS.GROUND;
    ctx.fillRect(0, GAME.GROUND_Y, GAME.WIDTH, GAME.GROUND_HEIGHT);

    // Ground line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GAME.GROUND_Y);
    ctx.lineTo(GAME.WIDTH, GAME.GROUND_Y);
    ctx.stroke();

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(GAME.WIDTH / 2, 0);
    ctx.lineTo(GAME.WIDTH / 2, GAME.GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(GAME.WIDTH / 2, GAME.GROUND_Y, 100, 0, -Math.PI, true);
    ctx.stroke();
}

function drawGoals() {
    const goalY = GAME.GROUND_Y - GAME.GOAL_HEIGHT;

    // Left goal
    // Goal area background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, goalY, GAME.GOAL_NET_DEPTH, GAME.GOAL_HEIGHT);

    // Net pattern
    ctx.strokeStyle = GAME.COLORS.NET;
    ctx.lineWidth = 2;
    // Horizontal lines
    for (let y = goalY; y <= GAME.GROUND_Y; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME.GOAL_NET_DEPTH, y);
        ctx.stroke();
    }
    // Vertical lines
    for (let x = 0; x <= GAME.GOAL_NET_DEPTH; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, goalY);
        ctx.lineTo(x, GAME.GROUND_Y);
        ctx.stroke();
    }

    // Goal post
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(GAME.GOAL_NET_DEPTH, goalY);
    ctx.lineTo(GAME.GOAL_NET_DEPTH, GAME.GROUND_Y);
    ctx.stroke();

    // Right goal
    const rightGoalX = GAME.WIDTH - GAME.GOAL_NET_DEPTH;

    // Goal area background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(rightGoalX, goalY, GAME.GOAL_NET_DEPTH, GAME.GOAL_HEIGHT);

    // Net pattern
    ctx.strokeStyle = GAME.COLORS.NET;
    ctx.lineWidth = 2;
    // Horizontal lines
    for (let y = goalY; y <= GAME.GROUND_Y; y += 20) {
        ctx.beginPath();
        ctx.moveTo(rightGoalX, y);
        ctx.lineTo(GAME.WIDTH, y);
        ctx.stroke();
    }
    // Vertical lines
    for (let x = rightGoalX; x <= GAME.WIDTH; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, goalY);
        ctx.lineTo(x, GAME.GROUND_Y);
        ctx.stroke();
    }

    // Goal post
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rightGoalX, goalY);
    ctx.lineTo(rightGoalX, GAME.GROUND_Y);
    ctx.stroke();
}

function drawHUD() {
    // Score (PRD Section 7.3)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 72px Courier New';
    ctx.textAlign = 'center';
    // Player 2 (left) - Player 1 (right)
    ctx.fillText(`${gameState.score.player2} - ${gameState.score.player1}`, GAME.WIDTH / 2, 80);

    // Timer
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = Math.floor(gameState.timeRemaining % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    ctx.font = 'bold 36px Courier New';
    ctx.fillText(timeStr, GAME.WIDTH / 2, 130);

    // Player labels
    ctx.font = 'bold 24px Courier New';
    ctx.fillStyle = GAME.COLORS.PLAYER2;
    ctx.textAlign = 'left';
    const p2Label = gameState.gameMode === 'single' ? 'CPU' : 'PLAYER 2';
    ctx.fillText(p2Label, 30, 40);

    ctx.fillStyle = GAME.COLORS.PLAYER1;
    ctx.textAlign = 'right';
    const p1Label = gameState.gameMode === 'single' ? 'PLAYER' : 'PLAYER 1';
    ctx.fillText(p1Label, GAME.WIDTH - 30, 40);

    // Pause hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to Pause', GAME.WIDTH / 2, GAME.HEIGHT - 20);
}

function drawCelebration() {
    if (gameState.celebrationTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${gameState.celebrationTimer / 60})`;
        ctx.font = 'bold 96px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', GAME.WIDTH / 2, GAME.HEIGHT / 2);
    }
}

// ============================================================================
// GAME LOGIC
// ============================================================================
function checkGoal() {
    if (gameState.goalScored) return false;  // Prevent multiple goals

    const goalY = GAME.GROUND_Y - GAME.GOAL_HEIGHT;

    // Left goal - Player 1 (right side) scores here
    if (ball.x - ball.radius < GAME.GOAL_NET_DEPTH &&
        ball.y > goalY &&
        ball.y < GAME.GROUND_Y) {
        scoreGoal('player1');
        return true;
    }

    // Right goal - Player 2/CPU (left side) scores here
    if (ball.x + ball.radius > GAME.WIDTH - GAME.GOAL_NET_DEPTH &&
        ball.y > goalY &&
        ball.y < GAME.GROUND_Y) {
        scoreGoal('player2');
        return true;
    }

    return false;
}

function scoreGoal(scorer) {
    gameState.score[scorer]++;
    gameState.celebrationTimer = 90;  // 1.5 seconds at 60fps
    gameState.goalScored = true;      // Mark that a goal was scored

    // Reset positions after brief delay
    setTimeout(resetPositions, 1000);
}

function resetPositions() {
    ball.reset();
    player1.x = GAME.WIDTH * 3 / 4;  // Player 1 on RIGHT
    player1.y = GAME.GROUND_Y - player1.radius;
    player1.vx = 0;
    player1.vy = 0;
    player1.isGrabbing = false;
    player1.campingTime = 0;
    player1.campingWarning = false;
    player1.campingPenalty = false;

    player2.x = GAME.WIDTH / 4;  // Player 2/CPU on LEFT
    player2.y = GAME.GROUND_Y - player2.radius;
    player2.vx = 0;
    player2.vy = 0;
    player2.isGrabbing = false;
    player2.campingTime = 0;
    player2.campingWarning = false;
    player2.campingPenalty = false;

    gameState.goalScored = false;  // Reset goal flag
}

function initGame() {
    player1 = new Slime(GAME.WIDTH * 3 / 4, GAME.COLORS.PLAYER1, 'right');  // Player 1 on RIGHT
    player2 = new Slime(GAME.WIDTH / 4, GAME.COLORS.PLAYER2, 'left');       // Player 2/CPU on LEFT
    ball = new Ball();

    if (gameState.gameMode === 'single') {
        aiController = new AIController(player2);  // AI controls left side (cyan)
    } else {
        aiController = null;
    }

    gameState.score = { player1: 0, player2: 0 };
    gameState.timeRemaining = gameState.matchDuration;
    gameState.isPaused = false;
    gameState.celebrationTimer = 0;
    gameState.goalScored = false;
}

// ============================================================================
// MAIN GAME LOOP
// ============================================================================
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);  // Cap delta time
    lastTime = currentTime;

    // Always render
    drawField();
    drawGoals();

    if (gameState.currentScreen === 'playing') {
        if (!gameState.isPaused) {
            // Update timer
            gameState.timeRemaining -= deltaTime;
            if (gameState.timeRemaining <= 0) {
                gameState.timeRemaining = 0;
                endGame();
            }

            // Update celebration
            if (gameState.celebrationTimer > 0) {
                gameState.celebrationTimer--;
            }

            // Update game objects
            player1.update(deltaTime);
            player2.update(deltaTime);
            ball.update();

            // AI update
            if (aiController) {
                aiController.update();
            }

            // Check for goals
            checkGoal();
        }

        // Draw game objects
        player1.draw();
        player2.draw();
        ball.draw();
        drawHUD();
        drawCelebration();
    }

    requestAnimationFrame(gameLoop);
}

// ============================================================================
// INPUT HANDLING (PRD Section 6.4)
// ============================================================================
function handleInput() {
    if (gameState.currentScreen !== 'playing' || gameState.isPaused) {
        requestAnimationFrame(handleInput);
        return;
    }

    // Player 1 controls (Arrow keys) - RIGHT SIDE RED
    const p1Grabbing = player1.isGrabbing && ball.isGrabbed && ball.grabbedBy === player1;

    // Movement (works whether grabbing or not)
    if (keys['ArrowLeft']) {
        player1.move(-1);
        if (p1Grabbing) {
            player1.rotateAim(-1);  // Also rotate while moving
        }
    }
    if (keys['ArrowRight']) {
        player1.move(1);
        if (p1Grabbing) {
            player1.rotateAim(1);  // Also rotate while moving
        }
    }
    if (keys['ArrowDown']) {
        if (!player1.isGrabbing) {
            player1.tryGrab();
        }
    }

    // Player 2 controls (WASD - only in multiplayer) - LEFT SIDE CYAN
    if (gameState.gameMode === 'multiplayer') {
        const p2Grabbing = player2.isGrabbing && ball.isGrabbed && ball.grabbedBy === player2;

        // Movement (works whether grabbing or not)
        if (keys['a'] || keys['A']) {
            player2.move(-1);
            if (p2Grabbing) {
                player2.rotateAim(-1);  // Also rotate while moving
            }
        }
        if (keys['d'] || keys['D']) {
            player2.move(1);
            if (p2Grabbing) {
                player2.rotateAim(1);  // Also rotate while moving
            }
        }
        if (keys['s'] || keys['S']) {
            if (!player2.isGrabbing) {
                player2.tryGrab();
            }
        }
    }

    requestAnimationFrame(handleInput);
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (gameState.currentScreen === 'playing') {
        // Player 1 jump (Arrow keys - Up Arrow)
        if (e.key === 'ArrowUp') {
            player1.jump();
            e.preventDefault();
        }

        // Player 2 jump (WASD - only in multiplayer)
        if (gameState.gameMode === 'multiplayer' && (e.key === 'w' || e.key === 'W')) {
            player2.jump();
            e.preventDefault();
        }

        // Pause
        if (e.key === 'Escape') {
            togglePause();
            e.preventDefault();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;

    if (gameState.currentScreen === 'playing') {
        // Release ball when key is released
        if (e.key === 'ArrowDown' && player1.isGrabbing) {
            player1.releaseBall();
        }

        if (gameState.gameMode === 'multiplayer' && (e.key === 's' || e.key === 'S') && player2.isGrabbing) {
            player2.releaseBall();
        }
    }
});

// ============================================================================
// MENU SYSTEM (PRD Section 7)
// ============================================================================
function showScreen(screenId) {
    const screens = ['mainMenu', 'instructionsScreen', 'setupScreen', 'pauseScreen', 'endScreen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    if (screenId) {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

function togglePause() {
    if (gameState.currentScreen !== 'playing') return;

    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        showScreen('pauseScreen');
    } else {
        showScreen(null);
    }
}

function endGame() {
    gameState.currentScreen = 'ended';

    const winner = document.getElementById('winner');
    const finalScore = document.getElementById('finalScore');

    if (gameState.score.player1 > gameState.score.player2) {
        winner.textContent = (gameState.gameMode === 'single' ? 'PLAYER' : 'PLAYER 1') + ' WINS!';
        winner.style.color = GAME.COLORS.PLAYER1;
    } else if (gameState.score.player2 > gameState.score.player1) {
        winner.textContent = (gameState.gameMode === 'single' ? 'CPU' : 'PLAYER 2') + ' WINS!';
        winner.style.color = GAME.COLORS.PLAYER2;
    } else {
        winner.textContent = "IT'S A TIE!";
        winner.style.color = '#FFD700';
    }

    finalScore.textContent = `${gameState.score.player1} - ${gameState.score.player2}`;
    showScreen('endScreen');
}

// Main Menu event listeners
document.getElementById('btnSinglePlayer').addEventListener('click', () => {
    gameState.gameMode = 'single';
    document.getElementById('btnSinglePlayer').classList.add('selected');
    document.getElementById('btnMultiplayer').classList.remove('selected');
});

document.getElementById('btnMultiplayer').addEventListener('click', () => {
    gameState.gameMode = 'multiplayer';
    document.getElementById('btnMultiplayer').classList.add('selected');
    document.getElementById('btnSinglePlayer').classList.remove('selected');
});

document.getElementById('btnInstructions').addEventListener('click', () => {
    gameState.currentScreen = 'instructions';
    showScreen('instructionsScreen');
});

document.getElementById('btnBackFromInstructions').addEventListener('click', () => {
    gameState.currentScreen = 'mainMenu';
    showScreen('mainMenu');
});

// Setup screen - show when mode selected and next clicked
document.getElementById('btnSinglePlayer').addEventListener('dblclick', () => {
    gameState.currentScreen = 'setup';
    showScreen('setupScreen');
    // Select default duration (3 minutes)
    document.querySelectorAll('.duration-btn').forEach(btn => {
        if (btn.getAttribute('data-time') === '180') {
            btn.classList.add('selected');
        }
    });
});

document.getElementById('btnMultiplayer').addEventListener('dblclick', () => {
    gameState.currentScreen = 'setup';
    showScreen('setupScreen');
    document.querySelectorAll('.duration-btn').forEach(btn => {
        if (btn.getAttribute('data-time') === '180') {
            btn.classList.add('selected');
        }
    });
});

// Add single click to go to setup
document.getElementById('btnSinglePlayer').addEventListener('click', () => {
    setTimeout(() => {
        gameState.currentScreen = 'setup';
        showScreen('setupScreen');
        document.querySelectorAll('.duration-btn').forEach(btn => {
            if (btn.getAttribute('data-time') === '180') {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }, 300);
});

document.getElementById('btnMultiplayer').addEventListener('click', () => {
    setTimeout(() => {
        gameState.currentScreen = 'setup';
        showScreen('setupScreen');
        document.querySelectorAll('.duration-btn').forEach(btn => {
            if (btn.getAttribute('data-time') === '180') {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }, 300);
});

// Duration selection
document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        gameState.matchDuration = parseInt(this.getAttribute('data-time'));
    });
});

document.getElementById('btnStartMatch').addEventListener('click', () => {
    gameState.currentScreen = 'playing';
    showScreen(null);
    initGame();
    lastTime = Date.now();
});

document.getElementById('btnBackToMain').addEventListener('click', () => {
    gameState.currentScreen = 'mainMenu';
    showScreen('mainMenu');
});

// Pause screen
document.getElementById('btnResume').addEventListener('click', () => {
    togglePause();
});

document.getElementById('btnQuitToMenu').addEventListener('click', () => {
    gameState.currentScreen = 'mainMenu';
    gameState.isPaused = false;
    showScreen('mainMenu');
});

// End game screen
document.getElementById('btnPlayAgain').addEventListener('click', () => {
    gameState.currentScreen = 'playing';
    showScreen(null);
    initGame();
    lastTime = Date.now();
});

document.getElementById('btnReturnToMenu').addEventListener('click', () => {
    gameState.currentScreen = 'mainMenu';
    showScreen('mainMenu');
});

// ============================================================================
// INITIALIZATION
// ============================================================================
gameLoop();
handleInput();
