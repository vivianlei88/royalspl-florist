
    // ==================== 訂單管理 ====================
    function renderOrdersPage(c) {
        c.innerHTML = '<div class="page-header"><h2 class="page-title">訂單管理</h2><div class="btn-group"><button class="btn btn-secondary" onclick="exportOrdersCSV()">導出 CSV</button><button class="btn btn-primary" onclick="showAddOrderForm()">新增訂單</button></div></div><div class="btn-group" style="margin-bottom:15px;"><select id="orderStatusFilter" onchange="filterOrdersByStatus()" style="padding:8px 12px;border:1px solid #1A1A1A;border-radius:5px;"><option value="all">全部狀態</option><option value="unpaid">未付款</option><option value="paid">已付款</option><option value="shipped">已出貨</option></select><button class="btn btn-danger btn-small" onclick="bulkDeleteOrders()">批量刪除</button></div><div id="ordersTable"></div><div id="addOrderFormContainer" style="display:none;"></div><div id="orderDetailView" style="display:none;"></div>';
        loadOrders();
    }
    async function loadOrders() {
        var c = document.getElementById('ordersTable');
        if (!c) return;
        try {
            var r = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
            allOrders = r.data || [];
            renderOrdersTable(allOrders);
        } catch (e) { c.innerHTML = '暫無訂單'; }
    }
    function renderOrdersTable(orders) {
        var c = document.getElementById('ordersTable');
        if (!orders.length) { c.innerHTML = '<div class="empty-state">暫無訂單</div>'; return; }
        var h = '<table class="data-table"><thead><tr><th class="checkbox-col"><input type="checkbox" id="checkAllOrders" onchange="toggleCheckAllOrders()"></th><th>訂單編號</th><th>成立日期</th><th>送貨日期</th><th>收花人</th><th>電話</th><th>總金額</th><th>狀態</th><th>操作</th></tr></thead><tbody>';
        for (var i = 0; i < orders.length; i++) {
            var o = orders[i];
            h += '<tr><td class="checkbox-col"><input type="checkbox" class="order-check" value="' + o.id + '"></td>';
            h += '<td>' + o.order_code + '</td><td>' + (o.created_at || '').slice(0,10) + '</td><td>' + (o.delivery_date || '-') + '</td><td>' + o.recipient_name + '</td><td>' + o.recipient_phone + '</td><td>HK$' + o.total_amount + '</td>';
            h += '<td><select onchange="updateOrderStatus(' + o.id + ', this.value)" style="padding:5px;border:1px solid #1A1A1A;border-radius:3px;"><option value="unpaid"' + (o.status === 'unpaid' ? ' selected' : '') + '>未付款</option><option value="paid"' + (o.status === 'paid' ? ' selected' : '') + '>已付款</option><option value="shipped"' + (o.status === 'shipped' ? ' selected' : '') + '>已出貨</option></select></td>';
            var actionBtns = '<button class="btn btn-secondary btn-small" onclick="openOrderDetail(' + o.id + ')">詳情</button> ';
            actionBtns += '<button class="btn btn-secondary btn-small" onclick="downloadOrderPDFById(' + o.id + ')">PDF</button> ';
            actionBtns += '<button class="btn btn-secondary btn-small" onclick="copyOrderDetail(' + o.id + ')">複製轉發</button> ';
            if (o.status === 'unpaid') { actionBtns += '<button class="btn btn-primary btn-small" onclick="createStripePayment(' + o.id + ')">收款</button> '; }
            if (o.status === 'paid' && o.stripe_payment_intent_id) { actionBtns += '<button class="btn btn-danger btn-small" onclick="showRefundForm(' + o.id + ')">退款</button> '; }
            h += '<td><div class="btn-group">' + actionBtns + '</div></td></tr>';
        }
        h += '</tbody></table>';
        c.innerHTML = h;
    }
    function filterOrdersByStatus() { var f = document.getElementById('orderStatusFilter').value; if (f === 'all') { renderOrdersTable(allOrders); } else { renderOrdersTable(allOrders.filter(function(o) { return o.status === f; })); } }
    function toggleCheckAllOrders() { var c = document.getElementById('checkAllOrders'); document.querySelectorAll('.order-check').forEach(function(cb) { cb.checked = c.checked; }); }
    function getCheckedOrderIds() { var ids = []; document.querySelectorAll('.order-check:checked').forEach(function(cb) { ids.push(parseInt(cb.value)); }); return ids; }
    async function bulkDeleteOrders() { var ids = getCheckedOrderIds(); if (!ids.length) { showToast('請先勾選'); return; } if (!confirm('刪除？')) return; await supabaseClient.from('orders').delete().in('id', ids); showToast('完成'); loadOrders(); }
    async function updateOrderStatus(id, status) {
        await supabaseClient.from('orders').update({ status: status }).eq('id', id);
        if (status === 'shipped') {
            var order = null;
            for (var i = 0; i < allOrders.length; i++) { if (allOrders[i].id === id) { order = allOrders[i]; break; } }
            if (order && order.customer_email) {
                var emailHtml = '<h1>出貨通知</h1><p>訂單編號：' + order.order_code + '</p><p>您的花禮已出貨！</p>';
                try { await fetch('/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: order.customer_email, subject: '出貨通知 - ' + order.order_code, html: emailHtml }) }); showToast('出貨通知已發送'); } catch (e) { showToast('狀態已更新'); }
            } else { showToast('狀態已更新'); }
        } else { showToast('狀態已更新'); }
    }
    function showAddOrderForm() {
        var c = document.getElementById('addOrderFormContainer');
        c.style.display = 'block';
        selectedOrderProducts = [];
        var h = '<div class="form-container"><h2>新增訂單</h2><div class="form-group"><label class="form-label">選擇商品</label><div class="addon-checkbox-list">';
        for (var i = 0; i < allProducts.length; i++) { h += '<label class="addon-checkbox-item"><input type="checkbox" value="' + allProducts[i].id + '" onchange="toggleOrderProduct(' + allProducts[i].id + ')">' + (allProducts[i].image_url ? '<img src="' + allProducts[i].image_url + '">' : '') + allProducts[i].name_zh + ' (HK$' + allProducts[i].price + ')</label>'; }
        h += '</div></div><div class="form-row"><div class="form-group"><label class="form-label">收件人姓名</label><input class="form-input" id="orderRecipientName"></div><div class="form-group"><label class="form-label">收件人電話</label><input class="form-input" id="orderRecipientPhone"></div></div>';
        h += '<div class="form-group"><label class="form-label">收件人 Email</label><input type="email" class="form-input" id="orderRecipientEmail" placeholder="用於發送訂單郵件"></div>';
        h += '<div class="form-group"><label class="form-label">收件人地址</label><input class="form-input" id="orderRecipientAddress"></div>';
        h += '<div class="form-row"><div class="form-group"><label class="form-label">送貨日期</label><input type="date" class="form-input" id="orderDeliveryDate"></div><div class="form-group"><label class="form-label">送貨時段</label><select class="form-select" id="orderDeliveryTime"><option value="全日派送">全日派送</option><option value="指定時間">指定時間</option><option value="夜晚派送">夜晚派送</option></select></div></div>';
        h += '<div class="form-row"><div class="form-group"><label class="form-label">心意卡內容</label><textarea class="form-textarea" id="orderCardMessage"></textarea></div><div class="form-group"><label class="form-label">特別事項</label><textarea class="form-textarea" id="orderRemarks"></textarea></div></div>';
        h += '<div class="form-actions"><button class="btn btn-primary" onclick="saveNewOrder()">保存訂單</button><button class="btn btn-secondary" onclick="hideAddOrderForm()">取消</button></div></div>';
        c.innerHTML = h;
    }
    function hideAddOrderForm() { document.getElementById('addOrderFormContainer').style.display = 'none'; }
    function toggleOrderProduct(id) { var idx = selectedOrderProducts.indexOf(id); if (idx > -1) { selectedOrderProducts.splice(idx, 1); } else { selectedOrderProducts.push(id); } }
    async function saveNewOrder() {
        var name = document.getElementById('orderRecipientName').value.trim();
        var phone = document.getElementById('orderRecipientPhone').value.trim();
        var email = document.getElementById('orderRecipientEmail').value.trim();
        var addr = document.getElementById('orderRecipientAddress').value.trim();
        if (!name || !phone || !addr || !selectedOrderProducts.length) { showToast('請填寫完整'); return; }
        var subtotal = 0;
        var productNames = [];
        var productImages = [];
        for (var i = 0; i < selectedOrderProducts.length; i++) {
            for (var j = 0; j < allProducts.length; j++) {
                if (allProducts[j].id === selectedOrderProducts[i]) {
                    subtotal += parseFloat(allProducts[j].price);
                    productNames.push(allProducts[j].name_zh);
                    productImages.push(allProducts[j].image_url || '');
                    break;
                }
            }
        }
        var area = detectDeliveryArea(addr);
        var deliveryFee = areaFees[area] || 90;
        if (area === 'tier1' && subtotal >= 500) { deliveryFee = 0; }
        var data = { order_code: 'RS' + Date.now().toString().slice(-8), recipient_name: name, recipient_phone: phone, customer_email: email, recipient_address: addr, delivery_date: document.getElementById('orderDeliveryDate').value, delivery_time_slot: document.getElementById('orderDeliveryTime').value, card_message: document.getElementById('orderCardMessage').value.trim(), remarks: document.getElementById('orderRemarks').value.trim(), subtotal: subtotal, delivery_fee: deliveryFee, total_amount: subtotal + deliveryFee, delivery_area: area, product_names: productNames.join('|'), product_images: productImages.join('|'), status: 'unpaid' };
        var result = await supabaseClient.from('orders').insert(data);
        if (result.error) { showToast('保存失敗：' + result.error.message); return; }
        showToast('訂單已創建，運費HK$' + deliveryFee);
        hideAddOrderForm();
        document.getElementById('addOrderFormContainer').style.display = 'none';
        document.getElementById('ordersTable').style.display = 'block';
        await loadOrders();
        if (email) {
            var emailHtml = '<h1>訂單確認</h1><p>訂單編號：' + data.order_code + '</p><p>收件人：' + name + '</p><p>總金額：HK$' + data.total_amount + '</p>';
            try { await fetch('/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, subject: '訂單確認 - ' + data.order_code, html: emailHtml }) }); } catch (e) {}
        }
    }
    async function openOrderDetail(id) {
        for (var i = 0; i < allOrders.length; i++) { if (allOrders[i].id === id) { currentOrderDetail = allOrders[i]; break; } }
        if (!currentOrderDetail) return;
        var o = currentOrderDetail;
        var shopName = 'RoyalSpl Florist';
        var shopLogo = '';
        var shopPhone = '';
        var shopAddress = '';
        try {
            var shopResult = await supabaseClient.from('shop_settings').select('*').limit(1);
            if (shopResult.data && shopResult.data.length > 0) {
                shopName = shopResult.data[0].shop_name || 'RoyalSpl Florist';
                shopLogo = shopResult.data[0].shop_logo || '';
                shopPhone = shopResult.data[0].shop_phone || '';
                shopAddress = shopResult.data[0].shop_address || '';
            }
        } catch (e) {}
        var names = (o.product_names || '').split('|').filter(Boolean);
        var images = (o.product_images || '').split('|').filter(Boolean);
        var productHtml = '';
        for (var pi = 0; pi < names.length; pi++) {
            productHtml += '<div class="order-product-item">';
            if (images[pi]) { productHtml += '<img src="' + images[pi] + '">'; }
            productHtml += '<span style="font-size:12px;">' + names[pi] + '</span></div>';
        }
        var v = document.getElementById('orderDetailView');
        v.style.display = 'block';
        document.getElementById('ordersTable').style.display = 'none';
        v.innerHTML = '<div class="page-header"><button class="btn btn-secondary" onclick="closeOrderDetail()">返回列表</button><button class="btn btn-primary" onclick="downloadOrderPDF()">下載 PDF</button><button class="btn btn-primary" onclick="copyOrderDetail(' + o.id + ')">複製轉發</button></div>';
        v.innerHTML += '<div class="form-container" style="max-width:100%;"><input type="hidden" id="orderDetailId" value="' + o.id + '">';
        v.innerHTML += '<div style="text-align:center;margin-bottom:20px;">';
        if (shopLogo) { v.innerHTML += '<img src="' + shopLogo + '" style="max-width:80px;max-height:80px;object-fit:contain;"><br>'; }
        v.innerHTML += '<h2 style="font-size:22px;font-weight:600;">' + shopName + '</h2>';
        v.innerHTML += '<p style="font-size:14px;color:#383431;">' + shopPhone + ' | ' + shopAddress + '</p></div>';
        v.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">訂單編號</label><input class="form-input" id="detailOrderCode" value="' + o.order_code + '"></div><div class="form-group"><label class="form-label">送貨日期</label><input type="date" class="form-input" id="detailDeliveryDate" value="' + (o.delivery_date || '') + '"></div></div>';
        v.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">收件人姓名</label><input class="form-input" id="detailRecipientName" value="' + (o.recipient_name || '') + '"></div><div class="form-group"><label class="form-label">收件人電話</label><input class="form-input" id="detailRecipientPhone" value="' + (o.recipient_phone || '') + '"></div></div>';
        v.innerHTML += '<div class="form-group"><label class="form-label">收件人 Email</label><input class="form-input" id="detailCustomerEmail" value="' + (o.customer_email || '') + '"></div>';
        v.innerHTML += '<div class="form-group"><label class="form-label">收件人地址</label><input class="form-input" id="detailRecipientAddress" value="' + (o.recipient_address || '') + '"></div>';
        v.innerHTML += '<div class="form-group"><label class="form-label">產品</label><div>' + (productHtml || '無產品') + '</div></div>';
        v.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">心意卡內容</label><textarea class="form-textarea" id="detailCardMessage">' + (o.card_message || '') + '</textarea></div><div class="form-group"><label class="form-label">特別事項</label><textarea class="form-textarea" id="detailRemarks">' + (o.remarks || '') + '</textarea></div></div>';
        v.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">運費</label><input type="number" class="form-input" id="detailDeliveryFee" value="' + (o.delivery_fee || 0) + '"></div><div class="form-group"><label class="form-label">總價</label><input type="number" class="form-input" id="detailTotalAmount" value="' + (o.total_amount || 0) + '"></div></div>';
        v.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveOrderDetail()">保存修改</button></div></div>';
    }
    function closeOrderDetail() { document.getElementById('orderDetailView').style.display = 'none'; document.getElementById('ordersTable').style.display = 'block'; loadOrders(); }
    async function saveOrderDetail() {
        var id = document.getElementById('orderDetailId').value;
        var data = {
            order_code: document.getElementById('detailOrderCode').value.trim(),
            delivery_date: document.getElementById('detailDeliveryDate').value,
            recipient_name: document.getElementById('detailRecipientName').value.trim(),
            recipient_phone: document.getElementById('detailRecipientPhone').value.trim(),
            customer_email: document.getElementById('detailCustomerEmail').value.trim(),
            recipient_address: document.getElementById('detailRecipientAddress').value.trim(),
            card_message: document.getElementById('detailCardMessage').value.trim(),
            remarks: document.getElementById('detailRemarks').value.trim(),
            delivery_fee: parseFloat(document.getElementById('detailDeliveryFee').value) || 0,
            total_amount: parseFloat(document.getElementById('detailTotalAmount').value) || 0
        };
        await supabaseClient.from('orders').update(data).eq('id', id);
        showToast('訂單已保存');
        closeOrderDetail();
    }
    function downloadOrderPDFById(id) { for (var i = 0; i < allOrders.length; i++) { if (allOrders[i].id === id) { currentOrderDetail = allOrders[i]; break; } } downloadOrderPDF(); }
    async function downloadOrderPDF() {
        if (!currentOrderDetail) return;
        var o = currentOrderDetail;
        var shopLogo = '';
        var shopName = 'RoyalSpl Florist';
        try {
            var shopResult = await supabaseClient.from('shop_settings').select('*').limit(1);
            if (shopResult.data && shopResult.data.length > 0) {
                shopLogo = shopResult.data[0].shop_logo || '';
                shopName = shopResult.data[0].shop_name || 'RoyalSpl Florist';
            }
        } catch (e) {}
        var names = (o.product_names || '').split('|').filter(Boolean);
        var images = (o.product_images || '').split('|').filter(Boolean);
        var html = '<div style="font-family:serif;padding:40px;max-width:600px;margin:0 auto;">';
        if (shopLogo) { html += '<div style="text-align:center;margin-bottom:15px;"><img src="' + shopLogo + '" style="max-width:80px;max-height:80px;object-fit:contain;"></div>'; }
        html += '<h1 style="text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:15px;">' + shopName + '</h1>';
        html += '<p style="text-align:center;">訂單確認書</p>';
        html += '<table style="width:100%;margin:20px 0;"><tr><td><b>訂單編號：</b>' + o.order_code + '</td><td><b>送貨日期：</b>' + (o.delivery_date || '-') + '</td></tr>';
        html += '<tr><td><b>收件人：</b>' + (o.recipient_name || '-') + '</td><td><b>電話：</b>' + (o.recipient_phone || '-') + '</td></tr>';
        html += '<tr><td colspan="2"><b>地址：</b>' + (o.recipient_address || '-') + '</td></tr></table>';
        html += '<table style="width:100%;border-collapse:collapse;"><tr style="background:#1E3A5F;color:white;"><th style="padding:10px;">圖片</th><th style="padding:10px;">商品</th><th style="padding:10px;">數量</th><th style="padding:10px;">單價</th><th style="padding:10px;">小計</th></tr>';
        if (names.length > 0) {
            for (var pi = 0; pi < names.length; pi++) {
                html += '<tr><td style="padding:10px;border:1px solid #ddd;">' + (images[pi] ? '<img src="' + images[pi] + '" style="width:50px;height:50px;object-fit:cover;border-radius:5px;">' : '') + '</td>';
                html += '<td style="padding:10px;border:1px solid #ddd;">' + names[pi] + '</td><td style="padding:10px;text-align:center;">1</td><td style="padding:10px;text-align:right;">HK$' + (o.subtotal || 0) + '</td><td style="padding:10px;text-align:right;">HK$' + (o.subtotal || 0) + '</td></tr>';
            }
        } else {
            html += '<tr><td style="padding:10px;border:1px solid #ddd;">無圖</td><td style="padding:10px;border:1px solid #ddd;">花禮商品</td><td style="padding:10px;text-align:center;">1</td><td style="padding:10px;text-align:right;">HK$' + (o.subtotal || 0) + '</td><td style="padding:10px;text-align:right;">HK$' + (o.subtotal || 0) + '</td></tr>';
        }
        html += '</table>';
        html += '<table style="width:50%;margin-left:auto;margin-top:15px;"><tr><td>運費：</td><td style="text-align:right;">HK$' + (o.delivery_fee || 0) + '</td></tr>';
        html += '<tr style="font-size:20px;font-weight:bold;"><td>總計：</td><td style="text-align:right;">HK$' + (o.total_amount || 0) + '</td></tr></table>';
        if (o.card_message) { html += '<div style="background:#FFF8E1;padding:15px;border-left:4px solid #FFC107;margin:20px 0;"><b>心意卡：</b>' + o.card_message + '</div>'; }
        html += '<p style="text-align:center;margin-top:30px;color:#666;">感謝您的訂購！</p></div>';
        var w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        w.print();
    }
    function copyOrderDetail(id) {
        var o = null;
        for (var i = 0; i < allOrders.length; i++) { if (allOrders[i].id === id) { o = allOrders[i]; break; } }
        if (!o) return;
        var text = '訂單編號：' + o.order_code + '\n送貨日期：' + (o.delivery_date || '-') + '\n收件人：' + o.recipient_name + '\n電話：' + o.recipient_phone + '\n';
        if (o.customer_email) { text += 'Email：' + o.customer_email + '\n'; }
        text += '地址：' + o.recipient_address + '\n產品：' + (o.product_names || '') + '\n總金額：HK$' + o.total_amount + '\n狀態：' + o.status;
        if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function() { showToast('訂單詳情已複製'); }); }
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('訂單詳情已複製'); }
    }
    async function createStripePayment(orderId) {
        var order = null;
        for (var i = 0; i < allOrders.length; i++) { if (allOrders[i].id === orderId) { order = allOrders[i]; break; } }
        if (!order) return;
        try {
            var res = await fetch('/stripe-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_payment', orderId: order.id, amount: order.total_amount, orderCode: order.order_code }) });
            var data = await res.json();
            if (data.url) { window.open(data.url, '_blank'); showToast('支付連結已生成'); } else { showToast('生成失敗：' + (data.error || '未知錯誤')); }
        } catch (e) { showToast('網絡錯誤'); }
    }
    function showRefundForm(orderId) {
        var order = null;
        for (var i = 0; i < allOrders.length; i++) { if (allOrders[i].id === orderId) { order = allOrders[i]; break; } }
        if (!order) return;
        var amount = prompt('退款金額 (HKD)：\n全額退款請輸入 ' + order.total_amount + '\n部分退款請輸入金額', order.total_amount);
        if (!amount) return;
        var refundAmount = parseFloat(amount);
        if (refundAmount <= 0) { showToast('請輸入有效金額'); return; }
        if (refundAmount > order.total_amount) { showToast('退款金額不能超過訂單總額'); return; }
        processRefund(order, refundAmount);
    }
    async function processRefund(order, refundAmount) {
        try {
            var res = await fetch('/stripe-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refund', paymentIntentId: order.stripe_payment_intent_id, refundAmount: refundAmount }) });
            var data = await res.json();
            if (data.success) { await supabaseClient.from('orders').update({ refund_status: 'refunded', status: 'cancelled' }).eq('id', order.id); showToast('退款成功'); loadOrders(); } else { showToast('退款失敗：' + (data.error || '未知錯誤')); }
        } catch (e) { showToast('網絡錯誤'); }
    }
    function exportOrdersCSV() { if (!allOrders.length) return; var rows = ['order_code,created_at,delivery_date,recipient_name,recipient_phone,customer_email,recipient_address,total_amount,status']; for (var i = 0; i < allOrders.length; i++) { var o = allOrders[i]; rows.push([o.order_code, (o.created_at || '').slice(0,10), o.delivery_date || '', o.recipient_name, o.recipient_phone, o.customer_email || '', o.recipient_address || '', o.total_amount, o.status].join(',')); } var blob = new Blob([rows.join('\n')], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orders.csv'; a.click(); }

    // ==================== 模板預覽 ====================
    function renderTemplatePage(c) {
        c.innerHTML = '<div class="page-header"><h2 class="page-title">模板預覽</h2><div class="btn-group"><button class="btn btn-primary" onclick="downloadTemplatePDF()">下載 PDF</button></div></div><div class="form-container" style="max-width:100%;">';
        c.innerHTML += '<h3 style="font-size:18px;font-weight:600;margin-bottom:15px;">店鋪資料</h3>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">店鋪名稱</label><input class="form-input" id="tplShopName" oninput="renderTemplatePreview()"></div><div class="form-group"><label class="form-label">聯絡電話</label><input class="form-input" id="tplShopPhone" oninput="renderTemplatePreview()"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">店鋪地址</label><input class="form-input" id="tplShopAddress" oninput="renderTemplatePreview()"></div><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="tplShopEmail" oninput="renderTemplatePreview()"></div></div>';
        c.innerHTML += '<div class="form-group"><label class="form-label">LOGO 網址</label><input class="form-input" id="tplShopLogo" oninput="renderTemplatePreview()"></div>';
        c.innerHTML += '<div class="form-actions"><button class="btn btn-primary" onclick="saveShopSettings()">保存店鋪資料</button></div>';
        c.innerHTML += '<hr style="margin:25px 0;border-top:1px solid #ddd;">';
        c.innerHTML += '<h3 style="font-size:18px;font-weight:600;margin-bottom:15px;">訂單資料</h3>';
        c.innerHTML += '<div class="form-group"><label class="form-label">選擇商品</label><select class="form-select" id="tplProductSelect" onchange="selectTemplateProduct()"><option value="">請選擇商品</option></select></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">訂單編號</label><input class="form-input" id="tplOrderCode" oninput="renderTemplatePreview()"></div><div class="form-group"><label class="form-label">送貨日期</label><input type="date" class="form-input" id="tplDeliveryDate" oninput="renderTemplatePreview()"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">訂購人姓名</label><input class="form-input" id="tplCustomerName" oninput="renderTemplatePreview()"></div><div class="form-group"><label class="form-label">電話</label><input class="form-input" id="tplCustomerPhone" oninput="renderTemplatePreview()"></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">收件人姓名</label><input class="form-input" id="tplRecipientName" oninput="renderTemplatePreview()"></div><div class="form-group"><label class="form-label">收件人電話</label><input class="form-input" id="tplRecipientPhone" oninput="renderTemplatePreview()"></div></div>';
        c.innerHTML += '<div class="form-group"><label class="form-label">收件人地址</label><input class="form-input" id="tplRecipientAddress" oninput="renderTemplatePreview()"></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">心意卡</label><textarea class="form-textarea" id="tplCardMessage" oninput="renderTemplatePreview()"></textarea></div><div class="form-group"><label class="form-label">特別事項</label><textarea class="form-textarea" id="tplRemarks" oninput="renderTemplatePreview()"></textarea></div></div>';
        c.innerHTML += '<div class="form-row"><div class="form-group"><label class="form-label">數量</label><input type="number" class="form-input" id="tplQuantity" value="1" oninput="renderTemplatePreview()"></div><div class="form-group"><label class="form-label">運費</label><input type="number" class="form-input" id="tplDeliveryFee" value="90" oninput="renderTemplatePreview()"></div></div>';
        c.innerHTML += '</div><div style="background:#f5f5f5;padding:30px;border-radius:10px;margin-top:20px;"><h3 style="text-align:center;">模板效果預覽</h3><div id="templatePreview" style="background:white;padding:40px;border-radius:10px;max-width:650px;margin:0 auto;"></div></div>';
        loadShopSettings();
        loadTemplateProductOptions();
    }
    async function loadShopSettings() {
        try {
            var r = await supabaseClient.from('shop_settings').select('*').limit(1);
            if (r.data && r.data.length > 0) {
                var s = r.data[0];
                document.getElementById('tplShopName').value = s.shop_name || '';
                document.getElementById('tplShopPhone').value = s.shop_phone || '';
                document.getElementById('tplShopAddress').value = s.shop_address || '';
                document.getElementById('tplShopEmail').value = s.shop_email || '';
                document.getElementById('tplShopLogo').value = s.shop_logo || '';
            }
        } catch (e) {}
        renderTemplatePreview();
    }
    async function saveShopSettings() {
        var data = {
            shop_name: document.getElementById('tplShopName').value.trim(),
            shop_phone: document.getElementById('tplShopPhone').value.trim(),
            shop_address: document.getElementById('tplShopAddress').value.trim(),
            shop_email: document.getElementById('tplShopEmail').value.trim(),
            shop_logo: document.getElementById('tplShopLogo').value.trim()
        };
        try {
            var r = await supabaseClient.from('shop_settings').select('id').limit(1);
            if (r.data && r.data.length > 0) { await supabaseClient.from('shop_settings').update(data).eq('id', r.data[0].id); }
            else { await supabaseClient.from('shop_settings').insert(data); }
            showToast('店鋪資料已保存');
        } catch (e) { showToast('保存失敗，請先創建 shop_settings 表'); }
    }
    function loadTemplateProductOptions() {
        var sel = document.getElementById('tplProductSelect');
        if (!sel) return;
        var h = '<option value="">請選擇商品</option>';
        for (var i = 0; i < allProducts.length; i++) {
            h += '<option value="' + allProducts[i].id + '">' + allProducts[i].name_zh + ' (HK$' + allProducts[i].price + ')</option>';
        }
        sel.innerHTML = h;
    }
    function selectTemplateProduct() {
        var id = parseInt(document.getElementById('tplProductSelect').value);
        selectedTemplateProduct = null;
        for (var i = 0; i < allProducts.length; i++) { if (allProducts[i].id === id) { selectedTemplateProduct = allProducts[i]; break; } }
        renderTemplatePreview();
    }
    function renderTemplatePreview() {
        var preview = document.getElementById('templatePreview');
        if (!preview) return;
        var qty = parseInt(document.getElementById('tplQuantity').value) || 1;
        var deliveryFee = parseFloat(document.getElementById('tplDeliveryFee').value) || 0;
        var unitPrice = selectedTemplateProduct ? parseFloat(selectedTemplateProduct.price) : 0;
        var subtotal = unitPrice * qty;
        var total = subtotal + deliveryFee;
        var productImg = selectedTemplateProduct && selectedTemplateProduct.image_url ? selectedTemplateProduct.image_url : '';
        var productName = selectedTemplateProduct ? selectedTemplateProduct.name_zh : '';
        var html = '<div class="template-preview-content">';
        var logo = document.getElementById('tplShopLogo').value;
        if (logo) { html += '<div class="template-preview-logo"><img src="' + logo + '"></div>'; }
        html += '<h1>' + (document.getElementById('tplShopName').value || 'RoyalSpl Florist') + '</h1>';
        html += '<p style="text-align:center;">訂單確認書</p>';
        html += '<table><tr><td><b>訂單編號：</b>' + (document.getElementById('tplOrderCode').value || '') + '</td><td><b>送貨日期：</b>' + (document.getElementById('tplDeliveryDate').value || '') + '</td></tr>';
        html += '<tr><td><b>訂購人：</b>' + (document.getElementById('tplCustomerName').value || '') + '</td><td><b>電話：</b>' + (document.getElementById('tplCustomerPhone').value || '') + '</td></tr>';
        html += '<tr><td><b>收件人：</b>' + (document.getElementById('tplRecipientName').value || '') + '</td><td><b>收件人電話：</b>' + (document.getElementById('tplRecipientPhone').value || '') + '</td></tr>';
        html += '<tr><td colspan="2"><b>收件地址：</b>' + (document.getElementById('tplRecipientAddress').value || '') + '</td></tr></table>';
        html += '<table><tr style="background:#1E3A5F;color:white;"><th>商品圖片</th><th>商品</th><th>數量</th><th>單價</th><th>小計</th></tr>';
        html += '<tr><td>' + (productImg ? '<img src="' + productImg + '" style="width:60px;height:60px;object-fit:cover;border-radius:5px;">' : '無圖') + '</td>';
        html += '<td>' + productName + '</td><td style="text-align:center;">' + qty + '</td><td style="text-align:right;">HK$' + unitPrice + '</td><td style="text-align:right;">HK$' + subtotal + '</td></tr></table>';
        html += '<table style="width:50%;margin-left:auto;"><tr><td>運費：</td><td style="text-align:right;">HK$' + deliveryFee + '</td></tr>';
        html += '<tr style="font-size:20px;font-weight:bold;"><td>總計：</td><td style="text-align:right;">HK$' + total + '</td></tr></table>';
        var cardMsg = document.getElementById('tplCardMessage').value;
        if (cardMsg) { html += '<div style="background:#FFF8E1;padding:15px;border-left:4px solid #FFC107;margin:20px 0;"><b>心意卡：</b>' + cardMsg + '</div>'; }
        var remarks = document.getElementById('tplRemarks').value;
        if (remarks) { html += '<div style="background:#F5F5F5;padding:15px;margin:20px 0;"><b>特別事項：</b>' + remarks + '</div>'; }
        html += '<p style="text-align:center;margin-top:30px;color:#666;">' + (document.getElementById('tplShopName').value || '') + ' | ' + (document.getElementById('tplShopPhone').value || '') + '</p>';
        html += '<p style="text-align:center;color:#666;">' + (document.getElementById('tplShopAddress').value || '') + '</p>';
        html += '</div>';
        preview.innerHTML = html;
    }
    function downloadTemplatePDF() {
        renderTemplatePreview();
        var w = window.open('', '_blank');
        w.document.write('<html><head><title>訂單收據</title></head><body>' + document.getElementById('templatePreview').innerHTML + '</body></html>');
        w.document.close();
        w.print();
    }

    function showToast(msg) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.classList.add('show'); }, 10);
        setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, 2500);
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (localStorage.getItem('royalspl_admin') === 'true') {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminPage').style.display = 'block';
            switchPage('analytics');
            checkVisitorNotifications();
        }
    });
    