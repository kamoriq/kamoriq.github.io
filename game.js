// キャンバスの設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const distanceElement = document.getElementById('distance'); // score→distanceに変更
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart');

// エラーチェック - 要素が見つからない場合のセーフガード
if (!canvas) console.error("Canvas要素が見つかりません");
if (!distanceElement) console.error("距離表示要素が見つかりません");
if (!gameOverElement) console.error("ゲームオーバー要素が見つかりません");
if (!restartButton) console.error("リスタートボタンが見つかりません");

// 物理パラメータ
const gravity = 0.5;
const friction = 0.8;
const muscleForce = 0.4;

// ゲーム状態
let gameOver = false;
let distance = 0;
let bestDistance = 0;

// キー状態
const keys = {
    q: false, // 左腿前方
    w: false, // 右腿前方
    o: false, // 左足前方
    p: false // 右足前方
};

// 走者の物理モデル
class Runner {
    constructor() {
        // 腰（中心点）
        this.hip = { x: 200, y: 200, vx: 0, vy: 0 };

        // 各関節の角度と角速度
        this.leftThighAngle = Math.PI / 6; // 左腿の角度（腰から）
        this.rightThighAngle = -Math.PI / 6; // 右腿の角度（腰から）
        this.leftCalfAngle = 0; // 左足の角度（左腿から）
        this.rightCalfAngle = 0; // 右足の角度（右腿から）

        this.leftThighVelocity = 0;
        this.rightThighVelocity = 0;
        this.leftCalfVelocity = 0;
        this.rightCalfVelocity = 0;

        // 身体パーツの長さ
        this.thighLength = 40;
        this.calfLength = 40;

        // 関節の位置（計算で求める）
        this.leftKnee = { x: 0, y: 0 };
        this.rightKnee = { x: 0, y: 0 };
        this.leftFoot = { x: 0, y: 0 };
        this.rightFoot = { x: 0, y: 0 };

        // 接地状態
        this.leftFootContact = false;
        this.rightFootContact = false;

        // 身体の回転
        this.rotation = 0;
        this.rotationVelocity = 0;

        // 初期位置の計算
        this.updateJoints();
    }

    // 関節位置の更新
    updateJoints() {
        // 左腿
        this.leftKnee.x = this.hip.x + Math.cos(this.leftThighAngle + this.rotation) * this.thighLength;
        this.leftKnee.y = this.hip.y + Math.sin(this.leftThighAngle + this.rotation) * this.thighLength;

        // 右腿
        this.rightKnee.x = this.hip.x + Math.cos(this.rightThighAngle + this.rotation) * this.thighLength;
        this.rightKnee.y = this.hip.y + Math.sin(this.rightThighAngle + this.rotation) * this.thighLength;

        // 左足
        this.leftFoot.x = this.leftKnee.x + Math.cos(this.leftThighAngle + this.leftCalfAngle + this.rotation) * this.calfLength;
        this.leftFoot.y = this.leftKnee.y + Math.sin(this.leftThighAngle + this.leftCalfAngle + this.rotation) * this.calfLength;

        // 右足
        this.rightFoot.x = this.rightKnee.x + Math.cos(this.rightThighAngle + this.rightCalfAngle + this.rotation) * this.calfLength;
        this.rightFoot.y = this.rightKnee.y + Math.sin(this.rightThighAngle + this.rightCalfAngle + this.rotation) * this.calfLength;
    }

    // 物理アップデート
    update() {
        // 筋肉の力の適用
        if (keys.q) {
            this.leftThighVelocity += muscleForce;
        }
        if (keys.w) {
            this.rightThighVelocity += muscleForce;
        }
        if (keys.o) {
            this.leftCalfVelocity += muscleForce;
        }
        if (keys.p) {
            this.rightCalfVelocity += muscleForce;
        }

        // 角度の更新
        this.leftThighAngle += this.leftThighVelocity;
        this.rightThighAngle += this.rightThighVelocity;
        this.leftCalfAngle += this.leftCalfVelocity;
        this.rightCalfAngle += this.rightCalfVelocity;

        // 角速度の減衰
        this.leftThighVelocity *= 0.9;
        this.rightThighVelocity *= 0.9;
        this.leftCalfVelocity *= 0.9;
        this.rightCalfVelocity *= 0.9;

        // 関節の制限（実際の可動域を模倣）
        this.constrainJoints();

        // 関節位置の更新
        this.updateJoints();

        // 地面との接触判定
        this.leftFootContact = this.leftFoot.y >= canvas.height - 20;
        this.rightFootContact = this.rightFoot.y >= canvas.height - 20;

        // 地面との接触処理
        if (this.leftFootContact) {
            this.leftFoot.y = canvas.height - 20;

            // 足が地面についている場合、体が前に進む
            if (this.hip.vx < 3) {
                this.hip.vx += 0.1;
            }
        }

        if (this.rightFootContact) {
            this.rightFoot.y = canvas.height - 20;

            // 足が地面についている場合、体が前に進む
            if (this.hip.vx < 3) {
                this.hip.vx += 0.1;
            }
        }

        // 重力の適用
        this.hip.vy += gravity;

        // 走者の位置更新
        this.hip.x += this.hip.vx;
        this.hip.y += this.hip.vy;

        // 体全体の回転計算
        if (!this.leftFootContact && !this.rightFootContact) {
            // 空中にいる場合は回転が加速
            this.rotationVelocity += (this.hip.vx * 0.005);
        } else {
            // 地面に接している場合は回転が減速
            this.rotationVelocity *= 0.95;
        }

        this.rotation += this.rotationVelocity;

        // 回転が大きすぎる場合はゲームオーバー
        if (Math.abs(this.rotation) > Math.PI / 2) {
            gameOver = true;
        }

        // 身体が地面に接触したらゲームオーバー
        if (this.hip.y > canvas.height - 20) {
            gameOver = true;
        }

        // 走行距離の更新
        distance = Math.max(0, Math.floor(this.hip.x - 200));
    }

