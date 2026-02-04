// ==========================================
// ** 1. CONFIGURATION **
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC76uQ_D4GHJNxoPXd5xZYq19rTlsQMDF4",
    authDomain: "kalamiargame.firebaseapp.com",
    databaseURL: "https://kalamiargame-default-rtdb.firebaseio.com",
    projectId: "kalamiargame",
    storageBucket: "kalamiargame.firebasestorage.app",
    messagingSenderId: "985182093365",
    appId: "1:985182093365:web:12255056b741cbf4a5317c",
    measurementId: "G-QE45GK66KT"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// ==========================================
// ** 2. ASSETS & VARIABLES **
// ==========================================
const thin1 = new Image(); thin1.src = 'thin1.png';
const thin2 = new Image(); thin2.src = 'thin2.png';
const thin3 = new Image(); thin3.src = 'thin3.png';
const med1 = new Image(); med1.src = 'med1.png';
const med2 = new Image(); med2.src = 'med2.png';
const med3 = new Image(); med3.src = 'med3.png';
const fat1 = new Image(); fat1.src = 'fat1.png';
const fat2 = new Image(); fat2.src = 'fat2.png';
const fat3 = new Image(); fat3.src = 'fat3.png';
const enemy1 = new Image(); enemy1.src = 'enemy1.png';
const enemy2 = new Image(); enemy2.src = 'enemy2.png';
const enemy3 = new Image(); enemy3.src = 'enemy3.png';
const foodImg = new Image(); foodImg.src = 'burger.png';
const note50 = new Image(); note50.src = 'note50.png';
const note100 = new Image(); note100.src = 'note100.png';
const note200 = new Image(); note200.src = 'note200.png';
const note500 = new Image(); note500.src = 'note500.png';
const note1000 = new Image(); note1000.src = 'note1000.png';
const pubgImg = new Image(); pubgImg.src = 'pubg.png';

const coinSound = new Audio('coin.mp3'); coinSound.preload = 'auto';
const eatSound = new Audio('eat.mp3'); eatSound.preload = 'auto';
const passSound = new Audio('pass.mp3'); passSound.preload = 'auto';
const outSound = new Audio('out.mp3'); outSound.preload = 'auto';
const stoneSound = new Audio('stone_hit.mp3'); stoneSound.preload = 'auto';
const fatSound = new Audio('fat.mp3'); fatSound.preload = 'auto'; fatSound.loop = true; fatSound.volume = 1.0;
const pubgSound = new Audio('pubg.mp3'); pubgSound.preload = 'auto';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const centerAnim = document.getElementById("centerAnim");
const warningMsg = document.getElementById("warningMsg");
const finalScorePanel = document.getElementById("finalScorePanel");
const uiBar = document.getElementById("uiBar");
const overlay = document.getElementById("overlay");

let animationId;
let gameRunning = false;
let isDead = false;
let deathTimer = 0;
let deathLimit = 0;
let pubgTimer = 0;
let isPubgPlaying = false;
let score = 0;
let gameSpeed = 4;
let frame = 0;
const targetScore = 30000000;
const groundHeight = 60;
let currentPlayerName = "";
let currentPlayerData = { total: 0, highest: 0 };
let globalTopRank = { name: "কেউ না", score: 0 };
let bgGradient;

// ==========================================
// ** 3. INITIALIZATION **
// ==========================================
window.onload = function() {
    resize();
    listenToTopRank();
    const introVideo = document.getElementById('introVideo');
    if(introVideo) introVideo.play().catch(()=>{});
    
    fatSound.load();
    pubgSound.load();

    const lastPlayer = localStorage.getItem('lc_last_player');
    if (lastPlayer) {
        currentPlayerName = lastPlayer;
        updateUIForLoggedInUser();
        syncUserWithFirebase(lastPlayer);
    } else {
        document.getElementById('titleMsg').innerText = "WELCOME!";
        const nameDisp = document.getElementById('showPlayerName');
        if(nameDisp) nameDisp.style.display = 'none'; // নাম না থাকলে হাইড
    }
    
    document.getElementById('finalScorePanel').style.display = 'none';
};

