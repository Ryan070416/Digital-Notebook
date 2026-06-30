import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// 1. 貼上你的 Firebase 專屬金鑰
const firebaseConfig = {
  apiKey: "AIzaSyDHg9piIYHoucQ8uocHfeq0frj5rt5SV-k",
  authDomain: "digitalnotebookryan.firebaseapp.com",
  projectId: "digitalnotebookryan",
  storageBucket: "digitalnotebookryan.firebasestorage.app",
  messagingSenderId: "45294859332",
  appId: "1:45294859332:web:f067d3c03609847656b811"
};

// 2. 初始化 Firebase 與 Google 登入模組
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let globalMistakes = [];
let currentUserUid = null; // 用來記憶當前使用者的身分證號碼

// UI 介面綁定
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const formCard = document.getElementById('mistakeForm').closest('.card'); // 抓取表單外層的卡片
const mistakeWall = document.getElementById('mistakeWall');

// --- 登入與登出事件 ---
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => alert("登入失敗：" + error.message));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => alert("已成功登出！"));
});

// --- 監聽「登入狀態」的變化 ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 【已登入】：記錄 UID，顯示頭像、表單，並載入私人錯題
        currentUserUid = user.uid;
        loginBtn.style.display = 'none';
        userInfo.innerText = `👤 ${user.displayName}`;
        userInfo.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
        if (formCard) formCard.style.display = 'block'; 
        
        loadMistakes(); 
    } else {
        // 【未登入】：清空畫面，隱藏表單，顯示登入提示
        currentUserUid = null;
        loginBtn.style.display = 'inline-block';
        userInfo.style.display = 'none';
        logoutBtn.style.display = 'none';
        if (formCard) formCard.style.display = 'none'; 
        
        mistakeWall.innerHTML = '<div class="col-12"><div class="alert alert-warning fs-5 text-center shadow-sm">🔒 請先點擊右上角「Google 登入」，以建立並查看您的私人錯題本。</div></div>';
    }
});

// --- 表單上傳功能 ---
document.getElementById('mistakeForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    if (!currentUserUid) return alert("請先登入！"); // 安全防護

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "上傳中...";
    submitBtn.disabled = true;

    const formData = new FormData(event.target);
    formData.append("uid", currentUserUid); // 【關鍵】：把 UID 塞進去，告訴後端這是誰的資料

    try {
        const response = await fetch('/api/mistakes', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(await response.text());

        alert(await response.json()); 
        event.target.reset(); 
        loadMistakes();

    } catch (error) {
        console.error("發生錯誤:", error);
        alert("上傳失敗：\n" + error.message);
    } finally {
        submitBtn.innerText = "上傳至雲端";
        submitBtn.disabled = false;
    }
});

