// キャンバスの設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム情報表示要素
const holeNumberElement = document.getElementById('hole-number');
const parElement = document.getElementById('par');
const shotsElement = document.getElementById('shots');
const totalScoreElement = document.getElementById('total-score');
const windSpeedElement = document.getElementById('wind-speed');
const windDirectionElement = document.getElementById('wind-direction');
const powerbarElement = document.getElementById('powerbar');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');

// ボタン要素
const restartHoleButton = document.getElementById('restart-hole');
const nextHoleButton = document.getElementById('next-hole');
const playAgainButton = document.getElementById('play-again');

// 物理パラメータ
const gravity = 0.2; // 重力
const friction = 0.98; // 地面の摩擦
const airResistance = 0.99; // 空気抵抗
const bounceDamping = 0.6; // バウンド時の減衰
const minStopVelocity = 0.05; // ボールが止まったと見なす速度
const maxPower = 15; // 最大打球力

// ゲーム状態
let gameState = {
    currentHole: 0, // 現在のホール番号（0から始まる）
    shots: 0, // 現在のホールでのショット数
    totalScore: 0, // 合計スコア
    ballInHole: false, // ボールがホールに入ったか
    powerCharging: false, // パワーチャージ中か
    power: 0, // 現在のパワー（0-100）
    powerDirection: 1, // パワーゲージの増減方向
    aiming: true, // 方向を決めている状態か
    shotReady: false, // ショット準備完了状態か
    windSpeed: 0, // 風速
    windAngle: 0 // 風向き
};

// ボールのプロパティ
let ball = {
    x: 0,
    y: 0,
    radius: 8,
    vx: 0,
    vy: 0,
    isMoving: false,
    color: '#ffffff'
};

// ゴルフコースの定義（複数のホール）
const golfCourse = [
    // ホール1: パー3の簡単なコース
    {
        par: 3,
        teePosition: { x: 100, y: 250 },
        holePosition: { x: 700, y: 250 },
        hazards: [
            { type: 'bunker', x: 400, y: 300, width: 100, height: 40 },
            { type: 'water', x: 300, y: 150, width: 150, height: 30 }
        ],
        terrain: [
            { type: 'rough', x: 250, y: 350, width: 200, height: 60 }
        ]
    },
    // ホール2: パー4の少し複雑なコース
    {
        par: 4,
        teePosition: { x: 100, y: 400 },
        holePosition: { x: 700, y: 150 },
        hazards: [
            { type: 'bunker', x: 350, y: 200, width: 80, height: 60 },
            { type: 'water', x: 500, y: 350, width: 200, height: 50 },
            { type: 'trees', x: 400, y: 100, radius: 40 }
        ],
        terrain: [
            { type: 'rough', x: 300, y: 300, width: 300, height: 80 }
        ]
    },
    // ホール3: パー5の難しいコース
    {
        par: 5,
        teePosition: { x: 100, y: 100 },
        holePosition: { x: 700, y: 400 },
        hazards: [
            { type: 'bunker', x: 200, y: 200, width: 80, height: 60 },
            { type: 'bunker', x: 500, y: 300, width: 100, height: 60 },
            { type: 'water', x: 350, y: 250, width: 100, height: 200 },
            { type: 'trees', x: 600, y: 200, radius: 50 }
        ],
        terrain: [
            { type: 'rough', x: 450, y: 150, width: 250, height: 70 },
            { type: 'rough', x: 200, y: 350, width: 150, height: 60 }
        ]
    }
];

// マウス座標
let mouseX = 0;
let mouseY = 0;

// 初期化
function initGame() {
    gameState.currentHole = 0;
    gameState.totalScore = 0;

    loadHole(gameState.currentHole);

    // イベントリスナーの設定
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    restartHoleButton.addEventListener('click', restartCurrentHole);
    nextHoleButton.addEventListener('click', goToNextHole);
    playAgainButton.addEventListener('click', restartGame);

    // ゲームループ開始
    requestAnimationFrame(gameLoop);
}