    // 関節の動きの制限
    constrainJoints() {
        // 腿の角度制限
        this.leftThighAngle = Math.max(Math.min(this.leftThighAngle, Math.PI / 2), -Math.PI / 3);
        this.rightThighAngle = Math.max(Math.min(this.rightThighAngle, Math.PI / 2), -Math.PI / 3);

        // 膝の角度制限
        this.leftCalfAngle = Math.max(Math.min(this.leftCalfAngle, Math.PI / 2), -Math.PI / 20);
        this.rightCalfAngle = Math.max(Math.min(this.rightCalfAngle, Math.PI / 2), -Math.PI / 20);
    }

    // 走者の描画
    draw() {
        ctx.save();

        // 走者がスクリーンの左側1/3にいるようにカメラを調整
        const cameraX = this.hip.x - canvas.width / 3;
        ctx.translate(-cameraX, 0);

        // 地面の描画
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(cameraX, canvas.height - 20, canvas.width, 20);

        // 距離マーカーの描画
        for (let i = 0; i <= Math.floor(this.hip.x + 600) / 100; i++) {
            const markerX = i * 100;
            ctx.fillStyle = '#999999';
            ctx.fillRect(markerX, canvas.height - 25, 2, 10);

            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(`${i * 10}m`, markerX - 10, canvas.height - 30);
        }

        // 身体パーツの描画
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        // 左腿
        ctx.strokeStyle = keys.q ? '#ff0000' : '#0000ff';
        ctx.beginPath();
        ctx.moveTo(this.hip.x, this.hip.y);
        ctx.lineTo(this.leftKnee.x, this.leftKnee.y);
        ctx.stroke();

        // 右腿
        ctx.strokeStyle = keys.w ? '#ff0000' : '#0000ff';
        ctx.beginPath();
        ctx.moveTo(this.hip.x, this.hip.y);
        ctx.lineTo(this.rightKnee.x, this.rightKnee.y);
        ctx.stroke();

        // 左足
        ctx.strokeStyle = keys.o ? '#ff0000' : '#0000ff';
        ctx.beginPath();
        ctx.moveTo(this.leftKnee.x, this.leftKnee.y);
        ctx.lineTo(this.leftFoot.x, this.leftFoot.y);
        ctx.stroke();

        // 右足
        ctx.strokeStyle = keys.p ? '#ff0000' : '#0000ff';
        ctx.beginPath();
        ctx.moveTo(this.rightKnee.x, this.rightKnee.y);
        ctx.lineTo(this.rightFoot.x, this.rightFoot.y);
        ctx.stroke();

        // 胴体
        ctx.strokeStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(this.hip.x, this.hip.y);
        ctx.lineTo(this.hip.x, this.hip.y - 40);
        ctx.stroke();

        // 頭
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(this.hip.x, this.hip.y - 50, 10, 0, Math.PI * 2);
        ctx.fill();

        // 地面との接触点
        if (this.leftFootContact) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.leftFoot.x, this.leftFoot.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.rightFootContact) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.rightFoot.x, this.rightFoot.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// 走者のインスタンス
let runner = new Runner();

// ゲームの初期化
function initGame() {
    gameOver = false;
    distance = 0;
    runner = new Runner();

    // セーフガード：要素が存在する場合のみ操作を行う
    if (distanceElement) {
        distanceElement.textContent = `走行距離: ${distance} m`;
    }

    if (gameOverElement) {
        gameOverElement.style.display = 'none';
    }
}

// ゲームループ
function gameLoop() {
    // 背景のクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ゲームオーバーでなければ更新
    if (!gameOver) {
        runner.update();
    }

    // 走者の描画
    runner.draw();

    // 走行距離の表示更新（セーフガード付き）
    if (distanceElement) {
        distanceElement.textContent = `走行距離: ${distance} m`;
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
        ctx.fillText('ゲームオーバー!', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '24px Arial';
        ctx.fillText(`走行距離: ${distance} m`, canvas.width / 2, canvas.height / 2 + 20);

        // ベストスコアの更新
        if (distance > bestDistance) {
            bestDistance = distance;
        }

        ctx.fillText(`ベスト: ${bestDistance} m`, canvas.width / 2, canvas.height / 2 + 50);
        ctx.restore();
    }

    // 次のフレームをリクエスト
    requestAnimationFrame(gameLoop);
}

// キーボード入力の処理
document.addEventListener('keydown', (event) => {
    if (gameOver) return;

    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;
    }
});

// リスタートボタン
if (restartButton) {
    restartButton.addEventListener('click', () => {
        initGame();
    });
}

// ゲーム開始
initGame();
requestAnimationFrame(gameLoop);