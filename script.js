class EnhancedDinoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.levelElement = document.getElementById('level');
        this.livesElement = document.getElementById('lives');
        this.progressBar = document.getElementById('progressBar');
        this.difficultySelect = document.getElementById('difficultySelect');

        // Set canvas size responsively
        this.resizeCanvas();

        // Game state
        this.gameRunning = false;
        this.gameOver = false;
        this.gamePaused = false;
        this.score = 0;
        this.highScore = localStorage.getItem('dinoHighScore') || 0;
        this.level = 1;
        this.lives = 3;
        this.baseSpeed = 3;
        this.gameSpeed = 3;
        this.nightMode = false;
        this.soundEnabled = true;

        // Difficulty settings
        this.difficulty = 'normal';
        this.difficultySettings = {
            easy: { speedMultiplier: 0.7, obstacleFrequency: 150, livesBonus: 2 },
            normal: { speedMultiplier: 1.0, obstacleFrequency: 120, livesBonus: 0 },
            hard: { speedMultiplier: 1.3, obstacleFrequency: 90, livesBonus: -1 },
            extreme: { speedMultiplier: 1.6, obstacleFrequency: 60, livesBonus: -2 }
        };

        // Scale factor for responsive design
        this.scale = Math.min(this.canvas.width / 800, this.canvas.height / 200);

        // Dino properties (scaled)
        this.dino = {
            x: 50 * this.scale,
            y: 150 * this.scale,
            width: 40 * this.scale,
            height: 40 * this.scale,
            groundY: 150 * this.scale,
            jumping: false,
            ducking: false,
            jumpVelocity: 0,
            gravity: 0.6 * this.scale,
            hasShield: false,
            shieldTime: 0
        };

        // Game elements
        this.obstacles = [];
        this.powerUps = [];
        this.obstacleTimer = 0;
        this.powerUpTimer = 0;
        this.groundX = 0;

        // Power-ups inventory
        this.powerUpInventory = {
            speedBoost: 0,
            shield: 0,
            slowMo: 0
        };

        // Effects
        this.effects = {
            speedBoost: false,
            slowMo: false,
            speedBoostTime: 0,
            slowMoTime: 0
        };

        // Achievements
        this.achievements = [
            { id: 'first100', name: 'Getting Started', description: 'Score 100 points', threshold: 100, unlocked: false },
            { id: 'first500', name: 'Warming Up', description: 'Score 500 points', threshold: 500, unlocked: false },
            { id: 'first1000', name: 'Dino Master', description: 'Score 1000 points', threshold: 1000, unlocked: false },
            { id: 'level5', name: 'Survivor', description: 'Reach level 5', threshold: 5, unlocked: false, type: 'level' }
        ];

        this.init();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(container.clientWidth - 40, 800);
        const aspectRatio = 800 / 200;

        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth / aspectRatio;

        // Ensure minimum size for mobile
        if (this.canvas.height < 150) {
            this.canvas.height = 150;
            this.canvas.width = this.canvas.height * aspectRatio;
        }
    }

    init() {
        this.updateDisplay();
        this.setupEventListeners();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.scale = Math.min(this.canvas.width / 800, this.canvas.height / 200);
            this.updateDinoScale();
        });
        this.gameLoop();
    }

    updateDinoScale() {
        this.dino.x = 50 * this.scale;
        this.dino.y = 150 * this.scale;
        this.dino.width = 40 * this.scale;
        this.dino.height = 40 * this.scale;
        this.dino.groundY = 150 * this.scale;
        this.dino.gravity = 0.6 * this.scale;
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.jump();
            }
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.duck();
            }
            if (e.code === 'Digit1') {
                e.preventDefault();
                this.usePowerUp('speedBoost');
            }
            if (e.code === 'Digit2') {
                e.preventDefault();
                this.usePowerUp('shield');
            }
            if (e.code === 'Digit3') {
                e.preventDefault();
                this.usePowerUp('slowMo');
            }
            if (e.code === 'KeyP') {
                e.preventDefault();
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.dino.ducking = false;
                this.dino.height = 40 * this.scale;
            }
        });

        // Mobile controls
        document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        });

        document.getElementById('jumpBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.jump();
        });

        document.getElementById('duckBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.duck();
        });

        document.getElementById('duckBtn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.dino.ducking = false;
            this.dino.height = 40 * this.scale;
        });

        document.getElementById('duckBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.duck();
        });

        // Power-up buttons (touch and click)
        document.getElementById('speedBoostBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.usePowerUp('speedBoost');
        });

        document.getElementById('shieldBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.usePowerUp('shield');
        });

        document.getElementById('slowMoBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.usePowerUp('slowMo');
        });

        // Canvas touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        });

        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.jump();
        });

        // Other controls
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.resetLives();
        });

        document.getElementById('soundToggle').addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            document.getElementById('soundToggle').textContent = this.soundEnabled ? '🔊' : '🔇';
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    resetLives() {
        const settings = this.difficultySettings[this.difficulty];
        this.lives = Math.max(1, 3 + settings.livesBonus);
        this.updateDisplay();
    }

    jump() {
        if (!this.gameRunning && !this.gameOver) {
            this.startGame();
        } else if (this.gameRunning && !this.dino.jumping && !this.gamePaused) {
            this.dino.jumping = true;
            this.dino.jumpVelocity = -12 * this.scale;
            this.playSound('jump');
        } else if (this.gameOver) {
            this.restartGame();
        }
    }

    duck() {
        if (this.gameRunning && !this.dino.jumping && !this.gamePaused) {
            this.dino.ducking = true;
            this.dino.height = 25 * this.scale;
        }
    }

    usePowerUp(type) {
        if (this.powerUpInventory[type] > 0 && this.gameRunning && !this.gamePaused) {
            this.powerUpInventory[type]--;

            switch (type) {
                case 'speedBoost':
                    this.effects.speedBoost = true;
                    this.effects.speedBoostTime = 300;
                    break;
                case 'shield':
                    this.dino.hasShield = true;
                    this.dino.shieldTime = 300;
                    break;
                case 'slowMo':
                    this.effects.slowMo = true;
                    this.effects.slowMoTime = 300;
                    break;
            }

            this.updateDisplay();
            this.playSound('powerup');
        }
    }

    togglePause() {
        if (this.gameRunning) {
            this.gamePaused = !this.gamePaused;
            document.getElementById('pauseBtn').textContent = this.gamePaused ? '▶️' : '⏸️';
        }
    }

    startGame() {
        this.gameRunning = true;
        this.gameOver = false;
        this.gamePaused = false;
        this.score = 0;
        this.level = 1;
        this.resetLives();
        this.baseSpeed = 3 * this.scale;
        this.gameSpeed = 3 * this.scale;
        this.obstacles = [];
        this.powerUps = [];
        this.obstacleTimer = 0;
        this.powerUpTimer = 0;
        this.effects = { speedBoost: false, slowMo: false, speedBoostTime: 0, slowMoTime: 0 };
        this.dino.hasShield = false;
        this.dino.shieldTime = 0;
        this.dino.y = this.dino.groundY;
        this.updateDisplay();
    }

    restartGame() {
        this.gameOver = false;
        this.startGame();
    }

    updateDino() {
        if (this.gamePaused) return;

        // Handle jumping
        if (this.dino.jumping) {
            this.dino.y += this.dino.jumpVelocity;
            this.dino.jumpVelocity += this.dino.gravity;

            if (this.dino.y >= this.dino.groundY) {
                this.dino.y = this.dino.groundY;
                this.dino.jumping = false;
                this.dino.jumpVelocity = 0;
            }
        }

        // Handle ducking
        if (this.dino.ducking && !this.dino.jumping) {
            this.dino.y = this.dino.groundY + 15 * this.scale;
        } else if (!this.dino.jumping) {
            this.dino.y = this.dino.groundY;
        }

        // Update shield
        if (this.dino.hasShield) {
            this.dino.shieldTime--;
            if (this.dino.shieldTime <= 0) {
                this.dino.hasShield = false;
            }
        }
    }

    updateObstacles() {
        if (this.gamePaused) return;

        this.obstacleTimer++;
        const settings = this.difficultySettings[this.difficulty];
        const frequency = settings.obstacleFrequency - Math.floor(this.level * 10);

        if (this.obstacleTimer > Math.max(30, frequency)) {
            const obstacleType = Math.random() < 0.3 ? 'tall' : 'normal';
            this.obstacles.push({
                x: this.canvas.width,
                y: obstacleType === 'tall' ? 120 * this.scale : 160 * this.scale,
                width: 20 * this.scale,
                height: obstacleType === 'tall' ? 70 * this.scale : 30 * this.scale,
                type: obstacleType
            });
            this.obstacleTimer = 0;
        }

        // Move obstacles
        const currentSpeed = this.effects.slowMo ? this.gameSpeed * 0.3 : this.gameSpeed;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].x -= currentSpeed;

            if (this.obstacles[i].x + this.obstacles[i].width < 0) {
                this.obstacles.splice(i, 1);
                this.score += 10;
            }
        }
    }

    updatePowerUps() {
        if (this.gamePaused) return;

        this.powerUpTimer++;

        // Spawn power-ups more frequently
        if (this.powerUpTimer > 400 && Math.random() < 0.05) {
            const types = ['speedBoost', 'shield', 'slowMo'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerUps.push({
                x: this.canvas.width,
                y: 140 * this.scale,
                width: 25 * this.scale,
                height: 25 * this.scale,
                type: type
            });
            this.powerUpTimer = 0;
        }

        // Move power-ups
        const currentSpeed = this.effects.slowMo ? this.gameSpeed * 0.3 : this.gameSpeed;
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            this.powerUps[i].x -= currentSpeed;

            if (this.powerUps[i].x + this.powerUps[i].width < 0) {
                this.powerUps.splice(i, 1);
            }
        }
    }

    updateEffects() {
        if (this.gamePaused) return;

        if (this.effects.speedBoost) {
            this.effects.speedBoostTime--;
            if (this.effects.speedBoostTime <= 0) {
                this.effects.speedBoost = false;
            }
        }

        if (this.effects.slowMo) {
            this.effects.slowMoTime--;
            if (this.effects.slowMoTime <= 0) {
                this.effects.slowMo = false;
            }
        }
    }

    checkCollisions() {
        if (this.gamePaused) return;

        // Check obstacle collisions with proper hitbox
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            const dinoLeft = this.dino.x + 5 * this.scale;
            const dinoRight = this.dino.x + this.dino.width - 5 * this.scale;
            const dinoTop = this.dino.y + 5 * this.scale;
            const dinoBottom = this.dino.y + this.dino.height - 5 * this.scale;

            if (dinoLeft < obstacle.x + obstacle.width &&
                dinoRight > obstacle.x &&
                dinoTop < obstacle.y + obstacle.height &&
                dinoBottom > obstacle.y) {

                if (this.dino.hasShield) {
                    this.dino.hasShield = false;
                    this.dino.shieldTime = 0;
                    this.obstacles.splice(i, 1);
                    this.playSound('shield');
                    this.shakeScreen();
                } else {
                    this.loseLife();
                }
                break;
            }
        }

        // Check power-up collisions with proper hitbox
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            const dinoLeft = this.dino.x;
            const dinoRight = this.dino.x + this.dino.width;
            const dinoTop = this.dino.y;
            const dinoBottom = this.dino.y + this.dino.height;

            if (dinoLeft < powerUp.x + powerUp.width &&
                dinoRight > powerUp.x &&
                dinoTop < powerUp.y + powerUp.height &&
                dinoBottom > powerUp.y) {

                this.powerUpInventory[powerUp.type]++;
                this.powerUps.splice(i, 1);
                this.playSound('collect');
                this.updateDisplay();
                break;
            }
        }
    }

    loseLife() {
        this.lives--;
        this.playSound('hit');
        this.shakeScreen();

        if (this.lives <= 0) {
            this.gameOver = true;
            this.gameRunning = false;

            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('dinoHighScore', this.highScore);
            }
        } else {
            this.dino.hasShield = true;
            this.dino.shieldTime = 120;
        }

        this.updateDisplay();
    }

    updateGameSpeed() {
        if (this.gamePaused) return;

        const settings = this.difficultySettings[this.difficulty];
        this.level = Math.floor(this.score / 300) + 1;
        this.baseSpeed = (3 + Math.floor(this.score / 100) * 0.5) * this.scale;
        this.gameSpeed = this.baseSpeed * settings.speedMultiplier;

        if (this.effects.speedBoost) {
            this.gameSpeed *= 1.5;
        }

        const progress = (this.score % 300) / 300 * 100;
        this.progressBar.style.width = progress + '%';

        const shouldBeNight = Math.floor(this.score / 700) % 2 === 1;
        if (shouldBeNight !== this.nightMode) {
            this.nightMode = shouldBeNight;
            this.toggleNightMode();
        }

        this.checkAchievements();
    }

    checkAchievements() {
        for (let achievement of this.achievements) {
            if (!achievement.unlocked) {
                const value = achievement.type === 'level' ? this.level : this.score;
                if (value >= achievement.threshold) {
                    achievement.unlocked = true;
                    this.showAchievement(achievement);
                }
            }
        }
    }

    showAchievement(achievement) {
        const notification = document.getElementById('achievementNotification');
        const text = notification.querySelector('.achievement-text');
        text.textContent = achievement.name + ' - ' + achievement.description;

        notification.classList.remove('hidden');
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300);
        }, 3000);

        this.playSound('achievement');
    }

    toggleNightMode() {
        document.body.classList.toggle('night-mode', this.nightMode);
    }

    shakeScreen() {
        this.canvas.classList.add('shake');
        setTimeout(() => {
            this.canvas.classList.remove('shake');
        }, 500);
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            switch (type) {
                case 'jump':
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                    break;
                case 'hit':
                    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                    break;
                case 'collect':
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    break;
                case 'powerup':
                    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
                    break;
                case 'shield':
                    oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
                    break;
                case 'achievement':
                    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                    break;
            }

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    updateDisplay() {
        this.scoreElement.textContent = this.score;
        this.highScoreElement.textContent = this.highScore;
        this.levelElement.textContent = this.level;
        this.livesElement.textContent = this.lives;

        document.getElementById('speedBoost').textContent = this.powerUpInventory.speedBoost;
        document.getElementById('shield').textContent = this.powerUpInventory.shield;
        document.getElementById('slowMo').textContent = this.powerUpInventory.slowMo;
    }

    drawDino() {
        if (this.dino.hasShield) {
            this.ctx.strokeStyle = '#4facfe';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.dino.x + this.dino.width / 2, this.dino.y + this.dino.height / 2, 30 * this.scale, 0, 2 * Math.PI);
            this.ctx.stroke();
        }

        this.ctx.fillStyle = this.nightMode ? '#f7f7f7' : '#535353';
        this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);

        const headSize = 8 * this.scale;
        const eyeSize = 3 * this.scale;
        const legSize = 8 * this.scale;

        this.ctx.fillRect(this.dino.x + 35 * this.scale, this.dino.y - 10 * this.scale, headSize, 10 * this.scale);
        this.ctx.fillRect(this.dino.x + 5 * this.scale, this.dino.y + 35 * this.scale, legSize, 10 * this.scale);
        this.ctx.fillRect(this.dino.x + 25 * this.scale, this.dino.y + 35 * this.scale, legSize, 10 * this.scale);
        this.ctx.fillRect(this.dino.x + 30 * this.scale, this.dino.y + 5 * this.scale, eyeSize, eyeSize);
    }

    drawObstacles() {
        this.ctx.fillStyle = this.nightMode ? '#f7f7f7' : '#535353';
        for (let obstacle of this.obstacles) {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

            if (obstacle.type === 'tall') {
                this.ctx.fillRect(obstacle.x + 5 * this.scale, obstacle.y - 5 * this.scale, 10 * this.scale, 5 * this.scale);
                this.ctx.fillRect(obstacle.x + 2 * this.scale, obstacle.y + 10 * this.scale, 16 * this.scale, 3 * this.scale);
            }
        }
    }

    drawPowerUps() {
        for (let powerUp of this.powerUps) {
            this.ctx.fillStyle = '#4facfe';
            this.ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = `${16 * this.scale}px Arial`;
            this.ctx.textAlign = 'center';
            const icon = powerUp.type === 'speedBoost' ? '⚡' :
                powerUp.type === 'shield' ? '🛡️' : '⏱️';
            this.ctx.fillText(icon, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2 + 5 * this.scale);
        }
    }

    drawEffects() {
        if (this.effects.speedBoost) {
            this.ctx.strokeStyle = '#ff6b6b';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.dino.x - (10 + i * 3) * this.scale, this.dino.y + (10 + i * 5) * this.scale);
                this.ctx.lineTo(this.dino.x - (20 + i * 3) * this.scale, this.dino.y + (15 + i * 5) * this.scale);
                this.ctx.stroke();
            }
        }

        if (this.effects.slowMo) {
            this.ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawGround() {
        const currentSpeed = this.effects.slowMo ? this.gameSpeed * 0.3 : this.gameSpeed;
        this.groundX -= currentSpeed;
        if (this.groundX <= -20 * this.scale) this.groundX = 0;

        this.ctx.fillStyle = this.nightMode ? '#f7f7f7' : '#535353';
        this.ctx.fillRect(0, 190 * this.scale, this.canvas.width, 2 * this.scale);

        for (let x = this.groundX; x < this.canvas.width; x += 20 * this.scale) {
            this.ctx.fillRect(x, 192 * this.scale, 10 * this.scale, 2 * this.scale);
            this.ctx.fillRect(x + 5 * this.scale, 194 * this.scale, 5 * this.scale, 1 * this.scale);
        }
    }

    drawUI() {
        if (this.gamePaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = `${40 * this.scale}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = `${16 * this.scale}px Arial`;
            this.ctx.fillText('Tap to resume', this.canvas.width / 2, this.canvas.height / 2 + 30 * this.scale);
        }
    }

    drawGameOver() {
        this.ctx.fillStyle = this.nightMode ? '#f7f7f7' : '#535353';
        this.ctx.font = `${30 * this.scale}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20 * this.scale);
        this.ctx.font = `${16 * this.scale}px Arial`;
        this.ctx.fillText(`Final Score: ${this.score} | Level: ${this.level}`, this.canvas.width / 2, this.canvas.height / 2 + 10 * this.scale);
        this.ctx.fillText('Tap to restart', this.canvas.width / 2, this.canvas.height / 2 + 40 * this.scale);
    }

    drawStartScreen() {
        this.ctx.fillStyle = this.nightMode ? '#f7f7f7' : '#535353';
        this.ctx.font = `${24 * this.scale}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Enhanced Chrome Dino Game', this.canvas.width / 2, this.canvas.height / 2 - 20 * this.scale);
        this.ctx.font = `${16 * this.scale}px Arial`;
        this.ctx.fillText('Tap to start', this.canvas.width / 2, this.canvas.height / 2 + 20 * this.scale);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    gameLoop() {
        this.clearCanvas();

        if (!this.gameRunning && !this.gameOver) {
            this.drawStartScreen();
            this.drawDino();
            this.drawGround();
        } else if (this.gameRunning) {
            this.updateDino();
            this.updateObstacles();
            this.updatePowerUps();
            this.updateEffects();
            this.checkCollisions();
            this.updateGameSpeed();

            this.drawGround();
            this.drawDino();
            this.drawObstacles();
            this.drawPowerUps();
            this.drawEffects();
            this.drawUI();
        } else if (this.gameOver) {
            this.drawGround();
            this.drawDino();
            this.drawObstacles();
            this.drawGameOver();
        }

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize enhanced game
window.addEventListener('load', () => {
    new EnhancedDinoGame();
});