window.addEventListener('resize', resize);

function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    createBackgroundGradient();
}

function createBackgroundGradient() {
    const H = window.innerHeight;
    bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, "#2980B9");
    bgGradient.addColorStop(1, "#6DD5FA");
}

// script.js এর syncUserWithFirebase ফাংশন
function syncUserWithFirebase(name) {
    db.ref('users/' + name).off();

    db.ref('users/' + name).on('value', (snapshot) => {
        if (snapshot.exists()) {
            currentPlayerData = snapshot.val();
            if(document.getElementById('myBestDisp')) {
                document.getElementById('myBestDisp').innerText = toBanglaNum(currentPlayerData.highest);
            }
        } else {
            if (localStorage.getItem('lc_last_player') === name) {
                gameRunning = false;
                if(animationId) cancelAnimationFrame(animationId);
                
                db.ref('kick_messages/' + name).once('value').then((msgSnap) => {
                    let alertMsg = "আপনার একাউন্টটি অ্যাডমিন প্যানেল থেকে ডিলিট করা হয়েছে!";
                    if (msgSnap.exists()) {
                        alertMsg = "মেসেজ: " + msgSnap.val();
                        db.ref('kick_messages/' + name).remove();
                    }
                    alert(alertMsg);
                    localStorage.removeItem('lc_last_player');
                    currentPlayerName = "";
                    window.location.reload();
                });
            }
        }
    });
}

function updateUIForLoggedInUser() {
    document.getElementById('mainPlayBtn').innerText = "PLAY"; 
    document.getElementById('leaderboardBtn').style.display = "inline-block";
    
    // ** লোগোর নিচের এলিমেন্ট ধরা **
    const nameDisplay = document.getElementById('showPlayerName');
    
    if (nameDisplay) {
        // এখানে স্বাগতম মেসেজ বসানো হলো
        nameDisplay.innerText = "Welcome " + currentPlayerName + "!";
        nameDisplay.style.display = "block";
    }
    
    // টাইটেলটা ফাঁকা বা হাইড করে দেয়া (যাতে ডাবল না দেখায়)
    const titleMsg = document.getElementById('titleMsg');
    if(titleMsg && titleMsg.innerText === "") {
        titleMsg.style.display = 'none';
    }
}

function handlePlayButton() {
    if (currentPlayerName && currentPlayerName !== "") startGame();
    else openNameInput();
}

// ==========================================
// ** 4. NAME VALIDATION LOGIC **
// ==========================================
function checkNameLocal(name, takenNames = []) {
    let lowerName = name.toLowerCase();
    const badPatterns = [ /f+u+c+k+/, /f+c+k+/, /s+e+x+/, /d+i+c+k+/, /c+o+c+k+/, /b+i+t+c+h+/, /a+s+s+/, /n+u+d+e+/, /p+o+r+n+/, /x+x+x+/, /p+u+s+s+y+/, /s+l+u+t+/, /w+h+o+r+e+/, /k+u+t+t+a+/, /k+u+t+a+/, /k+u+u+t+a+/, /m+a+g+i+/, /m+a+a+g+i+/, /m+g+i+/, /c+h+o+d+/, /c+o+d+/, /c+u+d+/, /b+a+l+/, /b+a+a+l+/, /b+h+a+l+/, /k+h+a+n+k+i+/, /k+n+k+i+/, /s+h+u+o+r+/, /s+u+o+r+/, /s+o+n+a+/, /s+h+o+n+a+/ ];
    const specificBadWords = ["heda", "hda", "madarchod", "mdrchod", "chodna", "codna", "bokachoda", "marani", "putki", "gali", "boda", "voda", "bnchd", "bainchd", "bastard"];

    for (let pattern of badPatterns) {
        if (pattern.test(lowerName)) { let match = lowerName.match(pattern); return { valid: false, msg: `গালি দিবি না (${match[0]})` }; }
    }
    for (let bad of specificBadWords) {
        if (lowerName.includes(bad)) return { valid: false, msg: `গালি দিবি না (${bad})` };
    }
    let baseNameMatch = name.match(/^[a-zA-Z]+/);
    if (!baseNameMatch) return { valid: false, msg: "Warning: Enter your real name" };
    let baseName = baseNameMatch[0];
    if (baseName.length < 3 || baseName.length > 6) return { valid: false, msg: "Warning: Enter your real name" };
    const vowels = baseName.toLowerCase().match(/[aeiou]/g);
    if ((vowels ? vowels.length : 0) < 2) return { valid: false, msg: "Warning: Enter your real name" };
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(baseName)) return { valid: false, msg: "Warning: Enter your real name" };

    return { valid: true };
}

