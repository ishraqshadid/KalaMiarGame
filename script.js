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

const thin1 = new Image(); thin1.src = 'thin1.webp';
const thin2 = new Image(); thin2.src = 'thin2.webp';
const thin3 = new Image(); thin3.src = 'thin3.webp';
const med1 = new Image(); med1.src = 'med1.webp';
const med2 = new Image(); med2.src = 'med2.webp';
const med3 = new Image(); med3.src = 'med3.webp';
const fat1 = new Image(); fat1.src = 'fat1.webp';
const fat2 = new Image(); fat2.src = 'fat2.webp';
const fat3 = new Image(); fat3.src = 'fat3.webp';
const enemy1 = new Image(); enemy1.src = 'enemy1.webp';
const enemy2 = new Image(); enemy2.src = 'enemy2.webp';
const enemy3 = new Image(); enemy3.src = 'enemy3.webp';
const foodImg = new Image(); foodImg.src = 'burger.webp';
const note50 = new Image(); note50.src = 'note50.webp';
const note100 = new Image(); note100.src = 'note100.webp';
const note200 = new Image(); note200.src = 'note200.webp';
const note500 = new Image(); note500.src = 'note500.webp';
const note1000 = new Image(); note1000.src = 'note1000.webp';
const pubgImg = new Image(); pubgImg.src = 'pubg.webp';

const coinSound = new Audio('coin.mp3'); coinSound.preload = 'auto';
const eatSound = new Audio('eat.mp3'); eatSound.preload = 'auto';
const passSound = new Audio('pass.mp3'); passSound.preload = 'auto';
const outSound = new Audio('out.mp3'); outSound.preload = 'auto';
const stoneSound = new Audio('stone_hit.mp3'); stoneSound.preload = 'auto';
const fatSound = new Audio('fat.mp3'); fatSound.preload = 'auto'; fatSound.loop = true; fatSound.volume = 1.0;
const pubgSound = new Audio('pubg.mp3'); pubgSound.preload = 'auto';

// --- BACKGROUND MUSIC SETUP ---
// এই মিউজিকটি অন্য সাউন্ডের সাথে বা PUBG সাউন্ডের সাথে বন্ধ হবে না।
const bgMusic = new Audio('bg.mp3'); 
bgMusic.preload = 'auto'; 
bgMusic.loop = true; // লুপ হবে
bgMusic.volume = 0.5; // ভলিউম ৫০% (যাতে অন্য সাউন্ড শোনা যায়, চাইলে বাড়াতে পারেন)
// ------------------------------

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

let extraLives = 0; 
let lifeBlinkTimer = 0;
let isInvincible = false;

let currentAlertData = null; 

