document.addEventListener("DOMContentLoaded", function() {

    // === [修正] 設定網頁標籤的小圖示 (Favicon) ===
    const faviconSVG = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50 0L20 60H40L30 100L80 40H60L70 0Z' fill='%23c2a878'/></svg>";

    // 檢查頁面是否已經有 icon，沒有的話建立一個
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    // 強制設定為金色閃電
    link.href = faviconSVG;


    // 1. 定義導覽列 HTML 結構
    // [新增] 在 nav-links 中加入 "客戶標籤" 指向 192.168.0.114:8000
    const navbarHTML = `
        <nav class="navbar">
            <a href="index.html" class="brand-logo">
                <span class="text-logo">JS PCB</span>
            </a>
            <div class="hamburger" id="hamburger-btn">
                ☰
            </div>
            <div class="nav-links" id="nav-links">
                <a href="index.html" class="nav-item">首頁</a>
                <a href="spec-generator.html" class="nav-item">規格產生器</a>
                <a href="inspection-report.html" class="nav-item">出貨檢驗報告</a>
                <a href="test-report.html" class="nav-item">電性測試報告</a>
                <a href="http://192.168.0.114:8000" class="nav-item">客戶標籤</a>
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
            
            if (navLinks.classList.contains("active")) {
                hamburger.textContent = "✕"; 
            } else {
                hamburger.textContent = "☰"; 
            }
        });

        // 點擊連結後自動收合選單
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
        if (href === currentPage) {
            link.classList.add("current");
        }
    });
});