function submitName() {
    const input = document.getElementById('playerNameInput').value.trim();
    const submitBtn = document.querySelector('#nameModal button');
    const errorMsg = document.getElementById('nameError');
    const originalBtnText = "সাবমিট";
    errorMsg.style.display = 'none';

    const localCheck = checkNameLocal(input, []);
    if (!localCheck.valid) { showNameError(localCheck.msg); return; }

    submitBtn.innerText = "চেক করা হচ্ছে...";
    submitBtn.disabled = true;

    const baseNameMatch = input.match(/^[a-zA-Z]+/);
    const baseName = baseNameMatch[0];
    const hasNumber = /[0-9]+$/.test(input);

    db.ref('users/' + baseName).get().then((baseSnapshot) => {
        if (baseSnapshot.exists()) {
            if (!hasNumber) { showNameError("এই নামটি নেওয়া হয়ে গেছে! নামের শেষে সংখ্যা যোগ করুন"); resetBtn(); } 
            else {
                db.ref('users/' + input).get().then((fullSnapshot) => {
                    if (fullSnapshot.exists()) { showNameError("এই নাম এবং সংখ্যাও ব্যবহার হয়েছে, অন্য সংখ্যা দিন।"); resetBtn(); } 
                    else { saveUserAndStart(input); }
                });
            }
        } else {
            if (hasNumber) { showNameError("Warning: নাম খালি আছে, নম্বর ছাড়া চেষ্টা করুন।"); resetBtn(); } 
            else { saveUserAndStart(input); }
        }
    }).catch((error) => { showNameError("ইন্টারনেট সমস্যা!"); resetBtn(); });

    function saveUserAndStart(validName) {
        currentPlayerName = validName;
        currentPlayerData = { name: validName, total: 0, highest: 0 };
        db.ref('users/' + validName).set(currentPlayerData);
        localStorage.setItem('lc_last_player', currentPlayerName);
        
        syncUserWithFirebase(validName);
        updateUIForLoggedInUser(); // UI আপডেট করা
        closeModal('nameModal');
        resetBtn();
        startGame();
    }
    function resetBtn() { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
}

function showNameError(msg) { const err = document.getElementById('nameError'); err.style.display = 'block'; err.innerText = msg; }

// ==========================================
// ** 5. GAME ENGINE **
// ==========================================
function listenToTopRank() {
    db.ref('globalTopRank').on('value', (snapshot) => {
        if (snapshot.exists()) {
            globalTopRank = snapshot.val();
            const hudInfo = document.getElementById('hudKingInfo');
            if(hudInfo) {
                let shortName = globalTopRank.name.substring(0, 6);
                hudInfo.innerHTML = `${shortName} (${toBanglaNum(globalTopRank.score)})`;
            }
        } else {
            const hudInfo = document.getElementById('hudKingInfo');
            if(hudInfo) hudInfo.innerText = "খালি";
        }
    });
}

function updateDataOnDeath() {
    if (!currentPlayerName) return;
    currentPlayerData.total += score;
    if (score > currentPlayerData.highest) { currentPlayerData.highest = score; }
    const updates = {};
    updates['/users/' + currentPlayerName] = currentPlayerData;
    if (score > globalTopRank.score) { 
        updates['/globalTopRank'] = { name: currentPlayerName, score: score }; 
    }
    db.ref().update(updates);
}

function showLeaderboard() {
    if(!currentPlayerName) { openNameInput(); return; }
    document.getElementById('leaderboardModal').style.display = 'flex';
    const listDiv = document.getElementById('leaderboardList');
    const totalMsg = document.getElementById('totalLootMsg');
    listDiv.innerHTML = "লোড হচ্ছে...";
    
    db.ref('users').get().then((snapshot) => {
        if (snapshot.exists()) {
            const usersObj = snapshot.val();
            let sortedPlayers = Object.values(usersObj).sort((a, b) => b.total - a.total);
            let grandTotal = 0;
            sortedPlayers.forEach(player => { grandTotal += (player.total || 0); });
            totalMsg.innerHTML = `সবাই মিলে এই পর্যন্ত মোট <span style="color: #FFD700; font-weight:bold;">${toBanglaNum(grandTotal)}</span> টাকা মেরেছেন!`;
            listDiv.innerHTML = "";
            sortedPlayers.slice(0, 50).forEach((p, index) => {
                let item = document.createElement('div');
                item.className = 'rank-item';
                if (p.name === currentPlayerName) item.classList.add('highlight');
                item.innerHTML = `<span>#${index+1} ${p.name}</span> <span>${toBanglaNum(p.total)} ৳</span>`;
                listDiv.appendChild(item);
            });
        } else { listDiv.innerHTML = "এখনও কেউ খেলেনি!"; totalMsg.innerText = ""; }
    }).catch((error) => { listDiv.innerHTML = "ডাটা লোড করতে সমস্যা হয়েছে!"; });
}

function openNameInput() { document.getElementById('nameModal').style.display = 'flex'; document.getElementById('playerNameInput').focus(); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; document.getElementById('nameError').style.display = 'none'; }
function toBanglaNum(num) { return num.toLocaleString('bn-BD'); }

function triggerCenterAnim(text, color) {
    centerAnim.innerText = text; centerAnim.style.color = color;
    centerAnim.style.transform = "translate(-50%, -50%) scale(1.2)"; centerAnim.style.opacity = "1";
    setTimeout(() => { centerAnim.style.transform = "translate(-50%, -50%) scale(0)"; centerAnim.style.opacity = "0"; }, 800);
}
function showWarning(text) { warningMsg.innerText = text; warningMsg.style.display = 'block'; }
function hideWarning() { warningMsg.style.display = 'none'; }

pubgSound.addEventListener('play', () => { isPubgPlaying = true; fatSound.volume = 0; });
pubgSound.addEventListener('ended', () => { isPubgPlaying = false; if (currentState === STATE_FAT_WAIT) fatSound.volume = 1.0; });

const STATE_MED_START = 0; const STATE_THIN_WAIT = 1; const STATE_HUNTING = 2; const STATE_FAT_WAIT = 3; const STATE_MED_WAIT = 4;
let currentState = STATE_MED_START; let stateTimer = 0; let burgersEaten = 0;
const player = { x: 30, y: 0, width: 60, baseWidth: 45, medWidth: 60, fatWidth: 90, height: 85, dy: 0, jumpPower: -14, gravity: 0.6, grounded: false };

function jump() { if (player.grounded && gameRunning && !isDead) { player.dy = player.jumpPower; player.grounded = false; } }
document.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') jump(); });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, { passive: false });
canvas.addEventListener('mousedown', jump);

function startGame() {
    const introVideo = document.getElementById('introVideo');
    if(introVideo) introVideo.pause();
    overlay.style.display = 'none'; overlay.classList.remove('game-over-mode');
    finalScorePanel.style.display = 'none'; uiBar.style.opacity = '1';
    
    // গেম শুরু হলে লোগো বা টাইটেল হাইড করা যেতে পারে, তবে এখন থাক
    if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen().catch(()=>{}); }
    fatSound.play().then(() => fatSound.pause()).catch(()=>{});
    resetGame();
}