// ホールをロード
function loadHole(holeIndex) {
    const hole = golfCourse[holeIndex];

    // ホール情報の表示を更新
    holeNumberElement.textContent = holeIndex + 1;
    parElement.textContent = hole.par;

    // ショット数をリセット
    gameState.shots = 0;
    shotsElement.textContent = gameState.shots;

    // ボールをティーポジションに配置
    ball.x = hole.teePosition.x;
    ball.y = hole.teePosition.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.isMoving = false;

    // ゲーム状態をリセット
    gameState.ballInHole = false;
    gameState.aiming = true;
    gameState.shotReady = false;
    gameState.powerCharging = false;
    gameState.power = 0;

    // 風の設定
    updateWind();

    // パワーバーをリセット
    powerbarElement.style.width = '0%';

    // 次のホールボタンを無効化
    nextHoleButton.disabled = true;
}

// 風の更新
function updateWind() {
    // 風速（0-5の範囲）
    gameState.windSpeed = Math.floor(Math.random() * 6);

    // 風向き（0-359度）
    gameState.windAngle = Math.floor(Math.random() * 360);

    // 風の表示を更新
    windSpeedElement.textContent = gameState.windSpeed;

    // 風向きの矢印を更新
    const arrowChars = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const arrowIndex = Math.floor(((gameState.windAngle + 22.5) % 360) / 45);
    windDirectionElement.textContent = arrowChars[arrowIndex];
}

// マウス移動のハンドリング
function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}

// マウスダウンのハンドリング
function handleMouseDown() {
    if (ball.isMoving || gameState.ballInHole) return;

    if (gameState.aiming) {
        // パワーチャージ開始
        gameState.powerCharging = true;
        gameState.aiming = false;
        gameState.power = 0;
        gameState.powerDirection = 1;
    } else if (gameState.powerCharging) {
        // ショット実行
        gameState.powerCharging = false;
        gameState.shotReady = true;
    }
}

// マウスアップのハンドリング
function handleMouseUp() {
    // この場合はクリックでハンドリングするので、ここでは何もしない
}

// ホールをリスタート
function restartCurrentHole() {
    if (gameState.ballInHole) return;

    loadHole(gameState.currentHole);
}

// 次のホールへ
function goToNextHole() {
    if (!gameState.ballInHole && !nextHoleButton.disabled) return;

    gameState.currentHole++;

    if (gameState.currentHole >= golfCourse.length) {
        // ゲーム終了
        endGame();
    } else {
        loadHole(gameState.currentHole);
    }
}

// ゲームを再スタート
function restartGame() {
    gameOverElement.style.display = 'none';
    initGame();
}

// ゲーム終了
function endGame() {
    gameOverElement.style.display = 'block';
    finalScoreElement.textContent = gameState.totalScore;
}

// ショットを実行
function executeShot() {
    const hole = golfCourse[gameState.currentHole];

    // 方向ベクトルを計算
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 正規化された方向ベクトル
    const dirX = dx / distance;
    const dirY = dy / distance;

    // パワーに基づいて初速を設定
    const powerFactor = gameState.power / 100;
    ball.vx = dirX * maxPower * powerFactor;
    ball.vy = dirY * maxPower * powerFactor;

    // 風の影響を加える
    const windFactor = gameState.windSpeed * 0.02;
    const windRadians = gameState.windAngle * Math.PI / 180;
    ball.vx += Math.cos(windRadians) * windFactor;
    ball.vy += Math.sin(windRadians) * windFactor;

    // ボールを動かす状態に
    ball.isMoving = true;

    // ショット数を増やす
    gameState.shots++;
    shotsElement.textContent = gameState.shots;

    // 準備完了フラグをリセット
    gameState.shotReady = false;

    // エイミング状態に戻る
    gameState.aiming = true;
}