// --- 讀取錯題牆 ---
// --- 1. 共用函數：負責把資料畫成卡片 ---
function renderMistakes(dataArray) {
    mistakeWall.innerHTML = ''; // 清空牆面

    if (dataArray.length === 0) {
        mistakeWall.innerHTML = '<div class="col-12"><div class="alert alert-info shadow-sm">找不到符合條件的錯題喔！請嘗試其他關鍵字或新增一筆吧！</div></div>';
        return;
    }

    dataArray.forEach(mistake => {
        const imgHtml = mistake.imageUrl ? `<img src="${mistake.imageUrl}" class="card-img-top" alt="錯題圖片" style="max-height: 200px; object-fit: cover;">` : '';
        
        const cardHtml = `
            <div class="col-md-6 mb-4">
                <div class="card shadow-sm h-100 d-flex flex-column" style="cursor: pointer; transition: 0.3s;" onmouseover="this.classList.add('shadow')" onmouseout="this.classList.remove('shadow')" onclick="window.open('detail.html?id=${mistake.id}&uid=${currentUserUid}', '_blank')">
                    ${imgHtml}
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${mistake.title}</h5>
                        <p class="card-text text-truncate"><strong>AI 解析：</strong><br>${mistake.analysis}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <small class="text-muted">標籤：${mistake.tags}</small>
                            <span class="text-danger fw-bold px-2 py-1" style="cursor: pointer;" onclick="deleteMistake('${mistake.id}', event)">刪除</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        mistakeWall.innerHTML += cardHtml; 
    });
    if (window.MathJax) {
        MathJax.typesetPromise().catch((err) => console.log('MathJax 渲染失敗: ', err));
    }
}

// --- 2. 讀取錯題牆 (修改版) ---
async function loadMistakes() {
    if (!currentUserUid) return; 

    mistakeWall.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"></div><p>載入中...</p></div>';

    try {
        const response = await fetch(`/api/mistakes?uid=${currentUserUid}`);
        const responseText = await response.text();

        if (!response.ok) throw new Error(`伺服器錯誤 (${response.status}): ${responseText}`);
        
        // 抓下最新資料存入全域變數
        globalMistakes = JSON.parse(responseText);
        
        // 呼叫共用函數來渲染所有錯題
        renderMistakes(globalMistakes);

    } catch (error) {
        console.error("載入錯誤:", error);
        mistakeWall.innerHTML = `<div class="col-12"><div class="alert alert-danger">${error.message}</div></div>`;
    }
}

// --- 3. 搜尋功能：計算相關性分數並排序 ---
const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener('keypress', function(event) {
        // 當使用者按下 Enter 鍵 (代碼 13)
        if (event.key === 'Enter') {
            event.preventDefault(); // 防止表單意外送出
            
            // 取得輸入的關鍵字，去掉頭尾空白並轉成小寫以利比對
            const keyword = this.value.trim().toLowerCase();

            // 如果沒輸入東西就按 Enter，就顯示全部錯題
            if (!keyword) {
                renderMistakes(globalMistakes);
                return;
            }

            // 【核心演算法】：幫每一筆錯題打分數
            const scoredMistakes = globalMistakes.map(mistake => {
                let score = 0;
                // 為了防止空值報錯，如果沒資料就用空字串代替
                const title = (mistake.title || '').toLowerCase();
                const analysis = (mistake.analysis || '').toLowerCase();
                const tags = (mistake.tags || '').toLowerCase();

                // 規則 A：標題完全一樣 (+10 分)
                if (title === keyword) score += 10;
                // 規則 B：標題包含關鍵字 (+5 分)
                else if (title.includes(keyword)) score += 5;

                // 規則 C：標籤命中 (+5 分)
                if (tags.includes(keyword)) score += 5;

                // 規則 D：筆記內文命中 (出現 1 次 +2 分，越常提到分數越高)
                if (analysis.includes(keyword)) {
                    const occurrences = analysis.split(keyword).length - 1;
                    score += (occurrences * 2);
                }

                return { mistake, score };
            }).filter(item => item.score > 0); // 直接過濾掉 0 分 (完全沒命中) 的題目

            // 將結果依照分數「由高到低」排序
            scoredMistakes.sort((a, b) => b.score - a.score);

            // 抽出排序好的錯題資料，丟給函數重新畫出畫面
            const sortedResults = scoredMistakes.map(item => item.mistake);
            renderMistakes(sortedResults);
        }
    });
}

// --- 刪除功能 ---
// 【關鍵魔法】：因為加入了 type="module"，外部 HTML 點擊會找不到函數，必須明確綁定到 window 上
window.deleteMistake = async function(id, event) {
    event.stopPropagation();
    if (!confirm("確定要刪除這筆錯題嗎？(此動作無法復原)")) return;

    try {
        const response = await fetch(`/api/mistakes?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await response.text());

        alert("刪除成功！");
        loadMistakes();
    } catch (error) {
        console.error("刪除錯誤:", error);
        alert("刪除失敗：\n" + error.message);
    }
};