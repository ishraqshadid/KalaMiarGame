// ==========================================
// ** 1. FIREBASE CONFIGURATION **
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

// Firebase Initialize
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ==========================================
// ** 2. LOGIN LOGIC **
// ==========================================
const ADMIN_PASS = "nahiAdmin"; // আপনার পাসওয়ার্ড
let allUsersData = []; 

function checkLogin() {
    const input = document.getElementById('adminPass').value;
    if (input === ADMIN_PASS) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        loadAllUsers();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

// ==========================================
// ** 3. DASHBOARD LOGIC (Load Users) **
// ==========================================
function loadAllUsers() {
    const listDiv = document.getElementById('userList');
    listDiv.innerHTML = "<p style='text-align:center;'>ডাটা লোড হচ্ছে...</p>";

    db.ref('users').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            allUsersData = []; 
            
            Object.keys(data).forEach(key => {
                allUsersData.push({
                    name: key,
                    ...data[key]
                });
            });

            // মোট স্কোর অনুযায়ী সর্ট করা
            allUsersData.sort((a, b) => b.total - a.total);

            document.getElementById('totalUserCount').innerText = allUsersData.length.toLocaleString('bn-BD');
            renderList(allUsersData);
        } else {
            listDiv.innerHTML = "<p style='text-align:center;'>কোন ইউজার নেই!</p>";
            document.getElementById('totalUserCount').innerText = "০";
        }
    });
}

function renderList(users) {
    const listDiv = document.getElementById('userList');
    listDiv.innerHTML = "";

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-row';
        
        // এডিট বাটনে ডাটা পাস করা হচ্ছে
        div.innerHTML = `
            <div class="user-info">
                <h3>${u.name}</h3>
                <p>Total: ${u.total} | Highest: ${u.highest}</p>
            </div>
            <div class="actions">
                <button class="act-btn edit" onclick="editUser('${u.name}', ${u.total}, ${u.highest})">✏️</button>
                <button class="act-btn del" onclick="deleteUser('${u.name}')">🗑️</button>
            </div>
        `;
        listDiv.appendChild(div);
    });
}

// ==========================================
// ** 4. EDIT & DELETE ACTIONS **
// ==========================================

// --- ১. এডিট ইউজার ফাংশন ---
function editUser(name, oldTotal, oldHighest) {
    // প্রথমে Total চাইবে
    let newTotal = prompt(`'${name}' এর নতুন Total Score দিন:`, oldTotal);
    
    if (newTotal !== null && newTotal.trim() !== "") {
        // এরপর Highest চাইবে
        let newHighest = prompt(`'${name}' এর নতুন Highest Score দিন:`, oldHighest);
        
        if (newHighest !== null && newHighest.trim() !== "") {
            
            // সংখ্যায় কনভার্ট করা
            const t = parseInt(newTotal);
            const h = parseInt(newHighest);

            if (!isNaN(t) && !isNaN(h)) {
                // ডাটাবেস আপডেট
                db.ref('users/' + name).update({
                    total: t,
                    highest: h
                })
                .then(() => {
                    alert("আপডেট হয়েছে! ✅");
                    // স্কোর পাল্টালে কিং বদলাতে পারে, তাই চেক করা হচ্ছে
                    recalculateKing();
                })
                .catch((err) => {
                    alert("সমস্যা হয়েছে: " + err.message);
                });
            } else {
                alert("দয়া করে ইংরেজি সংখ্যা দিন (Ex: 500)");
            }
        }
    }
}

// --- ২. ডিলিট ইউজার ফাংশন ---
// admin.js এর deleteUser ফাংশন
function deleteUser(name) {
    // ১. প্রথমে কারণ জানতে চাইবে
    const reason = prompt(`'${name}' কে ডিলিট করার কারণ লিখুন:`, "অ্যাডমিন আপনাকে ব্যান/ডিলিট করেছে।");

    // যদি ক্যানসেল না করে (Reason দেয়)
    if (reason !== null) {
        // ২. ইউজারের জন্য মেসেজটি 'kick_messages' ফোল্ডারে সেভ করা হচ্ছে
        db.ref('kick_messages/' + name).set(reason)
        .then(() => {
            // ৩. মেসেজ সেভ হওয়ার পর ইউজার ডিলিট
            return db.ref('users/' + name).remove();
        })
        .then(() => {
            alert("ইউজার ডিলিট এবং মেসেজ পাঠানো হয়েছে! 🚀");
            recalculateKing(); // কিং আপডেট
        })
        .catch(err => alert("সমস্যা: " + err.message));
    }
}

// --- ৩. কিং রিক্যালকুলেশন (খুবই জরুরি) ---
function recalculateKing() {
    db.ref('users').once('value').then((snapshot) => {
        let maxScore = 0;
        let kingName = "কেউ না";

        if (snapshot.exists()) {
            const users = snapshot.val();
            Object.keys(users).forEach(key => {
                const u = users[key];
                // আমরা টোটাল এর উপর ভিত্তি করে কিং বানাচ্ছি (কিংবা আপনি চাইলে highest দিয়েও করতে পারেন)
                // আপনার গেম লজিক অনুযায়ী 'total' টাই আসল র‍্যাংক
                if (u.total > maxScore) {
                    maxScore = u.total;
                    kingName = u.name;
                }
            });
        }
        
        // গেমের 'globalTopRank' আপডেট করা
        db.ref('globalTopRank').set({
            name: kingName,
            score: maxScore
        });
    });
}

// ==========================================
// ** 5. HELPER FUNCTIONS **
// ==========================================
function filterUsers() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const filtered = allUsersData.filter(u => u.name.toLowerCase().includes(query));
    renderList(filtered);
}