function spawnCash() {
    let r = Math.random(); let img, val;
    if(r < 0.2) { img = note1000; val = 1000; } else if(r < 0.4) { img = note500; val = 500; }
    else if(r < 0.6) { img = note200; val = 200; } else if(r < 0.8) { img = note100; val = 100; }
    else { img = note50; val = 50; }
    items.push({ x: window.innerWidth, y: Math.random() > 0.5 ? window.innerHeight - groundHeight - 150 : window.innerHeight - groundHeight - 80, width: 30, height: 60, type: 'cash', value: val, img: img });
}
function spawnFood() { let spawnY = (Math.random() < 0.7) ? window.innerHeight - groundHeight - 160 : window.innerHeight - groundHeight - 60; items.push({ x: window.innerWidth, y: spawnY, width: 55, height: 45, type: 'food', value: 0 }); }
function spawnPubgIcon() { 
    if (currentState === STATE_FAT_WAIT) return;
    const lastItem = items[items.length - 1]; const lastObs = obstacles[obstacles.length - 1];
    if ((lastItem && lastItem.x > window.innerWidth - 200) || (lastObs && lastObs.x > window.innerWidth - 200)) return; 
    items.push({ x: window.innerWidth, y: window.innerHeight - groundHeight - 200, width: 50, height: 50, type: 'pubg', value: 0, img: pubgImg }); 
}
function spawnObstacle() {
    let isEnemy = (frame > 1080) ? Math.random() < 0.45 : false;
    if(isEnemy) obstacles.push({ type: 'enemy', x: window.innerWidth, y: window.innerHeight - groundHeight - 85, width: 50, height: 85, speedOffset: 1.5, runFrame: 0, passed: false });
    else obstacles.push({ type: 'stone', x: window.innerWidth, y: window.innerHeight - groundHeight - 25, width: 30, height: 25, color: '#616161' });
}
function drawBackground() {
    const W = window.innerWidth; const H = window.innerHeight; let groundY = H - groundHeight;
    if(bgGradient) { ctx.fillStyle = bgGradient; ctx.fillRect(0,0,W,H); } else { ctx.fillStyle = "#2980B9"; ctx.fillRect(0,0,W,H); }
    ctx.fillStyle = '#3E2723'; ctx.fillRect(0, groundY, W, groundHeight); ctx.fillStyle = '#43A047'; ctx.fillRect(0, groundY, W, 10);
}
function update() {
    animationId = requestAnimationFrame(update); drawBackground();
    if (isDead) { deathTimer++; drawObjects(); if (deathTimer >= deathLimit) showGameOverMenu(); return; }
    if (!gameRunning) return;
    frame++; stateTimer++; pubgTimer++; if (pubgTimer >= 2100) { spawnPubgIcon(); pubgTimer = 0; }
    player.dy += player.gravity; player.y += player.dy;
    const groundY = window.innerHeight - groundHeight;
    if (player.y + player.height > groundY) { player.y = groundY - player.height; player.dy = 0; player.grounded = true; }
    
    switch (currentState) {
        case STATE_MED_START: 
            player.width = player.medWidth; 
            if(stateTimer >= 900) { currentState = STATE_THIN_WAIT; stateTimer = 0; player.width = player.baseWidth; triggerCenterAnim("ওজন কমেছে!", "#2196F3"); } break;
        case STATE_THIN_WAIT: 
            showWarning("খানা দে খিদা লাগছে! 😫"); 
            if(stateTimer >= 900) { currentState = STATE_HUNTING; stateTimer = 0; burgersEaten = 0; } break;
        case STATE_HUNTING: 
            showWarning("খানা দে খিদা লাগছে! 😫"); 
            if(burgersEaten >= 5 && burgersEaten < 13) { player.width = player.medWidth; hideWarning(); } 
            else if (burgersEaten >= 13) { player.width = player.fatWidth; currentState = STATE_FAT_WAIT; stateTimer = 0; triggerCenterAnim("মোটা হয়ে গেছি!", "#FF5722"); if(!isPubgPlaying) { fatSound.volume = 1.0; fatSound.currentTime = 0; fatSound.play().catch(()=>{}); } else { fatSound.volume = 0; fatSound.play().catch(()=>{}); } } break;
        case STATE_FAT_WAIT: 
            showWarning("ডায়েট করতে হবে! আর খাবো না ❌"); 
            if(stateTimer >= 1500) { currentState = STATE_MED_WAIT; player.width = player.medWidth; stateTimer = 0; hideWarning(); triggerCenterAnim("ডায়েট কমপ্লিট!", "#4CAF50"); fatSound.pause(); fatSound.currentTime = 0; } break;
        case STATE_MED_WAIT: 
            if(stateTimer >= 900) { currentState = STATE_THIN_WAIT; player.width = player.baseWidth; stateTimer = 0; burgersEaten = 0; triggerCenterAnim("আবার খিদা লেগেছে!", "#FFEB3B"); } break;
    }
    drawObjects(); 
    if (frame % 150 === 0) spawnCash(); 
    if (currentState === STATE_HUNTING && frame % 120 === 0) spawnFood(); 
    if (frame % 350 === 0) spawnObstacle(); 
    updateEntities();
    if (frame % 2000 === 0) gameSpeed += 0.05; 
    if (score >= targetScore) winGame(); 
    document.getElementById('burgerCount').innerText = toBanglaNum(burgersEaten);
}