window.onload = function() {
    resize();
    listenToTopRank();
    const introVideo = document.getElementById('introVideo');
    if(introVideo) introVideo.play().catch(()=>{});
    
    fatSound.load();
    pubgSound.load();
    bgMusic.load(); // লোড করা হলো

    const lastPlayer = localStorage.getItem('lc_last_player');
    if (lastPlayer) {
        currentPlayerName = lastPlayer;
        updateUIForLoggedInUser();
        syncUserWithFirebase(lastPlayer);
        startActiveStatusUpdater();
        listenToAlerts(lastPlayer); 
    } else {
        document.getElementById('titleMsg').innerText = "WELCOME!";
        const nameDisp = document.getElementById('showPlayerName');
        if(nameDisp) nameDisp.style.display = 'none'; 
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

function startActiveStatusUpdater() {
    setInterval(() => {
        if(currentPlayerName) {
            db.ref('users/' + currentPlayerName).update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }, 10000); 
}

function listenToAlerts(name) {
    db.ref('alerts/' + name).on('value', (snapshot) => {
        if(snapshot.exists()) {
            const data = snapshot.val();
            currentAlertData = data; 
            showRedAlert(data.message);
        }
    });
}

function showRedAlert(msg) {
    const modal = document.getElementById('redAlertModal');
    const txt = document.getElementById('redAlertText');
    txt.innerText = msg;
    modal.style.display = 'flex';
    
    fatSound.pause();
    pubgSound.pause();
    bgMusic.pause(); // গেম পজ হলে বিজি মিউজিক থামবে
    
    if(gameRunning) {
        cancelAnimationFrame(animationId);
    }
}

function closeRedAlert() {
    document.getElementById('redAlertModal').style.display = 'none';
    
    if(currentPlayerName) {
        db.ref('alerts/' + currentPlayerName).remove();
    }

    if(currentAlertData && currentAlertData.type === 'rename') {
        const newName = currentAlertData.newName;
        localStorage.setItem('lc_last_player', newName);
        location.reload(); 
    }
    else if (currentAlertData && currentAlertData.type === 'kick') {
        localStorage.removeItem('lc_last_player');
        currentPlayerName = "";
        window.location.reload();
    }
    else if (gameRunning) {
        update(); 
        bgMusic.play().catch(()=>{}); // আবার চালু হবে
        if(!isPubgPlaying && currentState === STATE_FAT_WAIT) {
            fatSound.play().catch(()=>{});
        }
    }
    
    currentAlertData = null;
}

function syncUserWithFirebase(name) {
    db.ref('users/' + name).off();
    db.ref('users/' + name).on('value', (snapshot) => {
        if (snapshot.exists()) {
            currentPlayerData = snapshot.val();
            if(document.getElementById('myBestDisp')) {
                document.getElementById('myBestDisp').innerText = toBanglaNum(currentPlayerData.highest);
            }
        } else {
            setTimeout(() => {
                if(!currentAlertData) { 
                     db.ref('kick_messages/' + name).once('value').then((msgSnap) => {
                         if(localStorage.getItem('lc_last_player') === name) {
                             db.ref('alerts/' + name).once('value').then((alertSnap) => {
                                 if(!alertSnap.exists()) {
                                    gameRunning = false;
                                    if(animationId) cancelAnimationFrame(animationId);
                                    
                                    let alertMsg = "আপনার একাউন্টটি অ্যাডমিন প্যানেল থেকে ডিলিট করা হয়েছে!";
                                    if (msgSnap.exists()) alertMsg = "মেসেজ: " + msgSnap.val();
                                    
                                    currentAlertData = { type: 'kick' };
                                    showRedAlert(alertMsg);
                                    
                                    db.ref('kick_messages/' + name).remove();
                                 }
                             });
                         }
                     });
                }
            }, 1000);
        }
    });
}

function updateUIForLoggedInUser() {
    document.getElementById('mainPlayBtn').innerText = "PLAY"; 
    document.getElementById('leaderboardBtn').style.display = "inline-block";
    const nameDisplay = document.getElementById('showPlayerName');
    if (nameDisplay) {
        nameDisplay.innerText = "Welcome " + currentPlayerName + "!";
        nameDisplay.style.display = "block";
    }
    const titleMsg = document.getElementById('titleMsg');
    if(titleMsg && titleMsg.innerText === "") {
        titleMsg.style.display = 'none';
    }
}

function handlePlayButton() {
    if (currentPlayerName && currentPlayerName !== "") startGame();
    else openNameInput();
}

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
    let rawInput = document.getElementById('playerNameInput').value.trim();
    
    if(!rawInput) return;

    const input = rawInput.charAt(0).toUpperCase() + rawInput.slice(1).toLowerCase();
    
    document.getElementById('playerNameInput').value = input;

    if(input.length > 9) { showNameError("নাম সর্বোচ্চ ৯ অক্ষরের হতে হবে!"); return; }

    const submitBtn = document.querySelector('#nameModal button');
    const errorMsg = document.getElementById('nameError');
    const originalBtnText = "সাবমিট";
    errorMsg.style.display = 'none';

    const localCheck = checkNameLocal(input, []);
    if (!localCheck.valid) { showNameError(localCheck.msg); return; }

    submitBtn.innerText = "চেক করা হচ্ছে...";
    submitBtn.disabled = true;

    db.ref('users').once('value').then((snapshot) => {
        let nameTaken = false;
        let existingName = "";
        let usersData = snapshot.val() || {};
        const keys = Object.keys(usersData);

        for (let i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() === input.toLowerCase()) {
                nameTaken = true;
                existingName = keys[i]; 
                break;
            }
        }

        if (nameTaken) {
            showNameError(`'${existingName}' নামটি ইতিমধ্যে আছে! নামের শেষে সংখ্যা দিন।`);
            resetBtn();
        } else {

            if (input.length <= 6) {
                saveUserAndStart(input);
            } 
            else {
                let baseMatch = input.match(/^([a-zA-Z]+)/);
                let baseName = baseMatch ? baseMatch[0] : input;
                
                let baseNameTaken = false;
                
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i].toLowerCase() === baseName.toLowerCase()) {
                        baseNameTaken = true;
                        break;
                    }
                }

                if (baseNameTaken) {
                    saveUserAndStart(input);
                } else {
                    showNameError(`'${baseName}' নামটি খালি আছে! দয়া করে শুধু '${baseName}' ব্যবহার করুন (৬ অক্ষরের বেশি গ্রহণযোগ্য নয়)।`);
                    resetBtn();
                }
            }
        }

    }).catch((error) => { 
        console.error(error);
        showNameError("ইন্টারনেট সমস্যা!"); 
        resetBtn(); 
    });

    function saveUserAndStart(validName) {
        db.ref('alerts/' + validName).remove(); 
        db.ref('kick_messages/' + validName).remove();

        currentPlayerName = validName;
        currentPlayerData = { name: validName, total: 0, highest: 0 };
        
        db.ref('users/' + validName).set(currentPlayerData);
        localStorage.setItem('lc_last_player', currentPlayerName);
        
        syncUserWithFirebase(validName);
        startActiveStatusUpdater();
        listenToAlerts(validName);
        updateUIForLoggedInUser();
        closeModal('nameModal');
        resetBtn();
        startGame();
    }
    
    function resetBtn() { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
}

