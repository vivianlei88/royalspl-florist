// ============================================
// RoyalSpl Florist - 通用功能
// 導航抽屜、購物車、語言切換
// ============================================

// 購物車數據存儲
let cart = JSON.parse(localStorage.getItem('royalspl_cart')) || [];

// 保存購物車到 localStorage
function saveCart() {
    localStorage.setItem('royalspl_cart', JSON.stringify(cart));
    updateCartBadge();
}

// 更新購物車徽章數量
function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// 添加商品到購物車
function addToCart(productId, quantity = 1, addons = []) {
    const product = getProductById(productId);
    if (!product) return;
    
    const existingItem = cart.find(item => 
        item.productId === productId && 
        JSON.stringify(item.addons) === JSON.stringify(addons)
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            name: product.name_zh,
            nameEn: product.name_en,
            price: product.price,
            emoji: product.emoji,
            quantity: quantity,
            addons: addons
        });
    }
    
    saveCart();
    showToast(`✓ ${product.name_zh} 已加入購物車`);
}

// 從購物車移除商品
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

// 更新購物車商品數量
function updateCartQuantity(index, quantity) {
    if (quantity <= 0) {
        removeFromCart(index);
        return;
    }
    cart[index].quantity = quantity;
    saveCart();
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

// 計算購物車總價
function calculateCartTotal() {
    return cart.reduce((sum, item) => {
        const addonsTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
        return sum + (item.price + addonsTotal) * item.quantity;
    }, 0);
}

// Toast 提示
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 導航抽屜
function toggleNavDrawer() {
    const drawer = document.getElementById('navDrawer');
    if (drawer) {
        drawer.classList.toggle('open');
    }
}

function closeNavDrawer() {
    const drawer = document.getElementById('navDrawer');
    if (drawer) {
        drawer.classList.remove('open');
    }
}

// 導航子選單展開
function toggleNavSection(element) {
    const submenu = element.nextElementSibling;
    const plus = element.querySelector('.nav-plus');
    
    if (submenu) {
        submenu.classList.toggle('open');
        if (plus) {
            plus.textContent = submenu.classList.contains('open') ? '−' : '+';
        }
    }
}

// 語言切換
let currentLang = 'zh'; // 'zh' 或 'en'

function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    
    document.querySelectorAll('[data-zh]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });
    
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.textContent = currentLang === 'zh' ? 'EN' : '中';
    }
    
    localStorage.setItem('royalspl_lang', currentLang);
}

// 初始化語言
function initLanguage() {
    const savedLang = localStorage.getItem('royalspl_lang');
    if (savedLang) {
        currentLang = savedLang;
    }
}

// 獲取URL參數
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 格式化價格
function formatPrice(price) {
    return `HK$${price.toLocaleString()}`;
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化購物車徽章
    updateCartBadge();
    
    // 初始化語言
    initLanguage();
    
    // 綁定選單按鈕
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleNavDrawer);
    }
    
    // 綁定關閉按鈕
    const navCloseBtn = document.getElementById('navCloseBtn');
    if (navCloseBtn) {
        navCloseBtn.addEventListener('click', closeNavDrawer);
    }
    
    // 點擊抽屜外部關閉
    const navDrawer = document.getElementById('navDrawer');
    if (navDrawer) {
        navDrawer.addEventListener('click', function(e) {
            if (e.target === navDrawer) {
                closeNavDrawer();
            }
        });
    }
    
    // 綁定語言切換按鈕
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.addEventListener('click', toggleLanguage);
    }
});

// Toast 樣式注入
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #1A1A1A;
        color: #FAF8F5;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 9999;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        max-width: 300px;
    }
    
    .toast.show {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(toastStyle);