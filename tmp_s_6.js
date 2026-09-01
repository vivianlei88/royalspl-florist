
    // ==================== 商品管理 ====================
    function renderProductsPage(c) {
        c.innerHTML = '<div id="productsListView"><div class="page-header"><h2 class="page-title">商品管理</h2><div class="btn-group"><button class="btn btn-secondary" onclick="exportCSV()">下載 CSV</button><button class="btn btn-secondary" onclick="document.getElementById(\'csvFileInput\').click()">上傳 CSV</button><input type="file" id="csvFileInput" accept=".csv" style="display:none;" onchange="importCSV(this.files[0])"><button class="btn btn-primary" onclick="showAddForm()">新增商品</button></div></div><input type="text" class="search-bar" id="productSearch" placeholder="搜索商品名稱..." oninput="filterProducts()"><div class="btn-group" style="margin-bottom:15px;"><button class="btn btn-secondary btn-small" onclick="bulkSetStock(\'現貨\')">批量設現貨</button><button class="btn btn-secondary btn-small" onclick="bulkSetStock(\'預訂\')">批量設預訂</button><button class="btn btn-secondary btn-small" onclick="bulkSetActive(true)">批量上架</button><button class="btn btn-secondary btn-small" onclick="bulkSetActive(false)">批量下架</button><button class="btn btn-danger btn-small" onclick="bulkDelete()">批量刪除</button></div><div id="productsTable"></div></div><div id="productFormView" style="display:none;"></div>';
        loadProducts();
    }
    function showAddForm() {
        document.getElementById('productsListView').style.display = 'none';
        var f = document.getElementById('productFormView');
        f.style.display = 'block';
        f.innerHTML = '<div class="page-header"><h2 class="page-title">新增商品</h2><button class="btn btn-secondary" onclick="showProductsList()">返回列表</button></div><div class="form-container"><input type="hidden" id="productId">';
        f.innerHTML += '<div class="form-group"><label class="form-label">商品圖片（拖拽上傳或黏貼網址）</label><div class="upload-area" id="uploadArea"><p>點擊或拖拽圖片到這裡上傳</p><input type="file" id="fileInput" multiple accept="image/*" style="display:none;"></div><div class="uploaded-imgs" id="uploadedImages"></div><div class="url-add-row"><input type="text" id="imageUrlInput" placeholder="黏貼圖片網址" style="flex:1;padding:10px;border:1px solid #1A1A1A;border-radius:5px;"><button class="btn btn-secondary" onclick="addImageByUrl()">添加圖片</button></div></div>';
        f.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">中文名稱</label><input class="form-input" id="nameZh"></div><div class="form-group"><label class="form-label">英文名稱</label><input class="form-input" id="nameEn"></div></div>';
        f.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">價格 (HKD)</label><input type="number" class="form-input" id="price" step="0.01"></div><div class="form-group"><label class="form-label">分類</label><input class="form-input" id="category"></div></div>';
        f.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">庫存狀態</label><select class="form-select" id="stock" onchange="toggleDeliveryDays()"><option value="現貨">現貨</option><option value="預訂">預訂</option></select></div><div class="form-group" id="deliveryDaysGroup"><label class="form-label">預計發貨天數</label><input type="number" class="form-input" id="deliveryDays" value="3" min="1"></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="description"></textarea></div>';
        f.innerHTML += '<div class="form-row-3"><div class="form-group"><label class="form-label">花材</label><input class="form-input" id="specsFlowers"></div><div class="form-group"><label class="form-label">產地</label><input class="form-input" id="specsOrigin"></div><div class="form-group"><label class="form-label">規格</label><input class="form-input" id="specsSize"></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">場景用途標籤</label><div class="tag-pills" id="tagOccasion"></div></div><div class="form-group"><label class="form-label">核心花材標籤</label><div class="tag-pills" id="tagFlower"></div></div><div class="form-group"><label class="form-label">設計風格標籤</label><div class="tag-pills" id="tagStyle"></div></div><div class="form-group"><label class="form-label">價格區間標籤</label><div class="tag-pills" id="tagPrice"></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">香氣筆記（逗號分隔）</label><input class="form-input" id="scentNotes"></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">風格光譜數值</label><div class="spectrum-wrap"><span>浪漫</span><input type="range" id="styleSpectrum" min="0" max="100" value="50" oninput="document.getElementById(\'styleVal\').textContent=this.value"><span>雅緻</span><span class="spectrum-val" id="styleVal">50</span></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">前台顯示</label><select class="form-select" id="isActive"><option value="true">上架</option><option value="false">下架</option></select></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">規格變體（Variants）</label><div id="variantsList"></div><button class="btn btn-secondary btn-small" onclick="addVariantRow()">添加規格</button></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">關聯加購配件</label><div class="addon-checkbox-list" id="addonsCheckboxList"></div></div>';
        f.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveProduct()">保存商品</button><button class="btn btn-secondary" onclick="showProductsList()">取消</button></div></div>';
        uploadedImages = []; variants = []; selectedAddons = []; selectedTags = [];
        toggleDeliveryDays(); initTagPills(); renderUploadedImages(); renderVariants(); renderAddonsCheckbox(); initUploadArea();
    }
    function showProductsList() { document.getElementById('productsListView').style.display = 'block'; document.getElementById('productFormView').style.display = 'none'; loadProducts(); }
    function showEditFormById(id) { for (var i = 0; i < allProducts.length; i++) { if (allProducts[i].id === id) { showEditForm(allProducts[i]); return; } } }
    function showEditForm(p) {
        document.getElementById('productsListView').style.display = 'none';
        var f = document.getElementById('productFormView');
        f.style.display = 'block';
        f.innerHTML = '<div class="page-header"><h2 class="page-title">編輯商品</h2><button class="btn btn-secondary" onclick="showProductsList()">返回列表</button></div><div class="form-container"><input type="hidden" id="productId" value="' + p.id + '">';
        f.innerHTML += '<div class="form-group"><label class="form-label">商品圖片</label><div class="upload-area" id="uploadArea"><p>點擊或拖拽圖片上傳</p><input type="file" id="fileInput" multiple accept="image/*" style="display:none;"></div><div class="uploaded-imgs" id="uploadedImages"></div><div class="url-add-row"><input type="text" id="imageUrlInput" placeholder="黏貼圖片網址" style="flex:1;padding:10px;border:1px solid #1A1A1A;border-radius:5px;"><button class="btn btn-secondary" onclick="addImageByUrl()">添加圖片</button></div></div>';
        f.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">中文名稱</label><input class="form-input" id="nameZh" value="' + (p.name_zh || '') + '"></div><div class="form-group"><label class="form-label">英文名稱</label><input class="form-input" id="nameEn" value="' + (p.name_en || '') + '"></div></div>';
        f.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">價格 (HKD)</label><input type="number" class="form-input" id="price" value="' + (p.price || '') + '" step="0.01"></div><div class="form-group"><label class="form-label">分類</label><input class="form-input" id="category" value="' + (p.category || '') + '"></div></div>';
        f.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">庫存狀態</label><select class="form-select" id="stock" onchange="toggleDeliveryDays()"><option value="現貨"' + (p.stock === '現貨' ? ' selected' : '') + '>現貨</option><option value="預訂"' + (p.stock === '預訂' ? ' selected' : '') + '>預訂</option></select></div><div class="form-group" id="deliveryDaysGroup"><label class="form-label">預計發貨天數</label><input type="number" class="form-input" id="deliveryDays" value="' + (p.delivery_days || 3) + '" min="1"></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="description">' + (p.description || '') + '</textarea></div>';
        f.innerHTML += '<div class="form-row-3"><div class="form-group"><label class="form-label">花材</label><input class="form-input" id="specsFlowers" value="' + (p.specs_flowers || '') + '"></div><div class="form-group"><label class="form-label">產地</label><input class="form-input" id="specsOrigin" value="' + (p.specs_origin || '') + '"></div><div class="form-group"><label class="form-label">規格</label><input class="form-input" id="specsSize" value="' + (p.specs_size || '') + '"></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">場景用途標籤</label><div class="tag-pills" id="tagOccasion"></div></div><div class="form-group"><label class="form-label">核心花材標籤</label><div class="tag-pills" id="tagFlower"></div></div><div class="form-group"><label class="form-label">設計風格標籤</label><div class="tag-pills" id="tagStyle"></div></div><div class="form-group"><label class="form-label">價格區間標籤</label><div class="tag-pills" id="tagPrice"></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">香氣筆記</label><input class="form-input" id="scentNotes" value="' + ((p.scent_notes || []).join(',')) + '"></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">風格光譜數值</label><div class="spectrum-wrap"><span>浪漫</span><input type="range" id="styleSpectrum" min="0" max="100" value="' + (p.style_spectrum || 50) + '" oninput="document.getElementById(\'styleVal\').textContent=this.value"><span>雅緻</span><span class="spectrum-val" id="styleVal">' + (p.style_spectrum || 50) + '</span></div></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">前台顯示</label><select class="form-select" id="isActive"><option value="true"' + (p.is_active !== false ? ' selected' : '') + '>上架</option><option value="false"' + (p.is_active === false ? ' selected' : '') + '>下架</option></select></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">規格變體（Variants）</label><div id="variantsList"></div><button class="btn btn-secondary btn-small" onclick="addVariantRow()">添加規格</button></div>';
        f.innerHTML += '<div class="form-group"><label class="form-label">關聯加購配件</label><div class="addon-checkbox-list" id="addonsCheckboxList"></div></div>';
        f.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveProduct()">保存商品</button><button class="btn btn-secondary" onclick="showProductsList()">取消</button></div></div>';
        uploadedImages = p.images || (p.image_url ? [p.image_url] : []);
        selectedAddons = p.linked_addons || [];
        selectedTags = p.tags || [];
        toggleDeliveryDays(); initTagPills(); renderUploadedImages(); renderAddonsCheckbox(); loadVariants(p.id); initUploadArea();
    }
    function initUploadArea() { var ua = document.getElementById('uploadArea'); var fi = document.getElementById('fileInput'); if (ua && fi) { ua.onclick = function() { fi.click(); }; fi.onchange = function() { handleUploadFiles(this.files); }; ua.addEventListener('dragover', function(e) { e.preventDefault(); }); ua.addEventListener('drop', function(e) { e.preventDefault(); handleUploadFiles(e.dataTransfer.files); }); } }
    async function handleUploadFiles(files) { for (var i = 0; i < files.length; i++) { var fd = new FormData(); fd.append('file', files[i]); try { var res = await fetch('/r2-upload', { method: 'POST', body: fd }); var data = await res.json(); if (data.url) { uploadedImages.push(data.url); renderUploadedImages(); } } catch (err) {} } }
    function renderUploadedImages() { var c = document.getElementById('uploadedImages'); if (!c) return; var h = ''; for (var i = 0; i < uploadedImages.length; i++) { h += '<div class="uploaded-img-item"><img src="' + uploadedImages[i] + '"><button class="del-btn" onclick="removeImage(' + i + ')">×</button></div>'; } c.innerHTML = h; }
    function removeImage(i) { uploadedImages.splice(i, 1); renderUploadedImages(); }
    function addImageByUrl() { var url = document.getElementById('imageUrlInput').value.trim(); if (url) { uploadedImages.push(url); renderUploadedImages(); document.getElementById('imageUrlInput').value = ''; } }
    function addVariantRow() { variants.push({ name: '', price: '' }); renderVariants(); }
    function removeVariant(i) { variants.splice(i, 1); renderVariants(); }
    function renderVariants() { var c = document.getElementById('variantsList'); if (!c) return; var h = ''; for (var i = 0; i < variants.length; i++) { h += '<div class="variant-row"><input type="text" placeholder="規格名稱" value="' + variants[i].name + '" onchange="variants[' + i + '].name=this.value"><input type="number" placeholder="價格" value="' + variants[i].price + '" onchange="variants[' + i + '].price=this.value"><button class="btn btn-danger btn-small" onclick="removeVariant(' + i + ')">刪除</button></div>'; } c.innerHTML = h; }
    function renderAddonsCheckbox() { var c = document.getElementById('addonsCheckboxList'); if (!c) return; var h = ''; for (var i = 0; i < allAddons.length; i++) { var a = allAddons[i]; var checked = selectedAddons.indexOf(a.id) > -1 ? 'checked' : ''; h += '<label class="addon-checkbox-item"><input type="checkbox" value="' + a.id + '" ' + checked + ' onchange="toggleAddon(' + a.id + ')">' + (a.image_url ? '<img src="' + a.image_url + '">' : '') + a.name_zh + ' (HK$' + a.price + ')</label>'; } c.innerHTML = h || '<p>暫無配件</p>'; }
    function toggleAddon(id) { var idx = selectedAddons.indexOf(id); if (idx > -1) { selectedAddons.splice(idx, 1); } else { selectedAddons.push(id); } }
    function initTagPills() { for (var g in tagCategories) { var c = document.getElementById(g); if (!c) continue; var h = ''; for (var i = 0; i < tagCategories[g].length; i++) { h += '<button type="button" class="tag-pill' + (selectedTags.indexOf(tagCategories[g][i]) > -1 ? ' active' : '') + '" data-tag="' + tagCategories[g][i] + '" onclick="toggleTag(this)">' + tagCategories[g][i] + '</button>'; } c.innerHTML = h; } }
    function toggleTag(btn) { var tag = btn.getAttribute('data-tag'); var idx = selectedTags.indexOf(tag); if (idx > -1) { selectedTags.splice(idx, 1); btn.classList.remove('active'); } else { selectedTags.push(tag); btn.classList.add('active'); } }
    function toggleDeliveryDays() { var el = document.getElementById('deliveryDaysGroup'); if (el) el.style.display = document.getElementById('stock').value === '預訂' ? 'block' : 'none'; }
    async function loadVariants(productId) { variants = []; try { var r = await supabaseClient.from('product_variants').select('*').eq('product_id', productId); if (r.data) { for (var i = 0; i < r.data.length; i++) { variants.push({ name: r.data[i].variant_name, price: r.data[i].variant_price }); } } } catch (e) {} renderVariants(); }
    async function saveProduct() {
        var id = document.getElementById('productId').value;
        var data = {
            name_zh: document.getElementById('nameZh').value.trim(),
            name_en: document.getElementById('nameEn').value.trim(),
            price: parseFloat(document.getElementById('price').value),
            category: document.getElementById('category').value.trim(),
            description: document.getElementById('description').value.trim(),
            specs_flowers: document.getElementById('specsFlowers').value.trim(),
            specs_origin: document.getElementById('specsOrigin').value.trim(),
            specs_size: document.getElementById('specsSize').value.trim(),
            tags: selectedTags,
            scent_notes: document.getElementById('scentNotes').value.split(',').map(function(t){return t.trim();}).filter(Boolean),
            style_spectrum: parseInt(document.getElementById('styleSpectrum').value),
            stock: document.getElementById('stock').value,
            delivery_days: parseInt(document.getElementById('deliveryDays').value) || 1,
            is_active: document.getElementById('isActive').value === 'true',
            image_url: uploadedImages.length > 0 ? uploadedImages[0] : null,
            images: uploadedImages,
            linked_addons: selectedAddons
        };
        if (!data.name_zh || !data.price) { showToast('請填寫必要欄位'); return; }
        try {
            var result;
            if (id) { result = await supabaseClient.from('products').update(data).eq('id', id); }
            else { result = await supabaseClient.from('products').insert(data); }
            if (result.error) throw result.error;
            var productId = id;
            if (!productId && result.data && result.data.length > 0) { productId = result.data[0].id; }
            if (productId) {
                await supabaseClient.from('product_variants').delete().eq('product_id', productId);
                for (var i = 0; i < variants.length; i++) { if (variants[i].name && variants[i].price) { await supabaseClient.from('product_variants').insert({ product_id: productId, variant_name: variants[i].name, variant_price: parseFloat(variants[i].price) }); } }
            }
            showToast('保存成功'); showProductsList();
        } catch (err) { showToast('保存失敗：' + err.message); }
    }
    async function loadProducts() { var c = document.getElementById('productsTable'); if (!c) return; try { var r = await supabaseClient.from('products').select('*').order('id', { ascending: true }); allProducts = r.data || []; renderProductsTable(allProducts); } catch (e) { c.innerHTML = '載入失敗'; } }
    function filterProducts() { var kw = document.getElementById('productSearch').value.toLowerCase(); renderProductsTable(allProducts.filter(function(p) { return (p.name_zh || '').toLowerCase().indexOf(kw) > -1 || (p.name_en || '').toLowerCase().indexOf(kw) > -1; })); }
    function renderProductsTable(list) {
        var c = document.getElementById('productsTable');
        if (!c) return;
        var h = '<table class="data-table"><thead><tr><th class="checkbox-col"><input type="checkbox" id="checkAll" onchange="toggleCheckAll()"></th><th>圖片</th><th>SKU</th><th>名稱</th><th>價格</th><th>分類</th><th>庫存</th><th>顯示</th><th>操作</th></tr></thead><tbody>';
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var img = p.image_url ? '<img class="product-img-lg" src="' + p.image_url + '">' : '無圖';
            var sku = p.sku || ('RS-' + String(p.id).padStart(3, '0'));
            var eye = p.is_active !== false ? '顯示' : '隱藏';
            h += '<tr><td class="checkbox-col"><input type="checkbox" class="row-check" value="' + p.id + '"></td><td>' + img + '</td><td>' + sku + '</td><td><b>' + p.name_zh + '</b><br><small>' + p.name_en + '</small></td><td>HK$' + p.price + '</td><td>' + (p.category || '-') + '</td><td>' + p.stock + '</td><td><span style="cursor:pointer;" onclick="toggleActive(' + p.id + ',' + (p.is_active !== false) + ')">' + eye + '</span></td><td><button class="btn btn-secondary btn-small" onclick="showEditFormById(' + p.id + ')">編輯</button> <button class="btn btn-danger btn-small" onclick="deleteProduct(' + p.id + ')">刪除</button></td></tr>';
        }
        h += '</tbody></table>';
        c.innerHTML = h;
    }
    function toggleCheckAll() { var c = document.getElementById('checkAll'); document.querySelectorAll('.row-check').forEach(function(cb) { cb.checked = c.checked; }); }
    function getCheckedIds() { var ids = []; document.querySelectorAll('.row-check:checked').forEach(function(cb) { ids.push(parseInt(cb.value)); }); return ids; }
    async function bulkSetStock(s) { var ids = getCheckedIds(); if (!ids.length) { showToast('請先勾選'); return; } await supabaseClient.from('products').update({ stock: s }).in('id', ids); showToast('完成'); loadProducts(); }
    async function bulkSetActive(a) { var ids = getCheckedIds(); if (!ids.length) { showToast('請先勾選'); return; } await supabaseClient.from('products').update({ is_active: a }).in('id', ids); showToast('完成'); loadProducts(); }
    async function bulkDelete() { var ids = getCheckedIds(); if (!ids.length) { showToast('請先勾選'); return; } if (!confirm('刪除 ' + ids.length + ' 個？')) return; await supabaseClient.from('products').delete().in('id', ids); showToast('完成'); loadProducts(); }
    async function deleteProduct(id) { if (!confirm('刪除？')) return; await supabaseClient.from('products').delete().eq('id', id); showToast('已刪除'); loadProducts(); }
    async function toggleActive(id, current) { await supabaseClient.from('products').update({ is_active: !current }).eq('id', id); loadProducts(); }
    function exportCSV() { if (!allProducts.length) { showToast('無商品'); return; } var rows = ['id,name_zh,name_en,price,category,description,tags,stock,delivery_days,is_active,image_url']; for (var i = 0; i < allProducts.length; i++) { var p = allProducts[i]; rows.push([p.id, p.name_zh, p.name_en, p.price, p.category || '', p.description || '', (p.tags || []).join('|'), p.stock, p.delivery_days || 1, p.is_active !== false, p.image_url || ''].join(',')); } var blob = new Blob([rows.join('\n')], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'products.csv'; a.click(); }
    function parseCSVLine(line) {
        var result = [];
        var current = '';
        var inQuotes = false;
        for (var i = 0; i < line.length; i++) {
            var c = line[i];
            if (c === '"') {
                if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (c === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += c;
            }
        }
        result.push(current);
        return result;
    }
    function importCSV(file) {
        var reader = new FileReader();
        reader.onload = async function(e) {
            var text = e.target.result;
            var lines = text.split(/\r?\n/);
            var header = parseCSVLine(lines[0]).map(function(h){ return h.trim().replace(/^\uFEFF/, ''); });
            var imported = 0;
            for (var i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                var v = parseCSVLine(lines[i]);
                var d = {};
                for (var j = 0; j < header.length; j++) {
                    d[header[j]] = v[j] ? v[j].trim() : '';
                }
                var nameZh = d['中文名稱'] || d.name_zh || '';
                var price = d['售價HKD'] || d.price || '';
                if (!nameZh || !price) continue;
                var images = d['圖片URLs(|分隔)'] || d.images || d.image_url || '';
                var imageArr = images ? images.split('|').filter(Boolean) : [];
                var pd = {
                    sku: d['SKU'] || d.sku || '',
                    name_zh: nameZh,
                    name_en: d['英文名稱'] || d.name_en || '',
                    price: parseFloat(price),
                    sale_price: d['特價HKD'] ? parseFloat(d['特價HKD']) : null,
                    category: d.category || '',
                    description: d['中文描述'] || d.description || '',
                    tags: d['標籤(|分隔)'] || d.tags ? (d['標籤(|分隔)'] || d.tags).split('|').filter(Boolean) : [],
                    scent_notes: d['香調備註(|分隔)'] || d.scent_notes ? (d['香調備註(|分隔)'] || d.scent_notes).split('|').filter(Boolean) : [],
                    style_spectrum: parseInt(d['香調分數'] || d.style_spectrum) || 0,
                    stock: d['庫存'] || d.stock || '現貨',
                    is_preorder: d['是否預購'] === 'Y',
                    delivery_days: parseInt(d['預購天數'] || d.delivery_days) || 1,
                    is_active: (d['狀態'] || d.is_active) !== 'false' && (d['狀態'] || d.is_active) !== 'inactive',
                    image_url: imageArr.length > 0 ? imageArr[0] : null,
                    images: imageArr,
                    variants: d['規格變體JSON'] ? JSON.parse(d['規格變體JSON']) : [],
                    seo_title: d['SEO標題'] || '',
                    seo_description: d['SEO描述'] || ''
                };
                if (d.id) {
                    await supabaseClient.from('products').update(pd).eq('id', d.id);
                } else {
                    await supabaseClient.from('products').insert(pd);
                }
                imported++;
            }
            showToast('CSV 匯入完成，共 ' + imported + ' 個商品');
            loadProducts();
        };
        reader.readAsText(file, 'UTF-8');
    }

    // ==================== 加購配件 ====================
    function renderAddonsPage(c) { c.innerHTML = '<div class="page-header"><h2 class="page-title">加購配件</h2><button class="btn btn-primary" onclick="showAddonForm()">新增配件</button></div><div id="addonsTable"></div><div id="addonFormContainer" style="display:none;margin-top:20px;"></div>'; loadAddons(); }
    function showAddonForm() {
        var c = document.getElementById('addonFormContainer');
        c.style.display = 'block';
        c.innerHTML = '<div class="form-container"><h2>新增配件</h2><input type="hidden" id="addonId">';
        c.innerHTML += '<div class="form-group"><label class="form-label">配件圖片</label><div class="upload-area" id="addonUploadArea"><p>點擊上傳圖片</p><input type="file" id="addonFileInput" accept="image/*" style="display:none;"></div><div id="addonImagePreview"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">中文名稱</label><input class="form-input" id="addonNameZh"></div><div class="form-group"><label class="form-label">英文名稱</label><input class="form-input" id="addonNameEn"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">價格 (HKD)</label><input type="number" class="form-input" id="addonPrice" step="0.01"></div><div class="form-group"><label class="form-label">庫存數量</label><input type="number" class="form-input" id="addonStock" min="0"></div></div>';
        c.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveAddon()">保存配件</button><button class="btn btn-secondary" onclick="hideAddonForm()">取消</button></div></div>';
        addonUploadedImage = ''; initAddonUpload();
    }
    function hideAddonForm() { document.getElementById('addonFormContainer').style.display = 'none'; }
    function showEditAddonFormById(id) {
        for (var i = 0; i < allAddons.length; i++) {
            if (allAddons[i].id === id) {
                var a = allAddons[i];
                var c = document.getElementById('addonFormContainer');
                c.style.display = 'block';
                c.innerHTML = '<div class="form-container"><h2>編輯配件</h2><input type="hidden" id="addonId" value="' + a.id + '">';
                c.innerHTML += '<div class="form-group"><label class="form-label">配件圖片</label><div class="upload-area" id="addonUploadArea"><p>點擊上傳圖片</p><input type="file" id="addonFileInput" accept="image/*" style="display:none;"></div><div id="addonImagePreview">' + (a.image_url ? '<img src="' + a.image_url + '" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">' : '') + '</div></div>';
                c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">中文名稱</label><input class="form-input" id="addonNameZh" value="' + (a.name_zh || '') + '"></div><div class="form-group"><label class="form-label">英文名稱</label><input class="form-input" id="addonNameEn" value="' + (a.name_en || '') + '"></div></div>';
                c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">價格</label><input type="number" class="form-input" id="addonPrice" value="' + (a.price || '') + '"></div><div class="form-group"><label class="form-label">庫存</label><input type="number" class="form-input" id="addonStock" value="' + (a.stock || 0) + '"></div></div>';
                c.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveAddon()">保存</button><button class="btn btn-secondary" onclick="hideAddonForm()">取消</button></div></div>';
                addonUploadedImage = a.image_url || ''; initAddonUpload(); return;
            }
        }
    }
    function initAddonUpload() { var ua = document.getElementById('addonUploadArea'); var fi = document.getElementById('addonFileInput'); if (ua && fi) { ua.onclick = function() { fi.click(); }; fi.onchange = function() { handleAddonFileUpload(this.files[0]); }; } }
    async function handleAddonFileUpload(file) { if (!file) return; var fd = new FormData(); fd.append('file', file); try { var res = await fetch('/r2-upload', { method: 'POST', body: fd }); var data = await res.json(); if (data.url) { addonUploadedImage = data.url; document.getElementById('addonImagePreview').innerHTML = '<img src="' + data.url + '" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">'; } } catch (e) {} }
    async function saveAddon() { var id = document.getElementById('addonId').value; var data = { name_zh: document.getElementById('addonNameZh').value.trim(), name_en: document.getElementById('addonNameEn').value.trim(), price: parseFloat(document.getElementById('addonPrice').value), stock: parseInt(document.getElementById('addonStock').value) || 0, image_url: addonUploadedImage || null }; if (!data.name_zh || !data.price) { showToast('請填寫'); return; } try { if (id) { await supabaseClient.from('addons').update(data).eq('id', id); } else { await supabaseClient.from('addons').insert(data); } showToast('保存成功'); hideAddonForm(); loadAddons(); } catch (e) { showToast('失敗'); } }
    async function loadAddons() { var c = document.getElementById('addonsTable'); if (!c) return; try { var r = await supabaseClient.from('addons').select('*').order('id', { ascending: true }); allAddons = r.data || []; if (!allAddons.length) { c.innerHTML = '<div class="empty-state">暫無配件</div>'; return; } var h = '<table class="data-table"><thead><tr><th>圖片</th><th>名稱</th><th>價格</th><th>庫存</th><th>操作</th></tr></thead><tbody>'; for (var i = 0; i < allAddons.length; i++) { var a = allAddons[i]; h += '<tr><td>' + (a.image_url ? '<img class="product-img-lg" src="' + a.image_url + '">' : '無圖') + '</td><td><b>' + a.name_zh + '</b>' + (a.name_en ? '<br><small>' + a.name_en + '</small>' : '') + '</td><td>HK$' + a.price + '</td><td>' + a.stock + '</td><td><button class="btn btn-secondary btn-small" onclick="showEditAddonFormById(' + a.id + ')">編輯</button> <button class="btn btn-danger btn-small" onclick="deleteAddon(' + a.id + ')">刪除</button></td></tr>'; } h += '</tbody></table>'; c.innerHTML = h; } catch (e) { c.innerHTML = '請先創建 addons 表'; } }
    async function deleteAddon(id) { if (!confirm('刪除？')) return; await supabaseClient.from('addons').delete().eq('id', id); showToast('已刪除'); loadAddons(); }

    // ==================== 商品分類 ====================
    function renderCategoriesPage(c) {
        c.innerHTML = '<div id="categoryListView"><div class="page-header"><h2 class="page-title">商品分類</h2><button class="btn btn-primary" onclick="showCategoryForm()">新增分類</button></div><div class="btn-group" style="margin-bottom:15px;"><button class="btn btn-secondary btn-small" onclick="bulkCategoryDelete()">批量刪除</button><button class="btn btn-secondary btn-small" onclick="bulkCategoryActive(true)">批量上架</button><button class="btn btn-secondary btn-small" onclick="bulkCategoryActive(false)">批量下架</button></div><div id="categoryFormContainer" style="display:none;margin-bottom:20px;"></div><div class="category-grid" id="categoriesGrid"></div></div><div id="categoryDetailView" style="display:none;"></div>';
        loadCategories();
    }
    function showCategoryForm() {
        var c = document.getElementById('categoryFormContainer');
        c.style.display = 'block';
        c.innerHTML = '<div class="form-container"><h2>新增分類</h2><input type="hidden" id="categoryId">';
        c.innerHTML += '<div class="form-group"><label class="form-label">分類圖片</label><div class="upload-area" id="categoryUploadArea"><p>點擊上傳圖片</p><input type="file" id="categoryFileInput" accept="image/*" style="display:none;"></div><div id="categoryImagePreview"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">中文名稱</label><input class="form-input" id="categoryNameZh"></div><div class="form-group"><label class="form-label">英文名稱</label><input class="form-input" id="categoryNameEn"></div></div>';
        c.innerHTML += '<div class="form-group"><label class="form-label">文案簡介</label><textarea class="form-textarea" id="categoryDescription"></textarea></div>';
        c.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveCategory()">保存分類</button><button class="btn btn-secondary" onclick="hideCategoryForm()">取消</button></div></div>';
        categoryUploadedImage = ''; initCategoryUpload();
    }
    function hideCategoryForm() { document.getElementById('categoryFormContainer').style.display = 'none'; }
    function initCategoryUpload() { var ua = document.getElementById('categoryUploadArea'); var fi = document.getElementById('categoryFileInput'); if (ua && fi) { ua.onclick = function() { fi.click(); }; fi.onchange = function() { handleCategoryFileUpload(this.files[0]); }; } }
    async function handleCategoryFileUpload(file) { if (!file) return; var fd = new FormData(); fd.append('file', file); try { var res = await fetch('/r2-upload', { method: 'POST', body: fd }); var data = await res.json(); if (data.url) { categoryUploadedImage = data.url; document.getElementById('categoryImagePreview').innerHTML = '<img src="' + data.url + '" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">'; } } catch (e) {} }
    async function saveCategory() { var id = document.getElementById('categoryId').value; var data = { name_zh: document.getElementById('categoryNameZh').value.trim(), name_en: document.getElementById('categoryNameEn').value.trim(), description: document.getElementById('categoryDescription').value.trim(), image_url: categoryUploadedImage || null, is_active: true }; if (!data.name_zh) { showToast('請填寫分類名稱'); return; } try { if (id) { await supabaseClient.from('categories').update(data).eq('id', id); } else { await supabaseClient.from('categories').insert(data); } showToast('保存成功'); hideCategoryForm(); loadCategories(); } catch (e) { showToast('保存失敗'); } }
    async function getCategoryProductCount(categoryId) { try { var r = await supabaseClient.from('products').select('id', { count: 'exact', head: true }).eq('category_id', categoryId); return r.count || 0; } catch (e) { return 0; } }
    async function loadCategories() {
        var c = document.getElementById('categoriesGrid');
        if (!c) return;
        try {
            var r = await supabaseClient.from('categories').select('*').order('id', { ascending: true });
            allCategories = r.data || [];
            if (!allCategories.length) { c.innerHTML = '<div class="empty-state">暫無分類</div>'; return; }
            var h = '';
            for (var i = 0; i < allCategories.length; i++) {
                var cat = allCategories[i];
                var count = await getCategoryProductCount(cat.id);
                h += '<div class="category-card" data-id="' + cat.id + '" onclick="openCategoryDetail(' + cat.id + ')">';
                h += '<input type="checkbox" class="category-card-check" onclick="event.stopPropagation()" value="' + cat.id + '">';
                h += cat.image_url ? '<img class="category-card-img" src="' + cat.image_url + '">' : '<div style="height:180px;background:#F3EFEA;display:flex;align-items:center;justify-content:center;">無圖</div>';
                h += '<div class="category-card-body"><p class="category-card-name">' + cat.name_zh + '</p><p style="font-size:13px;color:#383431;">' + (cat.name_en || '') + '</p><p style="font-size:13px;margin-top:5px;">' + count + ' 個商品</p></div></div>';
            }
            c.innerHTML = h;
        } catch (e) { c.innerHTML = '請先創建 categories 表'; }
    }
    function showCategoryList() { document.getElementById('categoryListView').style.display = 'block'; document.getElementById('categoryDetailView').style.display = 'none'; loadCategories(); }
    async function openCategoryDetail(categoryId) {
        var category = null;
        for (var i = 0; i < allCategories.length; i++) { if (allCategories[i].id === categoryId) { category = allCategories[i]; break; } }
        if (!category) return;
        document.getElementById('categoryListView').style.display = 'none';
        var dv = document.getElementById('categoryDetailView');
        dv.style.display = 'block';
        dv.innerHTML = '<div class="page-header"><button class="btn btn-secondary" onclick="showCategoryList()">返回列表</button><h2 class="page-title">' + category.name_zh + '</h2><button class="btn btn-primary" onclick="saveCategoryDetail()">保存所有更改</button></div>';
        dv.innerHTML += '<div class="form-container" style="max-width:100%;margin-bottom:20px;"><input type="hidden" id="categoryDetailId" value="' + category.id + '">';
        dv.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">分類圖片</label><div class="upload-area" id="categoryDetailUploadArea"><p>點擊更換圖片</p><input type="file" id="categoryDetailFileInput" accept="image/*" style="display:none;"></div><div id="categoryDetailImagePreview">' + (category.image_url ? '<img src="' + category.image_url + '" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">' : '') + '</div></div>';
        dv.innerHTML += '<div><div class="form-group"><label class="form-label">中文名稱</label><input class="form-input" id="categoryDetailNameZh" value="' + (category.name_zh || '') + '"></div><div class="form-group"><label class="form-label">英文名稱</label><input class="form-input" id="categoryDetailNameEn" value="' + (category.name_en || '') + '"></div></div></div>';
        dv.innerHTML += '<div class="form-group"><label class="form-label">文案簡介</label><textarea class="form-textarea" id="categoryDetailDescription">' + (category.description || '') + '</textarea></div></div>';
        dv.innerHTML += '<div class="page-header"><h3 style="font-size:20px;font-weight:600;">分類內商品</h3><button class="btn btn-primary" onclick="openProductSelectForCategory()">添加商品</button></div><div class="category-products-grid" id="categoryProductsGrid"></div><p style="font-size:14px;color:#888;margin-top:10px;">拖拽商品卡片調整順序，完成後點擊保存</p>';
        categoryDetailUploadedImage = category.image_url || '';
        initCategoryDetailUpload();
        await loadCategoryProducts(categoryId);
    }
    function initCategoryDetailUpload() { var ua = document.getElementById('categoryDetailUploadArea'); var fi = document.getElementById('categoryDetailFileInput'); if (ua && fi) { ua.onclick = function() { fi.click(); }; fi.onchange = function() { handleCategoryDetailFileUpload(this.files[0]); }; } }
    async function handleCategoryDetailFileUpload(file) { if (!file) return; var fd = new FormData(); fd.append('file', file); try { var res = await fetch('/r2-upload', { method: 'POST', body: fd }); var data = await res.json(); if (data.url) { categoryDetailUploadedImage = data.url; document.getElementById('categoryDetailImagePreview').innerHTML = '<img src="' + data.url + '" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">'; } } catch (e) {} }
    async function loadCategoryProducts(categoryId) { try { var r = await supabaseClient.from('products').select('*').eq('category_id', categoryId).order('sort_order_in_category', { ascending: true }); if (r.error) { categoryDetailProducts = []; } else { categoryDetailProducts = r.data || []; } } catch (e) { categoryDetailProducts = []; } renderCategoryProductsList(); }
    function renderCategoryProductsList() {
        var c = document.getElementById('categoryProductsGrid');
        if (!c) return;
        if (!categoryDetailProducts.length) { c.innerHTML = '<div class="empty-state">暫無商品</div>'; return; }
        var h = '';
        for (var i = 0; i < categoryDetailProducts.length; i++) {
            var p = categoryDetailProducts[i];
            h += '<div class="category-product-card" draggable="true" data-index="' + i + '" ondragstart="productDragStart(event)" ondragover="productDragOver(event)" ondrop="productDrop(event)" ondragend="productDragEnd(event)">';
            h += p.image_url ? '<img src="' + p.image_url + '">' : '<div style="height:140px;background:#F3EFEA;display:flex;align-items:center;justify-content:center;">無圖</div>';
            h += '<div class="category-product-card-body"><p style="font-size:15px;font-weight:600;">' + p.name_zh + '</p><p style="font-size:14px;color:#383431;">HK$' + p.price + '</p><button class="category-product-card-remove" onclick="removeProductFromCategory(' + p.id + ')">移除</button></div></div>';
        }
        c.innerHTML = h;
    }
    var draggedProductIndex = null;
    function productDragStart(e) { draggedProductIndex = parseInt(e.target.getAttribute('data-index')); }
    function productDragOver(e) { e.preventDefault(); }
    function productDragEnd(e) {}
    function productDrop(e) { e.preventDefault(); var targetIndex = parseInt(e.target.getAttribute('data-index')); if (draggedProductIndex === null || targetIndex === null || draggedProductIndex === targetIndex) return; var temp = categoryDetailProducts[draggedProductIndex]; categoryDetailProducts.splice(draggedProductIndex, 1); categoryDetailProducts.splice(targetIndex, 0, temp); renderCategoryProductsList(); }
    function removeProductFromCategory(productId) { if (!confirm('從分類中移除？')) return; categoryDetailProducts = categoryDetailProducts.filter(function(p) { return p.id !== productId; }); renderCategoryProductsList(); showToast('已移除，請點擊保存'); }
    async function saveCategoryDetail() {
        var categoryId = parseInt(document.getElementById('categoryDetailId').value);
        var categoryData = { name_zh: document.getElementById('categoryDetailNameZh').value.trim(), name_en: document.getElementById('categoryDetailNameEn').value.trim(), description: document.getElementById('categoryDetailDescription').value.trim(), image_url: categoryDetailUploadedImage || null };
        await supabaseClient.from('categories').update(categoryData).eq('id', categoryId);
        var existing = await supabaseClient.from('products').select('id').eq('category_id', categoryId);
        if (existing.data) { for (var i = 0; i < existing.data.length; i++) { await supabaseClient.from('products').update({ category_id: null }).eq('id', existing.data[i].id); } }
        for (var j = 0; j < categoryDetailProducts.length; j++) { await supabaseClient.from('products').update({ category_id: categoryId, sort_order_in_category: j + 1 }).eq('id', categoryDetailProducts[j].id); }
        showToast('所有更改已保存'); showCategoryList();
    }
    async function openProductSelectForCategory() {
        var categoryId = parseInt(document.getElementById('categoryDetailId').value);
        document.getElementById('modalCategoryId').value = 'category_' + categoryId;
        var c = document.getElementById('modalProductList');
        var currentIds = [];
        for (var i = 0; i < categoryDetailProducts.length; i++) { currentIds.push(categoryDetailProducts[i].id); }
        selectedCategoryProducts = currentIds.slice();
        var h = '';
        for (var j = 0; j < allProducts.length; j++) {
            var p = allProducts[j];
            var checked = selectedCategoryProducts.indexOf(p.id) > -1 ? 'checked' : '';
            h += '<label class="modal-product-item"><input type="checkbox" value="' + p.id + '" ' + checked + ' onchange="toggleCategoryProduct(' + p.id + ')">' + (p.image_url ? '<img src="' + p.image_url + '">' : '<span>無圖</span>') + p.name_zh + ' (HK$' + p.price + ')</label>';
        }
        c.innerHTML = h;
        document.getElementById('productSelectModal').classList.add('show');
    }
    function toggleCategoryProduct(id) { var idx = selectedCategoryProducts.indexOf(id); if (idx > -1) { selectedCategoryProducts.splice(idx, 1); } else { selectedCategoryProducts.push(id); } }
    function closeProductModal() { document.getElementById('productSelectModal').classList.remove('show'); }
    async function saveCategoryProducts() { categoryDetailProducts = []; for (var i = 0; i < selectedCategoryProducts.length; i++) { var pid = selectedCategoryProducts[i]; for (var j = 0; j < allProducts.length; j++) { if (allProducts[j].id === pid) { categoryDetailProducts.push(allProducts[j]); break; } } } renderCategoryProductsList(); showToast('商品已添加，請點擊保存'); closeProductModal(); }
    function getCheckedCategoryIds() { var ids = []; document.querySelectorAll('.category-card-check:checked').forEach(function(cb) { ids.push(parseInt(cb.value)); }); return ids; }
    async function bulkCategoryDelete() { var ids = getCheckedCategoryIds(); if (!ids.length) { showToast('請先勾選'); return; } await supabaseClient.from('categories').delete().in('id', ids); showToast('完成'); loadCategories(); }
    async function bulkCategoryActive(active) { var ids = getCheckedCategoryIds(); if (!ids.length) { showToast('請先勾選'); return; } await supabaseClient.from('categories').update({ is_active: active }).in('id', ids); showToast('完成'); loadCategories(); }
    