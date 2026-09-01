
    var SUPABASE_URL = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';
    var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    var ADMIN_USER = 'admin';
    var ADMIN_PASS = 'royalspl2024';
    var allProducts = [];
    var allAddons = [];
    var allCategories = [];
    var allOrders = [];
    var uploadedImages = [];
    var variants = [];
    var selectedAddons = [];
    var selectedTags = [];
    var addonUploadedImage = '';
    var categoryUploadedImage = '';
    var categoryDetailUploadedImage = '';
    var selectedCategoryProducts = [];
    var categoryDetailProducts = [];
    var selectedOrderProducts = [];
    var selectedFeaturedProducts = [];
    var currentOrderDetail = null;
    var selectedTemplateProduct = null;
    var tagCategories = {
        tagOccasion: ['情人節','母親節','中秋節','清明節','畢業季','端午','聖誕節','生日','週年','婚禮','彌月','探病','帛事','開張','喬遷','商務送禮','企業周年'],
        tagFlower: ['玫瑰','鬱金香','芍藥','荷花','百合','康乃馨','向日葵','滿天星','蘭花','牡丹','進口鮮花'],
        tagStyle: ['經典風','韓式','日式極簡','法式田園','永生花'],
        tagPrice: ['HK$300內','HK$300-600','HK$800+','HK$1200+']
    };
    var areaFees = { tier1: 90, tier2: 100, tier3: 150, tier4: 200, tier5: 300 };
    var areaKeywords = {
        tier5: ['愉景灣','馬灣','離島','機場','迪士尼','大嶼山','長洲','南丫島','坪洲','東涌','梅窩','昂坪','discovery bay','lantau','airport'],
        tier4: ['山頂','大潭','清水灣','香港科技大學','科大','石澳','the peak','tai tam','clear water bay','hkust'],
        tier3: ['西貢','半山','南區','淺水灣','赤柱','薄扶林','香港仔','鴨脷洲','sai kung','mid-levels','repulse bay','stanley','pokfulam','aberdeen'],
        tier2: ['屯門','掃管笏','深井','汀九','黃金海岸','小欖','青龍頭','tuen mun','sham tseng','gold coast'],
        tier1: ['旺角','尖沙咀','中環','銅鑼灣','灣仔','九龍塘','沙田','荃灣','觀塘','將軍澳','北角','太古','紅磡','深水埗','大埔','元朗','青衣','葵芳','油麻地','黃大仙','九龍灣','藍田','馬鞍山','mong kok','central','causeway bay','sha tin','tsuen wan','kwun tong']
    };
    function detectDeliveryArea(address) {
        if (!address) return 'tier1';
        var lower = address.toLowerCase();
        for (var tier in areaKeywords) {
            for (var i = 0; i < areaKeywords[tier].length; i++) {
                if (lower.indexOf(areaKeywords[tier][i].toLowerCase()) > -1) { return tier; }
            }
        }
        return 'tier1';
    }

    function doLogin() {
        if (document.getElementById('loginUser').value.trim() === ADMIN_USER && document.getElementById('loginPass').value === ADMIN_PASS) {
            localStorage.setItem('royalspl_admin', 'true');
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminPage').style.display = 'block';
            switchPage('analytics');
            checkVisitorNotifications();
        } else { document.getElementById('loginError').style.display = 'block'; }
    }
    function doLogout() { localStorage.removeItem('royalspl_admin'); location.reload(); }
    function switchPage(page) {
        document.querySelectorAll('.sidebar-item').forEach(function(el) { el.classList.remove('active'); });
        document.querySelector('[data-page="' + page + '"]').classList.add('active');
        var c = document.getElementById('mainContent');
        if (page === 'content') {
            if (window.mountContentEditor) {
                window.mountContentEditor(c);
            } else {
                c.innerHTML = '<div class="empty-state">區塊編輯器載入中...</div>';
            }
            return;
        }
        if (page === 'analytics') { renderAnalyticsPage(c); }
        else if (page === 'homepage') { renderHomepagePage(c); }
        else if (page === 'products') { renderProductsPage(c); }
        else if (page === 'categories') { renderCategoriesPage(c); }
        else if (page === 'addons') { renderAddonsPage(c); }
        else if (page === 'orders') { renderOrdersPage(c); }
        else if (page === 'template') { renderTemplatePage(c); }
    }
    function checkVisitorNotifications() {
        setInterval(async function() {
            try {
                var r = await supabaseClient.from('visitor_notifications').select('*').eq('is_read', false).order('id', { ascending: false }).limit(1);
                if (r.data && r.data.length > 0) {
                    var n = r.data[0];
                    showToast('訪客來臨：' + n.message);
                    await supabaseClient.from('visitor_notifications').update({ is_read: true }).eq('id', n.id);
                }
            } catch (e) {}
        }, 15000);
    }

    function renderAnalyticsPage(c) {
        c.innerHTML = '<div class="page-header"><h2 class="page-title">數據分析</h2><a class="btn btn-secondary" href="https://analytics.google.com/analytics/web/#/p8546886826/reports" target="_blank">在 GA4 中打開</a></div>';
        c.innerHTML += '<div class="stat-cards" id="statCards">';
        c.innerHTML += '<div class="stat-card"><div class="stat-card-value" id="localProducts">載入中...</div><div class="stat-card-label">商品數量</div></div>';
        c.innerHTML += '<div class="stat-card"><div class="stat-card-value" id="localOrders">載入中...</div><div class="stat-card-label">訂單數量</div></div>';
        c.innerHTML += '<div class="stat-card"><div class="stat-card-value" id="localSales">載入中...</div><div class="stat-card-label">銷售金額</div></div>';
        c.innerHTML += '<div class="stat-card"><div class="stat-card-value" id="localViews">載入中...</div><div class="stat-card-label">瀏覽量</div></div>';
        c.innerHTML += '</div>';
        c.innerHTML += '<iframe class="ga4-iframe" src="https://analytics.google.com/analytics/web/#/p8546886826/reports" loading="lazy"></iframe>';
        loadLocalStats();
    }
    async function loadLocalStats() {
        try {
            var productCount = await supabaseClient.from('products').select('id', { count: 'exact', head: true });
            var orderCount = await supabaseClient.from('orders').select('id', { count: 'exact', head: true });
            var salesResult = await supabaseClient.from('orders').select('total_amount');
            var viewCount = await supabaseClient.from('page_views').select('id', { count: 'exact', head: true });
            var totalSales = 0;
            if (salesResult.data) { for (var i = 0; i < salesResult.data.length; i++) { totalSales += parseFloat(salesResult.data[i].total_amount) || 0; } }
            document.getElementById('localProducts').textContent = productCount.count || 0;
            document.getElementById('localOrders').textContent = orderCount.count || 0;
            document.getElementById('localSales').textContent = 'HK$' + totalSales;
            document.getElementById('localViews').textContent = viewCount.count || 0;
        } catch (e) {}
    }

    function renderHomepagePage(c) {
        c.innerHTML = '<div class="page-header"><h2 class="page-title">首頁管理</h2><button class="btn btn-primary" onclick="saveHomepageSettings()">保存全部</button></div>';
        c.innerHTML += '<div class="form-container" style="max-width:100%;">';
        c.innerHTML += '<h3 style="font-size:18px;font-weight:600;margin-bottom:15px;">Hero Banner</h3>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">主標題</label><input class="form-input" id="heroTitle"></div><div class="form-group"><label class="form-label">副標題</label><input class="form-input" id="heroSubtitle"></div></div>';
        c.innerHTML += '<div class="form-group"><label class="form-label">背景圖片</label><div class="upload-area" id="heroUploadArea"><p>點擊上傳圖片</p><input type="file" id="heroFileInput" accept="image/*" style="display:none;"></div><div id="heroImagePreview"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">CTA 文字</label><input class="form-input" id="heroCtaText"></div><div class="form-group"><label class="form-label">CTA 連結</label><input class="form-input" id="heroCtaLink"></div></div>';
        c.innerHTML += '<hr style="margin:25px 0;border-top:1px solid #ddd;">';
        c.innerHTML += '<h3 style="font-size:18px;font-weight:600;margin-bottom:15px;">臻選系列（6卡片）</h3><div class="category-grid" id="collectionCardsGrid"></div>';
        c.innerHTML += '<hr style="margin:25px 0;border-top:1px solid #ddd;">';
        c.innerHTML += '<h3 style="font-size:18px;font-weight:600;margin-bottom:15px;">精選花藝</h3><button class="btn btn-secondary btn-small" onclick="openFeaturedProductSelect()">選擇商品</button><div class="category-products-grid" id="featuredProductsGrid" style="margin-top:15px;"></div>';
        c.innerHTML += '<hr style="margin:25px 0;border-top:1px solid #ddd;">';
        c.innerHTML += '<h3 style="font-size:18px;font-weight:600;margin-bottom:15px;">關於我們</h3><div class="form-group"><textarea class="form-textarea" id="aboutText" style="min-height:150px;"></textarea></div>';
        c.innerHTML += '</div>';
        loadHomepageData();
        loadCollectionCards();
        loadFeaturedProducts();
        initHeroUpload();
    }
    var heroUploadedImage = '';
    function initHeroUpload() { var ua = document.getElementById('heroUploadArea'); var fi = document.getElementById('heroFileInput'); if (ua && fi) { ua.onclick = function() { fi.click(); }; fi.onchange = function() { handleHeroFileUpload(this.files[0]); }; } }
    async function handleHeroFileUpload(file) { if (!file) return; var fd = new FormData(); fd.append('file', file); try { var res = await fetch('/r2-upload', { method: 'POST', body: fd }); var data = await res.json(); if (data.url) { heroUploadedImage = data.url; document.getElementById('heroImagePreview').innerHTML = '<img src="' + data.url + '" style="width:200px;height:100px;object-fit:cover;border-radius:8px;">'; } } catch (e) {} }
    async function loadHomepageData() {
        try {
            var r = await supabaseClient.from('homepage_settings').select('*').limit(1);
            if (r.data && r.data.length > 0) {
                var d = r.data[0];
                document.getElementById('heroTitle').value = d.hero_title || '';
                document.getElementById('heroSubtitle').value = d.hero_subtitle || '';
                document.getElementById('heroCtaText').value = d.hero_cta_text || '';
                document.getElementById('heroCtaLink').value = d.hero_cta_link || '';
                document.getElementById('aboutText').value = d.about_text || '';
                heroUploadedImage = d.hero_image || '';
                if (d.hero_image) { document.getElementById('heroImagePreview').innerHTML = '<img src="' + d.hero_image + '" style="width:200px;height:100px;object-fit:cover;border-radius:8px;">'; }
            }
        } catch (e) {}
    }
    async function saveHomepageSettings() {
        var data = {
            hero_title: document.getElementById('heroTitle').value.trim(),
            hero_subtitle: document.getElementById('heroSubtitle').value.trim(),
            hero_image: heroUploadedImage || null,
            hero_cta_text: document.getElementById('heroCtaText').value.trim(),
            hero_cta_link: document.getElementById('heroCtaLink').value.trim(),
            about_text: document.getElementById('aboutText').value.trim()
        };
        try {
            var r = await supabaseClient.from('homepage_settings').select('id').limit(1);
            if (r.data && r.data.length > 0) { await supabaseClient.from('homepage_settings').update(data).eq('id', r.data[0].id); }
            else { await supabaseClient.from('homepage_settings').insert(data); }
            showToast('首頁設置已保存');
        } catch (e) { showToast('保存失敗'); }
    }
    async function loadCollectionCards() {
        var c = document.getElementById('collectionCardsGrid');
        try {
            var r = await supabaseClient.from('collection_cards').select('*').order('sort_order', { ascending: true });
            var cards = r.data || [];
            if (!cards.length) {
                for (var i = 0; i < 6; i++) { await supabaseClient.from('collection_cards').insert({ title_zh: '卡片' + (i+1), title_en: 'Card ' + (i+1), sort_order: i+1 }); }
                var r2 = await supabaseClient.from('collection_cards').select('*').order('sort_order', { ascending: true });
                cards = r2.data || [];
            }
            var h = '';
            for (var j = 0; j < cards.length; j++) {
                var card = cards[j];
                h += '<div class="collection-card-edit">' + (card.image_url ? '<img src="' + card.image_url + '">' : '<div style="height:150px;background:#F3EFEA;border-radius:8px;display:flex;align-items:center;justify-content:center;">無圖</div>');
                h += '<div class="form-group" style="margin-top:10px;"><input class="form-input" placeholder="中文標題" value="' + (card.title_zh || '') + '" onchange="updateCollectionCard(' + card.id + ',\'title_zh\',this.value)"></div>';
                h += '<div class="form-group"><input class="form-input" placeholder="英文標題" value="' + (card.title_en || '') + '" onchange="updateCollectionCard(' + card.id + ',\'title_en\',this.value)"></div>';
                h += '<div class="form-group"><input class="form-input" placeholder="連結" value="' + (card.link_url || '') + '" onchange="updateCollectionCard(' + card.id + ',\'link_url\',this.value)"></div>';
                h += '<div class="url-add-row"><input type="text" id="cardImg' + card.id + '" placeholder="圖片網址" value="' + (card.image_url || '') + '"><button class="btn btn-small btn-secondary" onclick="updateCardImage(' + card.id + ')">更新圖片</button></div>';
                h += '</div>';
            }
            c.innerHTML = h;
        } catch (e) { c.innerHTML = '請先創建 collection_cards 表'; }
    }
    async function updateCollectionCard(id, field, value) { await supabaseClient.from('collection_cards').update({ [field]: value }).eq('id', id); }
    async function updateCardImage(id) { var url = document.getElementById('cardImg' + id).value.trim(); if (url) { await supabaseClient.from('collection_cards').update({ image_url: url }).eq('id', id); showToast('圖片已更新'); loadCollectionCards(); } }
    async function loadFeaturedProducts() {
        var c = document.getElementById('featuredProductsGrid');
        try {
            var r = await supabaseClient.from('featured_products').select('*').order('sort_order', { ascending: true });
            selectedFeaturedProducts = r.data || [];
            if (!selectedFeaturedProducts.length) { c.innerHTML = '<div class="empty-state">尚未選擇商品</div>'; return; }
            var h = '';
            for (var i = 0; i < selectedFeaturedProducts.length; i++) {
                var fp = selectedFeaturedProducts[i];
                var product = null;
                for (var j = 0; j < allProducts.length; j++) { if (allProducts[j].id === fp.product_id) { product = allProducts[j]; break; } }
                if (!product) continue;
                h += '<div class="category-product-card" draggable="true" data-index="' + i + '" ondragstart="featuredDragStart(event)" ondragover="featuredDragOver(event)" ondrop="featuredDrop(event)" ondragend="featuredDragEnd(event)">';
                h += product.image_url ? '<img src="' + product.image_url + '">' : '<div style="height:140px;background:#F3EFEA;"></div>';
                h += '<div class="category-product-card-body"><p style="font-size:15px;font-weight:600;">' + product.name_zh + '</p><p style="font-size:14px;color:#383431;">HK$' + product.price + '</p><button class="category-product-card-remove" onclick="removeFeaturedProduct(' + fp.id + ')">移除</button></div></div>';
            }
            c.innerHTML = h;
        } catch (e) { c.innerHTML = '請先創建 featured_products 表'; }
    }
    function openFeaturedProductSelect() {
        var c = document.getElementById('modalProductList');
        var currentIds = [];
        for (var i = 0; i < selectedFeaturedProducts.length; i++) { currentIds.push(selectedFeaturedProducts[i].product_id); }
        selectedFeaturedProducts = [];
        var h = '';
        for (var j = 0; j < allProducts.length; j++) {
            var p = allProducts[j];
            var checked = currentIds.indexOf(p.id) > -1 ? 'checked' : '';
            h += '<label class="modal-product-item"><input type="checkbox" value="' + p.id + '" ' + checked + ' onchange="toggleFeaturedProduct(' + p.id + ')">' + (p.image_url ? '<img src="' + p.image_url + '">' : '<span>無圖</span>') + p.name_zh + ' (HK$' + p.price + ')</label>';
        }
        c.innerHTML = h;
        document.getElementById('modalCategoryId').value = 'featured';
        document.getElementById('productSelectModal').classList.add('show');
    }
    function toggleFeaturedProduct(id) { var idx = selectedFeaturedProducts.indexOf(id); if (idx > -1) { selectedFeaturedProducts.splice(idx, 1); } else { selectedFeaturedProducts.push(id); } }
    function saveModalProducts() {
        var mode = document.getElementById('modalCategoryId').value;
        if (mode === 'featured') { saveFeaturedProducts(); }
        else { saveCategoryProducts(); }
    }
    async function saveFeaturedProducts() {
        await supabaseClient.from('featured_products').delete().neq('id', 0);
        for (var i = 0; i < selectedFeaturedProducts.length; i++) {
            await supabaseClient.from('featured_products').insert({ product_id: selectedFeaturedProducts[i], sort_order: i + 1 });
        }
        showToast('精選花藝已保存');
        closeProductModal();
        loadFeaturedProducts();
    }
    async function removeFeaturedProduct(id) { await supabaseClient.from('featured_products').delete().eq('id', id); loadFeaturedProducts(); }
    var draggedFeaturedIndex = null;
    function featuredDragStart(e) { draggedFeaturedIndex = parseInt(e.target.getAttribute('data-index')); }
    function featuredDragOver(e) { e.preventDefault(); }
    function featuredDragEnd(e) {}
    async function featuredDrop(e) {
        e.preventDefault();
        var targetIndex = parseInt(e.target.getAttribute('data-index'));
        if (draggedFeaturedIndex === null || targetIndex === null || draggedFeaturedIndex === targetIndex) return;
        var temp = selectedFeaturedProducts[draggedFeaturedIndex];
        selectedFeaturedProducts.splice(draggedFeaturedIndex, 1);
        selectedFeaturedProducts.splice(targetIndex, 0, temp);
        for (var i = 0; i < selectedFeaturedProducts.length; i++) { await supabaseClient.from('featured_products').update({ sort_order: i + 1 }).eq('id', selectedFeaturedProducts[i].id); }
        loadFeaturedProducts();
        showToast('排序已保存');
    }
    