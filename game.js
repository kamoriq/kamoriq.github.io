// キャンバスの設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const distanceElement = document.getElementById('distance');
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart');

// エラーチェック - 要素が見つからない場合のセーフガード
if (!canvas) console.error("Canvas要素が見つかりません");
if (!distanceElement) console.error("距離表示要素が見つかりません");
if (!gameOverElement) console.error("ゲームオーバー要素が見つかりません");
if (!restartButton) console.error("リスタートボタンが見つかりません");

// 物理パラメータ
const gravity = 0.25; // 重力（低めに設定）
const buoyancy = 0.15; // 自然な浮力（鳥は空気より軽い）
const flapForce = 0.8; // 羽ばたきの力
const airResistance = 0.98; // 空気抵抗
const maxVelocity = 8; // 最大速度

// ゲーム状態
let gameOver = false;
let distance = 0;
let bestDistance = 0;
let scrollSpeed = 2; // 背景のスクロール速度
let flapCooldown = 0; // 羽ばたきのクールダウン
let flapCooldownMax = 10; // 羽ばたきの最大クールダウン

// 雲の配列
let clouds = [];
const cloudCount = 10; // 雲の数

// 木の配列（障害物）
let trees = [];
const treeSpacing = 500; // 木の間隔

// キー状態
const keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false,
    " ": false // スペースキー
};

// 鳥のクラス
class Bird {
    constructor() {
        this.x = 200;
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;
        this.width = 40;
        this.height = 30;
        this.wingPosition = 0; // 羽の位置 (0-1)
        this.wingDirection = 0.1; // 羽ばたきの方向
        this.rotation = 0; // 鳥の回転角度
    }

    // 鳥の更新
    update() {
        // 重力と浮力を適用
        this.vy += gravity;
        this.vy -= buoyancy;

        // 羽ばたき
        if ((keys.ArrowUp || keys[" "]) && flapCooldown <= 0) {
            this.vy -= flapForce;
            flapCooldown = flapCooldownMax;

            // 羽ばたき時のエフェクト
            this.wingPosition = 0; // 羽ばたきリセット
        }

        // 左右移動
        if (keys.ArrowLeft) {
            this.vx -= 0.2;
        }
        if (keys.ArrowRight) {
            this.vx += 0.2;
        }

        // 速度の制限
        this.vx = Math.max(Math.min(this.vx, maxVelocity), -maxVelocity);
        this.vy = Math.max(Math.min(this.vy, maxVelocity), -maxVelocity);

        // 空気抵抗
        this.vx *= airResistance;
        this.vy *= airResistance;

        // 位置の更新
        this.x += this.vx;
        this.y += this.vy;

        // 画面の境界をチェック
        if (this.x < this.width / 2) {
            this.x = this.width / 2;
            this.vx = 0;
        } else if (this.x > canvas.width - this.width / 2) {
            this.x = canvas.width - this.width / 2;
            this.vx = 0;
        }

        // 地面の衝突
        if (this.y > canvas.height - 50) {
            gameOver = true;
        }

        // 上空の境界
        if (this.y < this.height / 2) {
            this.y = this.height / 2;
            this.vy = 0;
        }

        // 鳥の回転角度を速度に基づいて計算
        this.rotation = Math.atan2(this.vy, 3) * 0.5; // 少し抑えめに

        // 羽ばたきのアニメーション
        this.wingPosition += this.wingDirection;
        if (this.wingPosition >= 1 || this.wingPosition <= 0) {
            this.wingDirection *= -1;
        }

        // 衝突判定
        this.checkCollisions();

        // 距離の更新
        distance += scrollSpeed / 10;
    }

    // 障害物との衝突判定
    checkCollisions() {
        for (const tree of trees) {
            if (
                this.x + this.width / 2 > tree.x - tree.width / 2 &&
                this.x - this.width / 2 < tree.x + tree.width / 2 &&
                this.y + this.height / 2 > tree.y - tree.height / 2 &&
                this.y - this.height / 2 < tree.y + tree.height / 2
            ) {
                gameOver = true;
                return;
            }
        }
    }

