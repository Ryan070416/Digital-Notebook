// 1. 從網址列抓取傳遞過來的錯題 ID 與身分證號碼 UID
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('id');
const targetUid = urlParams.get('uid'); // 【新增】：抓取使用者的 UID

async function loadDetail() {
    // 雙重檢查：缺少任何一個都不行
    if (!targetId || !targetUid) {
        alert("找不到錯題資料或權限不足！請先從首頁登入並點擊進入。");
        return;
    }

    try {
        // 【關鍵修改】：網址帶上 UID 去向後端要專屬資料
        const response = await fetch(`/api/mistakes?uid=${targetUid}`);
        const text = await response.text();
        const mistakes = JSON.parse(text);

        const mistake = mistakes.find(m => m.id === targetId);

        if (!mistake) {
            alert("在您的資料庫中找不到這筆錯題！");
            return;
        }

        // 把資料填入輸入框
        document.getElementById('detail-id').value = mistake.id;
        document.getElementById('detail-title').value = mistake.title || '';
        document.getElementById('detail-analysis').value = mistake.analysis || '';
        document.getElementById('detail-tags').value = mistake.tags || '';
        document.getElementById('detail-oldImageUrl').value = mistake.imageUrl || '';

        // 圖片處理
        const imgPreview = document.getElementById('detail-image');
        if (mistake.imageUrl && mistake.imageUrl.trim() !== '') {
            imgPreview.src = mistake.imageUrl;
            imgPreview.style.display = 'inline-block';
        } else {
            imgPreview.style.display = 'none'; 
        }

    } catch (error) {
        console.error("讀取失敗:", error);
        alert("讀取資料失敗，請確認網路連線。");
    }
}

// 綁定「儲存修改」事件
document.getElementById('detailForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "儲存中...";
    submitBtn.disabled = true;

    const formData = new FormData(event.target);
    formData.append("uid", targetUid); // 【關鍵修改】：存檔時也要附上這筆資料的主人是誰

    try {
        const response = await fetch('/api/mistakes', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(await response.text());
        
        alert("修改成功！\n(提示：您可以關閉此分頁，並回到首頁重新整理以查看最新狀態)");
        loadDetail();

    } catch (error) {
        console.error("發生錯誤:", error);
        alert("修改失敗：\n" + error.message);
    } finally {
        submitBtn.innerText = "儲存修改";
        submitBtn.disabled = false;
    }
});

// 網頁一打開就立刻執行載入
window.onload = loadDetail;