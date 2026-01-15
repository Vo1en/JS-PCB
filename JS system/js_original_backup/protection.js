/**
 * 網頁保護腳本
 * 防止右鍵、複製、選取文字、F12 開發者工具
 */
(function () {
    // 禁用右鍵選單
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // 禁用常用快捷鍵 (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+P)
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I (開發者工具)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+J (控制台)
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+C (選取元素)
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U (檢視原始碼)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S (存檔 - 雖然無法完全禁止瀏覽器行為，但可攔截部分)
        if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+P (列印)
        if (e.ctrlKey && (e.key === 'P' || e.key === 'p')) {
            e.preventDefault();
            return false;
        }
    });

    // 禁用文字選取 (針對全域，但允許 input/textarea)
    // 這裡動態加入 CSS 樣式
    var style = document.createElement('style');
    style.innerHTML = `
        body {
            -webkit-user-select: none; /* Safari */
            -ms-user-select: none; /* IE 10 and IE 11 */
            user-select: none; /* Standard syntax */
        }
        /* 允許輸入框選取文字，否則無法輸入 */
        input, textarea {
            -webkit-user-select: auto !important;
            -ms-user-select: auto !important;
            user-select: auto !important;
        }
        /* 禁用圖片拖曳 */
        img {
            -webkit-user-drag: none;
            user-drag: none;
            pointer-events: none; /* 禁止點擊圖片，視情況開啟 */
        }
    `;
    document.head.appendChild(style);

    // 禁用圖片拖曳 (JS 備援)
    document.addEventListener('dragstart', function (e) {
        if (e.target.nodeName === 'IMG') {
            e.preventDefault();
        }
    });

})();
