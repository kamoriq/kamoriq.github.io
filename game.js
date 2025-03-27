// キャンバスのセットアップ
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart');

// ゲーム状態
let score = 0;
let isGameOver = false;
let balls = [];
let lastBallTime = 0;
let ballInterval = 1000; // ボールが追加される間隔（ミリ秒）
let maxBalls = 20; // 最大ボール数（これを超えるとゲームオーバー）

// 物理パラメータ
const gravity = 0.2; // 重力加速度
const friction = 0.99; // 空気抵抗
const bounce = 0.7; // 反発係数

// ボールクラス
class Ball {
    constructor() {
        this.radius = Math.random() * 20 + 10; // 10-30のランダムな半径
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = 0 - this.radius; // 画面上部から出現
        this.color = this.getRandomColor();
        this.vx = (Math.random() - 0.5) * 5; // ランダムな初期X速度
        this.vy = Math.random() * 2; // 小さな初期Y速度
        this.isClicked = false;
    }

    // ランダムな色を生成
    getRandomColor() {
        const colors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ボールを更新（物理計算）
    update() {
        if (this.isClicked) return;

        // 重力を適用
        this.vy += gravity;

        // 空気抵抗を適用
        this.vx *= friction;
        this.vy *= friction;

        // 位置を更新
        this.x += this.vx;
        this.y += this.vy;

        // 壁との衝突判定と反発
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -bounce;
        } else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -bounce;
        }

        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy *= -bounce;
        }

        // ボール同士の衝突判定
        for (let i = 0; i < balls.length; i++) {
            const otherBall = balls[i];
            if (otherBall !== this && !otherBall.isClicked) {
                const dx = otherBall.x - this.x;
                const dy = otherBall.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = this.radius + otherBall.radius;

                if (distance < minDistance) {
                    // 衝突している場合は反発させる
                    const angle = Math.atan2(dy, dx);
                    const targetX = this.x + Math.cos(angle) * minDistance;
                    const targetY = this.y + Math.sin(angle) * minDistance;
                    const ax = (targetX - otherBall.x) * 0.05;
                    const ay = (targetY - otherBall.y) * 0.05;

                    this.vx -= ax;
                    this.vy -= ay;
                    otherBall.vx += ax;
                    otherBall.vy += ay;
                }
            }
        }
    }

    // ボールを描画
    draw() {
        if (this.isClicked) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    // クリック判定
    isPointInside(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }
}

// ゲームの初期化
function initGame() {
    score = 0;
    balls = [];
    isGameOver = false;
    lastBallTime = 0;
    ballInterval = 1000;
    scoreElement.textContent = `スコア: ${score}`;
    gameOverElement.style.display = 'none';
}

// ゲームのメインループ
function gameLoop(timestamp) {
    if (isGameOver) return;

    // 背景をクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 新しいボールを追加
    if (timestamp - lastBallTime > ballInterval && balls.length < maxBalls) {
        balls.push(new Ball());
        lastBallTime = timestamp;

        // ゲームが進むにつれてボールの間隔を短くする（難易度上昇）
        ballInterval = Math.max(200, ballInterval - 10);
    }

    // 画面から消えたボールを削除
    balls = balls.filter(ball => !ball.isClicked);

    // ゲームオーバー条件をチェック
    if (balls.length >= maxBalls) {
        isGameOver = true;
        gameOverElement.style.display = 'block';
        return;
    }

    // すべてのボールを更新して描画
    for (const ball of balls) {
        ball.update();
        ball.draw();
    }

    // 次のフレームを要求
    requestAnimationFrame(gameLoop);
}

// キャンバスのクリックイベント
canvas.addEventListener('click', (event) => {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (let i = balls.length - 1; i >= 0; i--) {
        if (balls[i].isPointInside(x, y)) {
            balls[i].isClicked = true;
            score++;
            scoreElement.textContent = `スコア: ${score}`;
            break; // 一度に1つのボールのみ処理
        }
    }
});

// リスタートボタン
restartButton.addEventListener('click', () => {
    initGame();
    requestAnimationFrame(gameLoop);
});

// ゲーム開始
initGame();
requestAnimationFrame(gameLoop);