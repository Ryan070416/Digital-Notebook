package com.notebook;

import com.google.cloud.firestore.*;
import com.google.cloud.storage.*;
import com.google.gson.Gson;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.util.*;


public class MistakeServlet extends HttpServlet {

    private Gson gson = new Gson();
    
    // 移除一開始就連線的動作，先宣告為 null
    private Firestore db = null;
    private Storage storage = null;
    private final String BUCKET_NAME = "digitalnotebookryan.appspot.com";

    // 建立一個安全獲取連線的方法
    private void initCloudServices() throws Exception {
        if (db == null) db = FirestoreOptions.getDefaultInstance().getService();
        if (storage == null) storage = StorageOptions.getDefaultInstance().getService();
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");

        // 使用 Throwable 捕捉包含伺服器崩潰在內的所有底層錯誤
        try {
            initCloudServices(); // 確保連線已建立

            // 【新增】：攔截沒有 uid 的非法請求
            String uid = request.getParameter("uid");
            if (uid == null || uid.trim().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write(gson.toJson("未授權，請先登入！"));
                return;
            }

            List<Map<String, Object>> mistakesList = new ArrayList<>();
            // 【關鍵修改】：加上 .whereEqualTo("uid", uid)，資料庫就只會撈出這個人的錯題！
            Iterable<QueryDocumentSnapshot> documents = db.collection("mistakes")
                    .whereEqualTo("uid", uid)
                    .get().get().getDocuments();
            // ... 後面的 for 迴圈保持原樣不動

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> safeData = new HashMap<>();
                safeData.put("id", document.getId());
                safeData.put("title", document.getString("title"));
                safeData.put("analysis", document.getString("analysis"));
                safeData.put("tags", document.getString("tags"));
                safeData.put("imageUrl", document.getString("imageUrl"));
                mistakesList.add(safeData);
            }

            response.getWriter().write(gson.toJson(mistakesList));

        } catch (Throwable t) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(gson.toJson("讀取失敗：" + t.getMessage()));
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");

        try {
            initCloudServices(); // 確保連線已建立
            // 【新增】：攔截沒有 uid 的非法請求
            String uid = request.getParameter("uid");
            if (uid == null || uid.trim().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write(gson.toJson("未授權，請先登入！"));
                return;
            }

            String id = request.getParameter("id");
            String imageUrl = request.getParameter("oldImageUrl");
            if (imageUrl == null) imageUrl = "";

            Part filePart = request.getPart("image");
            if (filePart != null && filePart.getSize() > 0) {
                String fileName = UUID.randomUUID().toString() + "_" + filePart.getSubmittedFileName();
                BlobInfo blobInfo = BlobInfo.newBuilder(BUCKET_NAME, fileName).build();
                storage.create(blobInfo, filePart.getInputStream());
                imageUrl = "https://storage.googleapis.com/" + BUCKET_NAME + "/" + fileName;
            }

            String title = request.getParameter("title");
            String analysis = request.getParameter("analysis");
            String tags = request.getParameter("tags");

            Map<String, Object> mistakeData = new HashMap<>();
            mistakeData.put("title", title);
            mistakeData.put("analysis", analysis);
            mistakeData.put("tags", tags);
            mistakeData.put("imageUrl", imageUrl);

            // 【關鍵修改】：把使用者的 uid 寫死在資料裡，證明這是他的財產
            mistakeData.put("uid", uid);

            if (id != null && !id.trim().isEmpty()) {
                // 【關鍵修改】：加上 .get() 強迫 Java 等待資料庫「更新」成功再往下走
                db.collection("mistakes").document(id).update(mistakeData).get();
                response.getWriter().write(gson.toJson("修改成功！"));
            } else {
                mistakeData.put("timestamp", FieldValue.serverTimestamp());
                // 【關鍵修改】：加上 .get() 強迫 Java 等待資料庫「新增」成功再往下走
                db.collection("mistakes").add(mistakeData).get();
                response.getWriter().write(gson.toJson("新增成功！圖片與資料已確實存入雲端！"));
            }

        } catch (Throwable t) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(gson.toJson("伺服器發生錯誤：" + t.getMessage()));
        }
    }
    // 【新增】：用來處理刪除請求的 doDelete 方法
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");

        try {
            initCloudServices(); // 確保連線已建立

            // 從網址中取得要刪除的錯題 ID
            String id = request.getParameter("id");

            if (id != null && !id.trim().isEmpty()) {
                // 告訴 Firestore 刪除這份文件，並加上 .get() 強迫等待執行完成
                db.collection("mistakes").document(id).delete().get();
                response.getWriter().write(gson.toJson("刪除成功！"));
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(gson.toJson("缺少要刪除的錯題 ID"));
            }

        } catch (Throwable t) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(gson.toJson("刪除發生錯誤：" + t.getMessage()));
        }
    }
}