// ボールの物理更新
function updateBall() {
    if (!ball.isMoving) return;

    const hole = golfCourse[gameState.currentHole];

    // 重力と空気抵抗を適用
    ball.vy += gravity;
    ball.vx *= airResistance;
    ball.vy *= airResistance;

    // 現在のホールの障害物や地形を考慮
    checkHazards();

    // 位置を更新
    ball.x += ball.vx;
    ball.y += ball.vy;

    // キャンバスの境界でのバウンド
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * bounceDamping;
    } else if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx = -ball.vx * bounceDamping;
    }

    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * bounceDamping;
    } else if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.vy = -ball.vy * bounceDamping;

        // 地面についたら摩擦を適用
        ball.vx *= friction;
    }

    // ボールが止まったかチェック
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed < minStopVelocity) {
        ball.isMoving = false;
        ball.vx = 0;
        ball.vy = 0;
    }

    // ホールインのチェック
    checkHoleIn();
}

// 障害物や地形との相互作用
function checkHazards() {
    const hole = golfCourse[gameState.currentHole];

    // 各障害物をチェック
    for (const hazard of hole.hazards) {
        switch (hazard.type) {
            case 'bunker':
                // バンカーに入ると速度が大幅に減少
                if (isInRect(ball.x, ball.y, hazard.x, hazard.y, hazard.width, hazard.height)) {
                    ball.vx *= 0.8;
                    ball.vy *= 0.8;
                }
                break;

            case 'water':
                // 水に入るとペナルティ：前の位置に戻す
                if (isInRect(ball.x, ball.y, hazard.x, hazard.y, hazard.width, hazard.height)) {
                    ball.isMoving = false;
                    ball.x = ball.x - ball.vx * 3; // 少し戻る
                    ball.y = ball.y - ball.vy * 3;
                    ball.vx = 0;
                    ball.vy = 0;

                    // ペナルティショット
                    gameState.shots++;
                    shotsElement.textContent = gameState.shots;
                }
                break;

            case 'trees':
                // 木にぶつかると跳ね返る
                const dx = ball.x - hazard.x;
                const dy = ball.y - hazard.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < hazard.radius + ball.radius) {
                    // 木から跳ね返る方向を計算
                    const angle = Math.atan2(dy, dx);

                    // ボールを木の外側に移動
                    ball.x = hazard.x + Math.cos(angle) * (hazard.radius + ball.radius);
                    ball.y = hazard.y + Math.sin(angle) * (hazard.radius + ball.radius);

                    // 速度を反射
                    const dotProduct = ball.vx * Math.cos(angle) + ball.vy * Math.sin(angle);
                    ball.vx -= 2 * dotProduct * Math.cos(angle) * bounceDamping;
                    ball.vy -= 2 * dotProduct * Math.sin(angle) * bounceDamping;
                }
                break;
        }
    }

    // 地形をチェック
    for (const terrain of hole.terrain) {
        if (terrain.type === 'rough' && isInRect(ball.x, ball.y, terrain.x, terrain.y, terrain.width, terrain.height)) {
            // ラフでは速度が減少
            ball.vx *= 0.95;
            ball.vy *= 0.95;
        }
    }
}

// 矩形内にいるかチェック
function isInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
    return x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight;
}

// ホールインのチェック
function checkHoleIn() {
    const hole = golfCourse[gameState.currentHole];

    // ホールとボールの距離を計算
    const dx = ball.x - hole.holePosition.x;
    const dy = ball.y - hole.holePosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // ホールの半径を設定（ボールよりやや大きい）
    const holeRadius = 10;

    if (distance < holeRadius) {
        // ボールがホールに入った
        gameState.ballInHole = true;
        ball.isMoving = false;

        // スコアの更新
        const holePar = hole.par;
        const relativeScore = gameState.shots - holePar;
        gameState.totalScore += relativeScore;
        totalScoreElement.textContent = getScoreString(gameState.totalScore);

        // スコア表示
        let scoreText;
        if (gameState.shots === 1) {
            scoreText = "ホールインワン！";
        } else if (relativeScore === -2) {
            scoreText = "イーグル！";
        } else if (relativeScore === -1) {
            scoreText = "バーディー！";
        } else if (relativeScore === 0) {
            scoreText = "パー";
        } else if (relativeScore === 1) {
            scoreText = "ボギー";
        } else if (relativeScore === 2) {
            scoreText = "ダブルボギー";
        } else if (relativeScore > 2) {
            scoreText = relativeScore + "オーバー";
        }

        // 得点表示のアニメーション（単純なアラートで代用）
        alert(`${scoreText}\nショット数: ${gameState.shots}`);

        // 次のホールボタンを有効化
        nextHoleButton.disabled = false;
    }
}