function showNameError(msg) { const err = document.getElementById('nameError'); err.style.display = 'block'; err.innerText = msg; }

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

  
    let currentTotal = Number(currentPlayerData.total || 0);
    let currentHighest = Number(currentPlayerData.highest || 0);


    currentPlayerData.total = currentTotal + score;


    if (score > currentHighest) { 
        currentPlayerData.highest = score; 
    }

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
    
    listDiv.innerHTML = "<p style='text-align:center; margin-top:20px; color:#aaa;'>সার্ভার থেকে ডাটা আনা হচ্ছে...</p>";
    totalMsg.innerText = "হিসাব করা হচ্ছে...";
    
    db.ref('users').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const usersObj = snapshot.val();
            let playersArray = [];
            const currentTime = Date.now();

            Object.keys(usersObj).forEach(key => {
                const u = usersObj[key];
                if (u && u.name) {
                    // Time calculation logic for Leaderboard
                    let timeStr = "";
                    if (u.lastSeen) {
                        let diff = currentTime - u.lastSeen;
                        if (diff < 120000) timeStr = "Online"; // < 2 min
                        else {
                            let mins = Math.floor(diff / 60000);
                            let hrs = Math.floor(mins / 60);
                            let days = Math.floor(hrs / 24);
                            
                            if (days > 0) timeStr = `${days}d ago`;
                            else if (hrs > 0) timeStr = `${hrs}h ago`;
                            else timeStr = `${mins}m ago`;
                        }
                    } else {
                        timeStr = "Offline";
                    }

                    playersArray.push({
                        name: u.name,
                        total: u.total || 0, 
                        highest: u.highest || 0,
                        lastSeenStr: timeStr
                    });
                }
            });

            playersArray.sort((a, b) => b.total - a.total);

            let grandTotal = 0;
            playersArray.forEach(p => grandTotal += p.total);
            totalMsg.innerHTML = `সবাই মিলে মোট <span style="color: #FFD700; font-weight:bold;">${toBanglaNum(grandTotal)}</span> টাকা মেরেছেন!`;

            listDiv.innerHTML = "";
            
            playersArray.slice(0, 100).forEach((p, index) => {
                let item = document.createElement('div');
                item.className = 'rank-item';
                
                if (p.name === currentPlayerName) item.classList.add('highlight');
                
                // Color for Online status
                let timeColor = p.lastSeenStr === "Online" ? "#00E676" : "#888";

                item.innerHTML = `
                    <div style="display:flex; flex-direction:column; width: 60%;">
                        <span style="display:flex; align-items:center; gap:8px;">
                            <span style="color:#aaa; font-size:12px;">#${toBanglaNum(index+1)}</span> 
                            <span style="font-weight:bold;">${p.name}</span>
                        </span>
                        <span style="font-size: 10px; color: ${timeColor}; margin-left: 20px;">
                           ${p.lastSeenStr === "Online" ? "● " : ""}${p.lastSeenStr}
                        </span>
                    </div> 
                    <span style="width:40%; text-align:right;">${toBanglaNum(p.total)} ৳</span>
                `;
                listDiv.appendChild(item);
            });

        } else { 
            listDiv.innerHTML = "<p style='text-align:center;'>এখনও কেউ খেলেনি!</p>"; 
            totalMsg.innerText = ""; 
        }
    }).catch((error) => { 
        console.error(error);
        listDiv.innerHTML = "<p style='text-align:center; color:#FF5252;'>ডাটা লোড করতে সমস্যা হয়েছে!</p>"; 
    });
}
function openNameInput() { document.getElementById('nameModal').style.display = 'flex'; document.getElementById('playerNameInput').focus(); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; document.getElementById('nameError').style.display = 'none'; }
function toBanglaNum(num) { return num.toLocaleString('bn-BD'); }

