document.addEventListener("DOMContentLoaded", function() {
    // 1. 定義導覽列的 HTML 結構
    // 注意：這裡的 href 連結請確認與您的檔案名稱完全一致
    const navbarHTML = `
    <nav class="navbar">
        <a href="index.html" class="brand-logo">
            <span class="text-logo">JS PCB</span>
        </a>
        <div class="nav-links">
            <a href="index.html" class="nav-item">首頁</a>
            <a href="PCB Order Info Generator.html" class="nav-item">PCB規格產生器</a>
            <a href="PCB Inspection Report.html" class="nav-item">出貨檢驗報告</a>
            <a href="PCB Test Report.html" class="nav-item">電性測試報告</a>
        </div>
    </nav>
    `;

    // 2. 將 HTML 插入到頁面中指定的容器
    const navbarContainer = document.getElementById("navbar-container");
    if (navbarContainer) {
        navbarContainer.innerHTML = navbarHTML;
    }

    // 3. 自動判斷當前頁面並加上 "current" 樣式
    // 取得當前網址的檔名 (處理過後的中文檔名可能會被編碼，所以使用 decodeURIComponent)
    const path = window.location.pathname;
    const page = path.split("/").pop(); 
    const currentPage = decodeURIComponent(page);

    const navLinks = document.querySelectorAll(".nav-item");

    navLinks.forEach(link => {
        const linkHref = link.getAttribute("href");
        
        // 判斷邏輯：
        // 1. 如果連結 href 等於當前頁面檔名
        // 2. 或是當前頁面是根目錄 (空字串) 且連結是 index.html
        if (linkHref === currentPage || (currentPage === "" && linkHref === "index.html")) {
            link.classList.add("current");
        }
    });
});