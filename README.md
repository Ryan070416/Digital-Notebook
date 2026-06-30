# 📝 Digital Notebook (數位錯題本)

A secure, cloud-based full-stack web application designed for students to track, manage, and review their academic mistakes. Built with Java, Google Cloud Platform (GCP), and Firebase, this application provides a personalized sandbox for every user to seamlessly store images, academic notes, and complex mathematical formulas.

---

## ✨ Key Features

*  **Private User Sandboxes:** Integrated with **Firebase Authentication (Google Sign-In)**. Every user gets a 100% private and isolated database environment based on their unique UID.
*  **Advanced Math Support:** Native support for LaTeX syntax (via **MathJax**). Users can easily type fractions, integrals, and Greek letters in their notes, which are beautifully rendered on the cards.
*  **Smart Search Engine:** A built-in frontend search algorithm that ranks results based on relevance (Title > Tags > Note occurrences) with zero latency.
*  **Cloud-Native Storage:** Images are securely uploaded and hosted on **Google Cloud Storage**, while text data is structured in **Google Cloud Firestore**.

---

##  Usage Guide

### 1. Authentication
* Click the **"Sign in with Google"** button in the top right corner.
* Unauthenticated users cannot view or upload any data. Your data is strictly bound to your account.

### 2. Adding a New Record
* **Upload Image:** Select a screenshot or photo of your exam/homework mistake.
* **Title/Topic:** Enter the main topic (e.g., "Calculus - Taylor Series").
* **Notes:** Type your explanations. You can use standard LaTeX syntax (e.g., `$\frac{1}{2}$` or `$$\sum_{i=1}^{n}$$`) for math formulas.
* **Tags:** Add comma-separated tags (e.g., "Midterm, Calculus") for easy filtering.

### 3. Searching
* Type any keyword into the search bar. The system will instantly filter your mistake wall, prioritizing cards where the keyword appears in the title, followed by tags and notes.

### 4. Editing and Deleting
* **Edit:** Click on any mistake card to open a detailed, full-page view in a new tab. You can update the image or modify the notes here.
* **Delete:** Click the red "Delete" (刪除) button on the bottom right of a card to permanently remove the record from the cloud.

---

## 🏗️ Project Architecture

The application follows a classic 3-tier architecture:

1.  **Frontend (Client-Side):** * Built with **HTML5, Vanilla JavaScript (ES6 Modules), and Bootstrap 5**.
    * Handles UI rendering, Firebase Auth state listening, search algorithms, and MathJax typesetting.
2.  **Backend (Server-Side):** * Powered by **Java (Jakarta Servlet API)**.
    * Acts as the central gatekeeper. Deployed on **Google App Engine**.
3.  **Database & Storage (Cloud Services):** * **Google Cloud Firestore:** A NoSQL document database storing text metadata and image URLs.
    * **Google Cloud Storage:** Stores the physical image files securely.

---

##  Core Code Logic & Data Flow

### 1. Secure Data Flow (UID Binding)
When a user logs in, Firebase generates a unique `UID`. 
* **Write (POST):** The frontend appends the `UID` to the `FormData`. The Java Servlet (`MistakeServlet.java`) intercepts the request, uploads the image to Cloud Storage, and saves the text data along with the `UID` to Firestore.
* **Read (GET):** The frontend fetches data by sending a request like `/api/mistakes?uid=...`. The Java backend uses `.whereEqualTo("uid", uid)` to ensure users only receive their own records.

### 2. File Uploading
Images are parsed using `HttpServletRequest.getPart()`. If an image is present, the backend generates a unique file name using `UUID` to prevent overwriting, stores it in the GCP Bucket, and saves the generated public URL to Firestore.

### 3. Front-End Rendering
The `app.js` file fetches the JSON array from the backend, dynamically constructs HTML strings for Bootstrap cards, and injects them into the DOM. Afterward, it manually triggers `MathJax.typesetPromise()` to ensure all newly generated LaTeX strings are successfully converted into visual mathematical formatting.
