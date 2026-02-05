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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const ADMIN_PASS = "nahiAdmin"; 
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
    const currentTime = Date.now();

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-row';
        
        let statusHtml = '<span style="color: gray; font-size: 12px;">Offline</span>';
        if (u.lastSeen && (currentTime - u.lastSeen < 120000)) {
             statusHtml = '<span style="color: #00E676; font-weight: bold; font-size: 12px;">● Online</span>';
        } else if (u.lastSeen) {
             const mins = Math.floor((currentTime - u.lastSeen) / 60000);
             statusHtml = `<span style="color: orange; font-size: 12px;">Last seen: ${mins}m ago</span>`;
        }

        div.innerHTML = `
            <div class="user-info">
                <h3>${u.name} ${statusHtml}</h3>
                <p>Total: ${u.total} | Highest: ${u.highest}</p>
            </div>
            <div class="actions">
                <button class="act-btn edit" style="background: #FF5722;" onclick="sendCustomAlert('${u.name}')">⚠️ Alert</button>
                <button class="act-btn edit" style="background: #9C27B0;" onclick="renameUser('${u.name}')">Name</button>
                <button class="act-btn edit" onclick="editUser('${u.name}', ${u.total}, ${u.highest})">Edit</button>
                <button class="act-btn del" onclick="deleteUser('${u.name}')">Del</button>
            </div>
        `;
        listDiv.appendChild(div);
    });
}

function sendCustomAlert(name) {
    const msg = prompt(`'${name}' কে কি ওয়ার্নিং/মেসেজ দিতে চান?`);
    if(msg && msg.trim() !== "") {
        db.ref('alerts/' + name).set({
            message: msg,
            type: 'warning', 
            timestamp: Date.now()
        }).then(() => {
            alert("মেসেজ পাঠানো হয়েছে!");
        });
    }
}

function renameUser(oldName) {
    let newName = prompt(`'${oldName}' এর নতুন নাম দিন (English 3-6 chars):`, oldName);
    
    if (newName && newName !== oldName) {
        if (newName.length < 3 || newName.length > 6) {
            alert("নাম অবশ্যই ৩-৬ অক্ষরের হতে হবে!"); return;
        }
        
        db.ref('users/' + newName).once('value', (snap) => {
            if (snap.exists()) {
                alert("এই নামটি ইতিমধ্যে ব্যবহার হচ্ছে!");
            } else {
                db.ref('users/' + oldName).once('value', (oldSnap) => {
                    let data = oldSnap.val();
                    data.name = newName; 
                    
                    db.ref('users/' + newName).set(data)
                    .then(() => {
                        return db.ref('alerts/' + oldName).set({
                            message: `আপনার নাম পরিবর্তন করে '${newName}' করা হয়েছে!`,
                            type: 'rename',
                            newName: newName,
                            timestamp: Date.now()
                        });
                    })
                    .then(() => {
                        return db.ref('users/' + oldName).remove();
                    })
                    .then(() => {
                        alert(`নাম পরিবর্তন সফল! (${oldName} -> ${newName})`);
                        recalculateKing();
                    });
                });
            }
        });
    }
}

function editUser(name, oldTotal, oldHighest) {
    let newTotal = prompt(`'${name}' এর নতুন Total Score দিন:`, oldTotal);
    if (newTotal !== null && newTotal.trim() !== "") {
        let newHighest = prompt(`'${name}' এর নতুন Highest Score দিন:`, oldHighest);
        if (newHighest !== null && newHighest.trim() !== "") {
            const t = parseInt(newTotal);
            const h = parseInt(newHighest);

            if (!isNaN(t) && !isNaN(h)) {
                db.ref('users/' + name).update({
                    total: t,
                    highest: h
                })
                .then(() => {
                    alert("আপডেট হয়েছে! ✅");
                    recalculateKing();
                })
                .catch((err) => alert("সমস্যা: " + err.message));
            } else {
                alert("সংখ্যা দিন!");
            }
        }
    }
}

function deleteUser(name) {
    const reason = prompt(`'${name}' কে ডিলিট করার কারণ:`, "Banned by Admin");
    if (reason !== null) {
        db.ref('kick_messages/' + name).set(reason)
        .then(() => {
            return db.ref('users/' + name).remove();
        })
        .then(() => {
            alert("ডিলিট করা হয়েছে! 🚀");
            recalculateKing();
        })
        .catch(err => alert("সমস্যা: " + err.message));
    }
}

function recalculateKing() {
    db.ref('users').once('value').then((snapshot) => {
        let maxScore = 0;
        let kingName = "কেউ না";

        if (snapshot.exists()) {
            const users = snapshot.val();
            Object.keys(users).forEach(key => {
                const u = users[key];
                if (u.highest > maxScore) {
                    maxScore = u.highest;
                    kingName = u.name;
                }
            });
        }
        
        db.ref('globalTopRank').set({
            name: kingName,
            score: maxScore
        });
    });
}

function filterUsers() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const filtered = allUsersData.filter(u => u.name.toLowerCase().includes(query));
    renderList(filtered);
}