    // 鳥の描画
    draw() {
        ctx.save();

        // 鳥の中心に移動して回転
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // 鳥の体（楕円）
        ctx.fillStyle = "#FF9800"; // オレンジ
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 鳥の頭
        ctx.fillStyle = "#F57C00"; // 濃いオレンジ
        ctx.beginPath();
        ctx.arc(this.width / 3, -this.height / 6, this.height / 3, 0, Math.PI * 2);
        ctx.fill();

        // 鳥のくちばし
        ctx.fillStyle = "#FFD54F"; // 黄色
        ctx.beginPath();
        ctx.moveTo(this.width / 2, -this.height / 6);
        ctx.lineTo(this.width / 2 + 15, 0);
        ctx.lineTo(this.width / 2, this.height / 6);
        ctx.closePath();
        ctx.fill();

        // 鳥の目
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(this.width / 3 + 5, -this.height / 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // 羽ばたき中の羽（位置に応じて変化）
        ctx.fillStyle = "#E65100"; // 濃い茶色

        // 左の羽
        ctx.beginPath();
        ctx.moveTo(-this.width / 4, 0);
        ctx.quadraticCurveTo(-this.width / 2, -this.height * (0.5 + this.wingPosition * 0.8), // 羽ばたきでY位置変更
            -this.width, -this.height * (0.2 + this.wingPosition * 0.5)
        );
        ctx.quadraticCurveTo(-this.width / 2,
            this.height * 0.2, -this.width / 4,
            0
        );
        ctx.closePath();
        ctx.fill();

        // 右の羽
        ctx.beginPath();
        ctx.moveTo(-this.width / 4, 0);
        ctx.quadraticCurveTo(-this.width / 2,
            this.height * (0.5 + this.wingPosition * 0.8), // 羽ばたきでY位置変更
            -this.width,
            this.height * (0.2 + this.wingPosition * 0.5)
        );
        ctx.quadraticCurveTo(-this.width / 2, -this.height * 0.2, -this.width / 4,
            0
        );
        ctx.closePath();
        ctx.fill();

        // 尾羽
        ctx.fillStyle = "#E65100"; // 濃い茶色
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.lineTo(-this.width / 2 - 15, -this.height / 3);
        ctx.lineTo(-this.width / 2 - 15, this.height / 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// 雲のクラス
class Cloud {
    constructor(x) {
        this.x = x || canvas.width + Math.random() * canvas.width;
        this.y = Math.random() * (canvas.height / 2);
        this.width = Math.random() * 100 + 50;
        this.height = Math.random() * 40 + 20;
        this.speed = Math.random() * 0.5 + 0.5; // 雲の移動速度はバラバラ
    }

    update() {
        this.x -= this.speed * scrollSpeed;

        // 画面外に出たら右側に再配置
        if (this.x + this.width < 0) {
            this.x = canvas.width + Math.random() * 100;
            this.y = Math.random() * (canvas.height / 2);
            this.width = Math.random() * 100 + 50;
            this.height = Math.random() * 40 + 20;
        }
    }

    draw() {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

        // 複数の円で雲を表現
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.height, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.3, this.y - this.height * 0.2, this.height * 0.9, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.6, this.y, this.height * 1.1, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.9, this.y - this.height * 0.1, this.height * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 木のクラス（障害物）
class Tree {
    constructor(x) {
        this.x = x || canvas.width + Math.random() * 200;
        this.y = canvas.height - 50; // 地面の高さ
        this.width = Math.random() * 20 + 20;
        this.height = Math.random() * 150 + 100;
    }

    update() {
        this.x -= scrollSpeed;

        // 画面外に出たら削除対象としてマーク
        if (this.x + this.width < 0) {
            return true; // 削除対象
        }
        return false;
    }

    draw() {
        // 幹
        ctx.fillStyle = "#8B4513"; // 茶色
        ctx.beginPath();
        ctx.rect(this.x - this.width / 4, this.y - this.height, this.width / 2, this.height);
        ctx.fill();

        // 葉
        ctx.fillStyle = "#2E7D32"; // 緑
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height, this.width, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x - this.width / 2, this.y - this.height - this.width / 3, this.width * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y - this.height - this.width / 3, this.width * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 鳥のインスタンス
let bird = new Bird();

// ゲームの初期化
function initGame() {
    gameOver = false;
    distance = 0;
    scrollSpeed = 2;
    flapCooldown = 0;
    bird = new Bird();

    // 雲の初期化
    clouds = [];
    for (let i = 0; i < cloudCount; i++) {
        clouds.push(new Cloud(Math.random() * canvas.width));
    }

    // 木の初期化
    trees = [];
    for (let i = 0; i < 5; i++) {
        trees.push(new Tree(canvas.width + i * treeSpacing));
    }

    // 表示の更新
    if (distanceElement) {
        distanceElement.textContent = `飛行距離: ${Math.floor(distance)} m`;
    }

    if (gameOverElement) {
        gameOverElement.style.display = 'none';
    }
}

// 背景の描画
function drawBackground() {
    // 空のグラデーション
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#1E88E5"); // 上空
    gradient.addColorStop(0.7, "#90CAF9"); // 中間
    gradient.addColorStop(1, "#E3F2FD"); // 地平線

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 太陽
    ctx.fillStyle = "#FFEB3B";
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    // 山脈
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 50);
    for (let x = 0; x <= canvas.width; x += 30) {
        const height = Math.sin(x * 0.01 + distance * 0.05) * 20 + Math.sin(x * 0.02 + distance * 0.03) * 10 + 30;
        ctx.lineTo(x, canvas.height - 50 - height);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 地面
    ctx.fillStyle = "#8D6E63"; // 茶色
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
}

// ゲームループ
function gameLoop() {
    // 背景のクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景の描画
    drawBackground();

    // クールダウンの更新
    if (flapCooldown > 0) {
        flapCooldown--;
    }

    // 雲の更新と描画
    for (const cloud of clouds) {
        cloud.update();
        cloud.draw();
    }

    // ゲームオーバーでなければ更新
    if (!gameOver) {
        // 木の更新と描画
        trees = trees.filter(tree => !tree.update()); // 画面外に出た木を削除
        for (const tree of trees) {
            tree.draw();
        }

        // 新しい木を追加
        if (trees.length < 5) {
            trees.push(new Tree(canvas.width + Math.random() * 200));
        }

        // 鳥の更新
        bird.update();

        // 難易度の増加
        if (distance > 100) {
            scrollSpeed = 2 + distance / 500; // 徐々に速くなる
        }
    }

    // 鳥の描画
    bird.draw();

    // 走行距離の表示更新
    if (distanceElement) {
        distanceElement.textContent = `飛行距離: ${Math.floor(distance)} m`;
    }

    // ゲームオーバーメッセージ
    if (gameOver && gameOverElement) {
        gameOverElement.style.display = 'block';

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ゲームオーバー!', canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '24px Arial';
        ctx.fillText(`飛行距離: ${Math.floor(distance)} m`, canvas.width / 2, canvas.height / 2);

        // ベストスコアの更新
        if (distance > bestDistance) {
            bestDistance = distance;
        }

        ctx.fillText(`ベスト: ${Math.floor(bestDistance)} m`, canvas.width / 2, canvas.height / 2 + 30);
        ctx.restore();
    }

    // 次のフレームをリクエスト
    requestAnimationFrame(gameLoop);
}

// キーボード入力の処理
document.addEventListener('keydown', (event) => {
    if (event.key in keys) {
        keys[event.key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key in keys) {
        keys[event.key] = false;
    }
});

// リスタートボタン
if (restartButton) {
    restartButton.addEventListener('click', () => {
        initGame();
    });
}

// タッチスクリーンのサポート
canvas.addEventListener('touchstart', () => {
    keys[" "] = true;
});

canvas.addEventListener('touchend', () => {
    keys[" "] = false;
});

// ゲーム開始
initGame();
requestAnimationFrame(gameLoop);