function updateEntities() {
    for (let i = 0; i < items.length; i++) {
        let item = items[i]; item.x -= gameSpeed; let itemHit = { x: item.x + 5, y: item.y + 5, width: item.width - 10, height: item.height - 10 };
        if (checkCollision(player, itemHit)) {
            if (item.type === 'cash') { score += item.value; if (!isPubgPlaying) { coinSound.currentTime = 0; coinSound.play().catch(()=>{}); } triggerCenterAnim(`+${item.value}`, '#2E7D32'); document.getElementById('scoreDisp').innerText = toBanglaNum(score); } 
            else if (item.type === 'food') { burgersEaten++; if (!isPubgPlaying) { eatSound.currentTime = 0; eatSound.play().catch(()=>{}); } triggerCenterAnim("Yummy!", "#FF9800"); } 
            else if (item.type === 'pubg') { pubgSound.currentTime = 0; pubgSound.play().catch(()=>{}); triggerCenterAnim("Winner Winner!", "#FBC02D"); }
            items.splice(i, 1); i--;
        } else if (item.x + item.width < -50) { items.splice(i, 1); i--; }
    }
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i]; let speed = (obs.type === 'enemy') ? (gameSpeed + 1.2) : gameSpeed; obs.x -= speed;
        if(obs.type === 'enemy') { 
            obs.runFrame = (obs.runFrame || 0) + 1; 
            let hitbox = { x: obs.x + 10, y: obs.y + 10, width: obs.width - 20, height: obs.height - 15 }; 
            if (!obs.passed && obs.x + obs.width < player.x) { if (!isPubgPlaying) { passSound.currentTime = 0; passSound.play().catch(()=>{}); } obs.passed = true; } 
            if (checkCollision(player, hitbox)) { handleDeath("enemy"); return; } 
        } else { 
            let hitbox = { x: obs.x + 8, y: obs.y + 8, width: obs.width - 16, height: obs.height - 10 }; 
            if (checkCollision(player, hitbox)) { handleDeath("stone"); return; } 
        }
        if (obs.x + obs.width < -50) { obstacles.splice(i, 1); i--; }
    }
}
function drawObjects() {
    let currentImg; let runIndex = Math.floor(frame / 6) % 3;
    if (player.width < 55) { if(player.grounded) { if(runIndex==0) currentImg=thin1; else if(runIndex==1) currentImg=thin2; else currentImg=thin3; } else currentImg=thin1; } 
    else if (player.width > 80) { if(player.grounded) { if(runIndex==0) currentImg=fat1; else if(runIndex==1) currentImg=fat2; else currentImg=fat3; } else currentImg=fat1; } 
    else { if(player.grounded) { if(runIndex==0) currentImg=med1; else if(runIndex==1) currentImg=med2; else currentImg=med3; } else currentImg=med1; }
    if(currentImg && currentImg.complete && currentImg.naturalHeight !== 0) ctx.drawImage(currentImg, Math.floor(player.x), Math.floor(player.y), player.width, player.height);
    else { ctx.fillStyle = 'orange'; ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.width, player.height); }
    items.forEach(item => { if (item.type === 'pubg') { if(item.img && item.img.complete) ctx.drawImage(item.img, Math.floor(item.x), Math.floor(item.y), item.width, item.height); else { ctx.fillStyle = 'gold'; ctx.fillRect(Math.floor(item.x), Math.floor(item.y), item.width, item.height); } } else if(item.type === 'cash') { if(item.img && item.img.complete) ctx.drawImage(item.img, Math.floor(item.x), Math.floor(item.y), item.width, item.height); else { ctx.fillStyle = '#4CAF50'; ctx.fillRect(Math.floor(item.x), Math.floor(item.y), item.width, item.height); } } else if(item.type === 'food') { if(foodImg.complete) ctx.drawImage(foodImg, Math.floor(item.x), Math.floor(item.y), item.width, item.height); else { ctx.fillStyle = '#FF5722'; ctx.beginPath(); ctx.arc(item.x+20, item.y+20, 20, 0, Math.PI*2); ctx.fill(); } } });
    obstacles.forEach(obs => { if(obs.type === 'enemy') { let enIndex = Math.floor(obs.runFrame / 8) % 3; let eImg = (enIndex==0)?enemy1:(enIndex==1?enemy2:enemy3); if(eImg.complete) ctx.drawImage(eImg, Math.floor(obs.x), Math.floor(obs.y), obs.width, obs.height); else { ctx.fillStyle = '#212121'; ctx.fillRect(Math.floor(obs.x), Math.floor(obs.y), obs.width, obs.height); } } else { ctx.fillStyle = '#616161'; ctx.beginPath(); ctx.moveTo(Math.floor(obs.x), Math.floor(obs.y) + obs.height); ctx.lineTo(Math.floor(obs.x) + obs.width/2, Math.floor(obs.y)); ctx.lineTo(Math.floor(obs.x) + obs.width, Math.floor(obs.y) + obs.height); ctx.fill(); } });
}
function checkCollision(p, obj) { let pRect = { x: p.x + 10, y: p.y + 5, width: p.width - 20, height: p.height - 5 }; return (pRect.x < obj.x + obj.width && pRect.x + pRect.width > obj.x && pRect.y < obj.y + obj.height && pRect.y + pRect.height > obj.y); }

