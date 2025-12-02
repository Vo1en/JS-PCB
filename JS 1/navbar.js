document.addEventListener("DOMContentLoaded", function() {
    // 1. 定義導覽列 HTML 結構
    const navbarHTML = `
        <nav class="navbar">
            <a href="index.html" class="brand-logo">
                <span class="text-logo">駿鑫實業</span>
            </a>
            <div class="hamburger" id="hamburger-btn">
                ☰
            </div>
            <div class="nav-links" id="nav-links">
                <a href="index.html" class="nav-item">首頁</a>
                <a href="spec-generator.html" class="nav-item">規格產生器</a>
                <a href="inspection-report.html" class="nav-item">出貨檢驗報告</a>
                <a href="test-report.html" class="nav-item">電性測試報告</a>
            </div>
        </nav>
    `;

    // 2. 注入 HTML 到容器
    const container = document.getElementById("navbar-container");
    if (container) {
        container.innerHTML = navbarHTML;
    }

    // 3. 綁定手機版漢堡選單事件
    const hamburger = document.getElementById("hamburger-btn");
    const navLinks = document.getElementById("nav-links");

    if (hamburger && navLinks) {
        hamburger.addEventListener("click", function() {
            navLinks.classList.toggle("active");
            // 切換圖示 (選用)
            if (navLinks.classList.contains("active")) {
                hamburger.textContent = "✕"; // 變成叉叉
            } else {
                hamburger.textContent = "☰"; // 變回漢堡
            }
        });

        // 點擊連結後自動收合選單 (優化手機體驗)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.textContent = "☰";
            });
        });
    }

    // 4. 自動標示當前頁面 (Current Active State)
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const links = document.querySelectorAll(".nav-item");
    
    links.forEach(link => {
        const href = link.getAttribute("href");
        // 簡單比對檔名
        if (href === currentPage) {
            link.classList.add("current");
        }
    });
});