function triggerCenterAnim(text, color) {
    const blockedTexts = [
        "ওজন কমেছে!", 
        "মোটা হয়ে গেছি!", 
        "Yummy!", 
        "ডায়েট কমপ্লিট!", 
        "আবার খিদা লেগেছে!"
    ];

    if (blockedTexts.includes(text)) {
        return; 
    }

    centerAnim.innerText = text; 
    centerAnim.style.color = color;
    centerAnim.style.transform = "translate(-50%, -50%) scale(1.2)"; 
    centerAnim.style.opacity = "1";
    setTimeout(() => { 
        centerAnim.style.transform = "translate(-50%, -50%) scale(0)"; 
        centerAnim.style.opacity = "0"; 
    }, 800);
}
function showWarning(text) { warningMsg.innerText = text; warningMsg.style.display = 'block'; }
function hideWarning() { warningMsg.style.display = 'none'; }

// --- SOUND LOGIC (KEY PART) ---
// এখানে দেখুন: PUBG প্লে হলে শুধু fatSound (হাঁটার শব্দ) মিউট হচ্ছে।
// bgMusic এর নাম এখানে নেই, তাই সেটি বাজতেই থাকবে।
pubgSound.addEventListener('play', () => { 
    isPubgPlaying = true; 
    fatSound.volume = 0; // হাঁটার শব্দ বন্ধ
    // bgMusic চলছে...
});

