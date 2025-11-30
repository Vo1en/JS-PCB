document.addEventListener("DOMContentLoaded", function() {
    // 1. 定義導覽列的 HTML 結構
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
            <a href="Order Info Generator.html" class="nav-item">規格產生器</a>
            <a href="Inspection Report.html" class="nav-item">出貨檢驗報告</a>
            <a href="Test Report.html" class="nav-item">電性測試報告</a>
        </div>
    </nav>
    `;

    // 2. 插入 HTML
    const navbarContainer = document.getElementById("navbar-container");
    if (navbarContainer) {
        navbarContainer.innerHTML = navbarHTML;
    }

    // 3. 自動高亮當前頁面
    const path = window.location.pathname;
    const page = path.split("/").pop(); 
    const currentPage = decodeURIComponent(page);
    const navLinks = document.querySelectorAll(".nav-item");

    navLinks.forEach(link => {
        const linkHref = link.getAttribute("href");
        if (linkHref === currentPage || (currentPage === "" && linkHref === "index.html")) {
            link.classList.add("current");
        }
    });

    // 4. 漢堡選單切換邏輯
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const navLinksContainer = document.getElementById("nav-links");

    if (hamburgerBtn && navLinksContainer) {
        hamburgerBtn.addEventListener("click", function() {
            navLinksContainer.classList.toggle("active");
            
            if (navLinksContainer.classList.contains("active")) {
                hamburgerBtn.innerHTML = "✕"; 
            } else {
                hamburgerBtn.innerHTML = "☰"; 
            }
        });
        
        // 點擊連結後自動收起
        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                navLinksContainer.classList.remove("active");
                hamburgerBtn.innerHTML = "☰";
            });
        });
    }
});