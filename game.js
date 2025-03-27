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

// マウス位置の追跡
let mouseX = canvas.width / 2;
let mouseY = canvas.height - 50;
let isMouseDown = false;

// バットの設定
const bat = {
    width: 100,
    height: 20,
    x: canvas.width / 2,
    y: canvas.height - 50,
    color: '#4CAF50',
    power: 10, // ボールを打つ力の強さ
    maxBalls: 3, // バットから同時に出せるボールの最大数
    ballsShot: 0, // 現在出ているボールの数
    cooldown: 0, // クールダウンタイマー
    maxCooldown: 10 // クールダウン時間（フレーム数）
};

// 物理パラメータ
const gravity = 0.2; // 重力加速度
const friction = 0.99; // 空気抵抗
const bounce = 0.7; // 反発係数

// ボールクラス
class Ball {
    constructor(x, y, vx, vy, isPlayerBall = false) {
        this.radius = Math.random() * 20 + 10; // 10-30のランダムな半径
        this.x = x || Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = y || 0 - this.radius; // 画面上部から出現（指定がなければ）
        this.color = isPlayerBall ? '#4CAF50' : this.getRandomColor();
        this.vx = vx || (Math.random() - 0.5) * 5; // ランダムな初期X速度
        this.vy = vy || Math.random() * 2; // 小さな初期Y速度
        this.isClicked = false;
        this.isPlayerBall = isPlayerBall; // プレイヤーが発射したボールかどうか
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
        } else if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -bounce;
        }

        // バットとの衝突判定
        this.checkBatCollision();

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

                    // プレイヤーボールが他のボールに当たった場合、スコア加算
                    if (this.isPlayerBall && !otherBall.isPlayerBall) {
                        score++;
                        otherBall.isClicked = true;
                        scoreElement.textContent = `スコア: ${score}`;
                    }
                }
            }
        }
    }

    // バットとの衝突判定
    checkBatCollision() {
        if (this.isPlayerBall) return; // プレイヤーボールはバットと衝突しない

        // バットの矩形内にボールが入っているかチェック
        if (this.x + this.radius > bat.x - bat.width / 2 &&
            this.x - this.radius < bat.x + bat.width / 2 &&
            this.y + this.radius > bat.y - bat.height / 2 &&
            this.y - this.radius < bat.y + bat.height / 2) {

            // 衝突位置に基づいて反発角度を計算
            const hitPos = (this.x - bat.x) / (bat.width / 2); // -1.0〜1.0の範囲

            // バットの中心からの距離に応じて反発角度を変える
            const angle = hitPos * Math.PI / 3; // -60°〜60°の範囲

            // 速度の大きさを計算
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const newSpeed = Math.max(speed, 5) * bounce; // 最低速度を保証

            // 新しい速度を設定
            this.vx = Math.sin(angle) * newSpeed;
            this.vy = -Math.cos(angle) * newSpeed; // 上向きに反発

            // バットから少し離す（めり込み防止）
            this.y = bat.y - bat.height / 2 - this.radius - 1;
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

// バットを描画
function drawBat() {
    ctx.beginPath();
    ctx.rect(bat.x - bat.width / 2, bat.y - bat.height / 2, bat.width, bat.height);
    ctx.fillStyle = bat.color;
    ctx.fill();
    ctx.closePath();

    // クールダウン表示
    if (bat.cooldown > 0) {
        const cooldownRatio = bat.cooldown / bat.maxCooldown;
        ctx.beginPath();
        ctx.rect(bat.x - bat.width / 2, bat.y + bat.height / 2, bat.width * (1 - cooldownRatio), 5);
        ctx.fillStyle = '#2196F3';
        ctx.fill();
        ctx.closePath();
    }
}

// プレイヤーボールを発射
function shootBall() {
    if (bat.cooldown > 0 || bat.ballsShot >= bat.maxBalls) return;

    // バットの中心からボールを発射
    const ball = new Ball(
        bat.x,
        bat.y - bat.height / 2 - 15,
        (Math.random() - 0.5) * 3, // ランダムなX速度
        -bat.power, // 上向きの速度
        true // プレイヤーボール
    );

    balls.push(ball);
    bat.ballsShot++;
    bat.cooldown = bat.maxCooldown;
}

// ゲームの初期化
function initGame() {
    score = 0;
    balls = [];
    isGameOver = false;
    lastBallTime = 0;
    ballInterval = 1000;
    bat.ballsShot = 0;
    bat.cooldown = 0;
    scoreElement.textContent = `スコア: ${score}`;
    gameOverElement.style.display = 'none';
}

// ゲームのメインループ
function gameLoop(timestamp) {
    if (isGameOver) return;

    // 背景をクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // バットの位置を更新
    bat.x = mouseX;
    bat.y = mouseY;

    // クールダウンを減少
    if (bat.cooldown > 0) {
        bat.cooldown--;
    }

    // プレイヤーがクリックしていればボールを発射
    if (isMouseDown && bat.cooldown === 0) {
        shootBall();
    }

    // 新しいボールを追加
    if (timestamp - lastBallTime > ballInterval) {
        balls.push(new Ball());
        lastBallTime = timestamp;

        // ゲームが進むにつれてボールの間隔を短くする（難易度上昇）
        ballInterval = Math.max(200, ballInterval - 10);
    }

    // 画面から消えたボールを削除し、プレイヤーボールのカウントを更新
    let playerBallCount = 0;
    balls = balls.filter(ball => {
        const keep = !ball.isClicked;
        if (keep && ball.isPlayerBall) playerBallCount++;
        return keep;
    });
    bat.ballsShot = playerBallCount;

    // ゲームオーバー条件をチェック（プレイヤーボールは含めない）
    let enemyBallCount = 0;
    for (const ball of balls) {
        if (!ball.isPlayerBall) enemyBallCount++;
    }

    if (enemyBallCount >= maxBalls) {
        isGameOver = true;
        gameOverElement.style.display = 'block';
        return;
    }

    // バットを描画
    drawBat();

    // すべてのボールを更新して描画
    for (const ball of balls) {
        ball.update();
        ball.draw();
    }

    // 次のフレームを要求
    requestAnimationFrame(gameLoop);
}

// マウス移動イベント
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    // バットがキャンバスの外に出ないようにする
    mouseX = Math.max(bat.width / 2, Math.min(canvas.width - bat.width / 2, mouseX));
    mouseY = Math.max(bat.height / 2, Math.min(canvas.height - bat.height / 2, mouseY));
});

// マウスクリックイベント
canvas.addEventListener('mousedown', () => {
    isMouseDown = true;
});

canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// リスタートボタン
restartButton.addEventListener('click', () => {
    initGame();
    requestAnimationFrame(gameLoop);
});

// ゲーム開始
initGame();
requestAnimationFrame(gameLoop);