pubgSound.addEventListener('ended', () => { 
    isPubgPlaying = false; 
    if (currentState === STATE_FAT_WAIT) fatSound.volume = 1.0; 
});
// -----------------------

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
    overlay.style.display = 'none'; 
    overlay.classList.remove('game-over-mode');
    finalScorePanel.style.display = 'none'; uiBar.style.opacity = '1';
    
    // --- LANDSCAPE LOCK LOGIC ---
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock("landscape").catch((err) => {
                    console.log("Landscape lock failed (device may not support):", err);
                });
            }
        }).catch(()=>{});
    }
    // ----------------------------
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
    animationId = requestAnimationFrame(update); 
    drawBackground();

    if (isDead) { 
        deathTimer++; 
        drawObjects(); 
        
        if (deathTimer >= deathLimit) { 
            cancelAnimationFrame(animationId); 
            showGameOverMenu(); 
        }
        return; 
    }
    if (!gameRunning) return;
    
    if(isInvincible) {
        lifeBlinkTimer++;
        if(lifeBlinkTimer > 180) { isInvincible = false; lifeBlinkTimer = 0; }
    }

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
            else if (item.type === 'food') { 
                burgersEaten++; 
                if(burgersEaten === 14) {
                    extraLives++;
                    triggerCenterAnim("1UP! (Life+1)", "#FF4081");
                    document.getElementById('lifeCount').innerText = toBanglaNum(extraLives);
                    eatSound.currentTime = 0; eatSound.play().catch(()=>{});
                } else {
                    if (!isPubgPlaying) { eatSound.currentTime = 0; eatSound.play().catch(()=>{}); } 
                    triggerCenterAnim("Yummy!", "#FF9800"); 
                }
            } 
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
    
    if(isInvincible && Math.floor(frame / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    } else {
        ctx.globalAlpha = 1.0;
    }

    if(currentImg && currentImg.complete && currentImg.naturalHeight !== 0) ctx.drawImage(currentImg, Math.floor(player.x), Math.floor(player.y), player.width, player.height);
    else { ctx.fillStyle = 'orange'; ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.width, player.height); }
    
    ctx.globalAlpha = 1.0; 

    items.forEach(item => { if (item.type === 'pubg') { if(item.img && item.img.complete) ctx.drawImage(item.img, Math.floor(item.x), Math.floor(item.y), item.width, item.height); else { ctx.fillStyle = 'gold'; ctx.fillRect(Math.floor(item.x), Math.floor(item.y), item.width, item.height); } } else if(item.type === 'cash') { if(item.img && item.img.complete) ctx.drawImage(item.img, Math.floor(item.x), Math.floor(item.y), item.width, item.height); else { ctx.fillStyle = '#4CAF50'; ctx.fillRect(Math.floor(item.x), Math.floor(item.y), item.width, item.height); } } else if(item.type === 'food') { if(foodImg.complete) ctx.drawImage(foodImg, Math.floor(item.x), Math.floor(item.y), item.width, item.height); else { ctx.fillStyle = '#FF5722'; ctx.beginPath(); ctx.arc(item.x+20, item.y+20, 20, 0, Math.PI*2); ctx.fill(); } } });
    obstacles.forEach(obs => { if(obs.type === 'enemy') { let enIndex = Math.floor(obs.runFrame / 8) % 3; let eImg = (enIndex==0)?enemy1:(enIndex==1?enemy2:enemy3); if(eImg.complete) ctx.drawImage(eImg, Math.floor(obs.x), Math.floor(obs.y), obs.width, obs.height); else { ctx.fillStyle = '#212121'; ctx.fillRect(Math.floor(obs.x), Math.floor(obs.y), obs.width, obs.height); } } else { ctx.fillStyle = '#616161'; ctx.beginPath(); ctx.moveTo(Math.floor(obs.x), Math.floor(obs.y) + obs.height); ctx.lineTo(Math.floor(obs.x) + obs.width/2, Math.floor(obs.y)); ctx.lineTo(Math.floor(obs.x) + obs.width, Math.floor(obs.y) + obs.height); ctx.fill(); } });
}
function checkCollision(p, obj) { let pRect = { x: p.x + 10, y: p.y + 5, width: p.width - 20, height: p.height - 5 }; return (pRect.x < obj.x + obj.width && pRect.x + pRect.width > obj.x && pRect.y < obj.y + obj.height && pRect.y + pRect.height > obj.y); }

function handleDeath(type) { 
    if(isDead || isInvincible) return; 

    if (extraLives > 0) {
        extraLives--;
        document.getElementById('lifeCount').innerText = toBanglaNum(extraLives);
        isInvincible = true; 
        lifeBlinkTimer = 0;
        triggerCenterAnim("লাইফ ব্যবহার হয়েছে!", "#FF4081");
        obstacles = []; 
        return; 
    }

    isDead = true; 
    
    fatSound.pause(); fatSound.currentTime = 0; 
    pubgSound.pause(); pubgSound.currentTime = 0;
    bgMusic.pause(); bgMusic.currentTime = 0; // গেম ওভার হলে মিউজিক থামবে
    isPubgPlaying = false; 

    deathTimer = 0; 

    if(type === 'enemy') { 
        outSound.currentTime = 0; 
        outSound.play().catch(()=>{}); 
        deathLimit = 250; 
    } else { 
        stoneSound.currentTime = 0; 
        stoneSound.play().catch(()=>{}); 
        deathLimit = 300; 
    } 

    document.getElementById('uiBar').style.opacity = '0'; 
    hideWarning(); 
    
    const dMsg = document.getElementById('deathMsg'); 
    const dVal = document.getElementById('deathScoreVal'); 
    if(dVal) dVal.innerText = toBanglaNum(score); 
    if(dMsg) {
        dMsg.style.display = 'block'; 
        dMsg.classList.add('slide-down-anim'); 
    }
    
    updateDataOnDeath(); 
}