function handleDeath(type) { 
    if(isDead) return; isDead = true; cancelAnimationFrame(animationId); 
    fatSound.pause(); fatSound.currentTime = 0; pubgSound.pause(); pubgSound.currentTime = 0; isPubgPlaying = false; 
    if(type === 'enemy') { outSound.currentTime = 0; outSound.play().catch(()=>{}); deathLimit = 210; } else { stoneSound.currentTime = 0; stoneSound.play().catch(()=>{}); deathLimit = 330; } 
    document.getElementById('uiBar').style.opacity = '0'; hideWarning(); 
    const dMsg = document.getElementById('deathMsg'); const dVal = document.getElementById('deathScoreVal'); dVal.innerText = toBanglaNum(score); dMsg.style.display = 'block'; dMsg.classList.add('slide-down-anim'); 
    updateDataOnDeath(); 
    function deathLoop() { if(!isDead) return; deathTimer++; drawBackground(); drawObjects(); if(deathTimer >= deathLimit) showGameOverMenu(); else requestAnimationFrame(deathLoop); } deathLoop(); 
}

function showGameOverMenu() { 
    const dMsg = document.getElementById('deathMsg'); 
    dMsg.style.display = 'none'; 
    dMsg.classList.remove('slide-down-anim');

    const logo = document.getElementById('gameLogo'); 
    const note = document.getElementById('gameNote'); 
    if(logo) logo.style.display = 'none'; // গেম ওভারে লোগোও হাইড থাকে
    if(note) note.style.display = 'none';

    const introVideo = document.getElementById('introVideo'); 
    if(introVideo) { 
        introVideo.currentTime = 0; 
        introVideo.play().catch(()=>{}); 
    }
    
    overlay.style.display = 'flex'; 
    overlay.classList.add('game-over-mode'); 
    
    document.getElementById('finalScorePanel').style.display = 'block'; 
    document.getElementById('finalScoreVal').innerText = toBanglaNum(score) + " ৳";
    
    let myBest = currentPlayerData ? currentPlayerData.highest : score; 
    document.getElementById('personalBestVal').innerText = toBanglaNum(myBest) + " ৳";
    
    let kingText = `${globalTopRank.name} (${toBanglaNum(globalTopRank.score)})`; 
    document.getElementById('globalKingVal').innerText = kingText;
    
    document.getElementById('titleMsg').innerText = ""; 
    document.getElementById('titleMsg').style.color = "#FF7043"; 
    document.getElementById('titleMsg').style.display = 'block';

    // 👇 এই অংশটুকু চেঞ্জ করা হয়েছে 👇
    // গেম ওভার হলে নাম দেখানোর দরকার নেই, তাই হাইড করে দিচ্ছি
    const nameDisp = document.getElementById('showPlayerName');
    if(nameDisp) {
        nameDisp.style.display = 'none';
    }

    document.getElementById('mainPlayBtn').innerText = "PLAY AGAIN"; 
    
    const welcomeMsg = document.getElementById('welcomeUserMsg'); 
    if(welcomeMsg) welcomeMsg.style.display = 'none'; 
    
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.style.display = 'block'; 
}