// スコア文字列を取得
function getScoreString(score) {
    if (score === 0) return "イーブン";
    if (score > 0) return `+${score}`;
    return score.toString();
}

// パワーバーの更新
function updatePowerBar() {
    if (!gameState.powerCharging) return;

    // パワーを更新
    gameState.power += gameState.powerDirection * 2;

    // パワーの上限・下限を設定
    if (gameState.power >= 100) {
        gameState.power = 100;
        gameState.powerDirection = -1;
    } else if (gameState.power <= 0) {
        gameState.power = 0;
        gameState.powerDirection = 1;
    }

    // パワーバーの表示を更新
    powerbarElement.style.width = `${gameState.power}%`;
}

// ゲームの描画
function drawGame() {
    // 背景をクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // コースを描画
    drawCourse();

    // ボールを描画
    drawBall();

    // エイミングラインを描画
    if (gameState.aiming && !ball.isMoving && !gameState.ballInHole) {
        drawAimingLine();
    }
}

// コースの描画
function drawCourse() {
    const hole = golfCourse[gameState.currentHole];

    // グリーンを描画
    ctx.fillStyle = '#90ee90'; // 薄緑色
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ホールを描画
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(hole.holePosition.x, hole.holePosition.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // ホールフラッグを描画
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(hole.holePosition.x, hole.holePosition.y - 40, 2, 40);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(hole.holePosition.x, hole.holePosition.y - 40);
    ctx.lineTo(hole.holePosition.x + 15, hole.holePosition.y - 35);
    ctx.lineTo(hole.holePosition.x, hole.holePosition.y - 30);
    ctx.fill();

    // 障害物を描画
    for (const hazard of hole.hazards) {
        switch (hazard.type) {
            case 'bunker':
                ctx.fillStyle = '#f5deb3'; // バンカー色
                ctx.beginPath();
                ctx.ellipse(
                    hazard.x + hazard.width / 2,
                    hazard.y + hazard.height / 2,
                    hazard.width / 2,
                    hazard.height / 2,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
                break;

            case 'water':
                ctx.fillStyle = '#4682b4'; // 水色
                ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
                break;

            case 'trees':
                // 木の幹
                ctx.fillStyle = '#8b4513'; // 茶色
                ctx.fillRect(hazard.x - 5, hazard.y - hazard.radius / 2, 10, hazard.radius);

                // 木の葉
                ctx.fillStyle = '#228b22'; // 緑色
                ctx.beginPath();
                ctx.arc(hazard.x, hazard.y - hazard.radius / 2, hazard.radius / 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    // 地形を描画
    for (const terrain of hole.terrain) {
        if (terrain.type === 'rough') {
            ctx.fillStyle = '#a0db8e'; // ラフ色
            ctx.fillRect(terrain.x, terrain.y, terrain.width, terrain.height);
        }
    }
}

// ボールの描画
function drawBall() {
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // ボールのハイライト
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius / 3, ball.y - ball.radius / 3, ball.radius / 3, 0, Math.PI * 2);
    ctx.fill();
}

// エイミングラインの描画
function drawAimingLine() {
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 正規化された方向ベクトル
    const dirX = dx / distance;
    const dirY = dy / distance;

    // エイミングラインの長さ
    const lineLength = Math.min(distance, 100);

    // 点線の描画
    ctx.beginPath();
    ctx.setLineDash([5, 5]); // 点線のパターン
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + dirX * lineLength, ball.y + dirY * lineLength);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // 点線をリセット
}

// ゲームループ
function gameLoop() {
    // パワーバーの更新
    updatePowerBar();

    // ショットの実行
    if (gameState.shotReady) {
        executeShot();
    }

    // ボールの更新
    updateBall();

    // ゲームの描画
    drawGame();

    // 次のフレームをリクエスト
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
initGame();