function showGameOverMenu() { 
    try {
        const dMsg = document.getElementById('deathMsg'); 
        if(dMsg) {
            dMsg.style.display = 'none'; 
            dMsg.classList.remove('slide-down-anim');
        }

        const logo = document.getElementById('gameLogo'); 
        const note = document.getElementById('gameNote'); 
        if(logo) logo.style.display = 'none'; 
        if(note) note.style.display = 'none';

        const introVideo = document.getElementById('introVideo'); 
        if(introVideo) { 
            introVideo.currentTime = 0; 
            introVideo.play().catch((e)=>{ console.log("Video Play Error (Ignored):", e); }); 
        }
        
        const ov = document.getElementById('overlay');
        if(ov) {
            ov.style.display = 'flex'; 
            ov.classList.add('game-over-mode');
        }
        
        const fPanel = document.getElementById('finalScorePanel');
        if(fPanel) fPanel.style.display = 'block'; 
        
        const fScore = document.getElementById('finalScoreVal');
        if(fScore) fScore.innerText = toBanglaNum(score) + " ৳";
        
        let myBest = score;
        if(currentPlayerData && currentPlayerData.highest) {
            myBest = currentPlayerData.highest > score ? currentPlayerData.highest : score;
        }
        const pBest = document.getElementById('personalBestVal');
        if(pBest) pBest.innerText = toBanglaNum(myBest) + " ৳";
        
        let kingName = "লোড হচ্ছে...";
        let kingScore = 0;
        
        if (globalTopRank && globalTopRank.name) {
            kingName = globalTopRank.name;
            kingScore = globalTopRank.score;
        }
        
        let kingText = `${kingName} (${toBanglaNum(kingScore)})`; 
        const gKing = document.getElementById('globalKingVal');
        if(gKing) gKing.innerText = kingText;
        
        const tMsg = document.getElementById('titleMsg');
        if(tMsg) {
            tMsg.innerText = ""; 
            tMsg.style.color = "#FF7043"; 
            tMsg.style.display = 'block';
        }

        const nameDisp = document.getElementById('showPlayerName');
        if(nameDisp) nameDisp.style.display = 'none';

        const playBtn = document.getElementById('mainPlayBtn');
        if(playBtn) playBtn.innerText = "PLAY AGAIN"; 
        
        const wMsg = document.getElementById('welcomeUserMsg'); 
        if(wMsg) wMsg.style.display = 'none'; 
        
        const hBtn = document.getElementById('homeBtn');
        if (hBtn) hBtn.style.display = 'block'; 

    } catch (err) {
        console.error("Menu Error Caught:", err);
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('finalScorePanel').style.display = 'block';
    }
}
function winGame() { gameRunning = false; bgMusic.pause(); document.getElementById('overlay').style.display = 'flex'; document.getElementById('titleMsg').innerText = "অভিনন্দন!"; document.getElementById('titleMsg').style.color = "#00E676"; }
function resetGame() { 
    if(animationId) cancelAnimationFrame(animationId); 
    
    fatSound.pause(); fatSound.currentTime = 0; 
    pubgSound.pause(); pubgSound.currentTime = 0; 
    
    // --- START BG MUSIC HERE ---
    bgMusic.currentTime = 0;
    bgMusic.play().catch(()=>{});
    // ---------------------------

    isPubgPlaying = false; score = 0; gameSpeed = 4; frame = 0; items = []; obstacles = []; burgersEaten = 0; stateTimer = 0; pubgTimer = 0; currentState = STATE_MED_START; player.width = player.medWidth; player.y = 0; isDead = false; deathTimer = 0; gameRunning = true; 
    
    extraLives = 0; 
    isInvincible = false;
    document.getElementById('lifeCount').innerText = "০";

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
        window.location.href = "admin.html";
        muteClickCount = 0;
    }
}
function goToHome() { window.location.reload(); }