function winGame() { gameRunning = false; document.getElementById('overlay').style.display = 'flex'; document.getElementById('titleMsg').innerText = "অভিনন্দন!"; document.getElementById('titleMsg').style.color = "#00E676"; }
function resetGame() { 
    if(animationId) cancelAnimationFrame(animationId); fatSound.pause(); fatSound.currentTime = 0; pubgSound.pause(); pubgSound.currentTime = 0; isPubgPlaying = false; score = 0; gameSpeed = 4; frame = 0; items = []; obstacles = []; burgersEaten = 0; stateTimer = 0; pubgTimer = 0; currentState = STATE_MED_START; player.width = player.medWidth; player.y = 0; isDead = false; deathTimer = 0; gameRunning = true; 
    document.getElementById('uiBar').style.opacity = '1'; document.getElementById('scoreDisp').innerText = "০"; hideWarning(); update(); 
}

let muteClickCount = 0;
let muteTimer;

function toggleMute() {
    const video = document.getElementById('introVideo');
    const btn = document.getElementById('muteBtn');
    if (video.muted) { video.muted = false; btn.innerText = "🔊"; } 
    else { video.muted = true; btn.innerText = "🔇"; }
    muteClickCount++;
    clearTimeout(muteTimer);
    muteTimer = setTimeout(() => { muteClickCount = 0; }, 2000);
    if (muteClickCount >= 6) {
        let pass = prompt("Admin Password:");
        if (pass === "nahiAdmin") { window.location.href = "admin.html"; } 
        else { alert("ভুল পাসওয়ার্ড! 😡"); }
        muteClickCount = 0;
    }
}
function goToHome() { window.location.reload(); }