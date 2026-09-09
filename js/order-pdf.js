// ============================================
// RoyalSpl Florist - 訂單 PDF 生成（html2canvas + jsPDF）
// 依賴：html2canvas、jspdf 需先於本檔案載入
// ============================================

// 店舖資訊（如需修改電話/地址/logo，改呢度就得）
var SHOP_INFO = {
    name: 'RoyalSpl Florist HONG KONG',
    email: 'info@royalspl.xyz',
    whatsapp: '+852 6503 6907',
    phone: '',
    address: '2F, 2-16, Wo Liu Hang St, Fo Tan, Hong Kong',
    logo: '/assets/royalspl-logo.jpg'
};

async function generateOrderPdfBase64(o) {
    var shop = Object.assign({}, SHOP_INFO, o.shop || {});
    var data = Object.assign({}, o, { shop: shop });
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px;z-index:-1;background:#fff;';
    container.innerHTML = buildPdfHtml(data);
    document.body.appendChild(container);
    try {
        var canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, imageTimeout: 15000, windowWidth: 640 });
        var imgData = canvas.toDataURL('image/jpeg', 0.92);
        var pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        var pageW = 210, pageH = 297;
        var imgW = pageW - 20;
        var imgH = canvas.height * imgW / canvas.width;
        if (imgH > pageH - 20) { imgH = pageH - 20; imgW = canvas.width * imgH / canvas.height; }
        pdf.addImage(imgData, 'JPEG', (pageW - imgW) / 2, 10, imgW, imgH);
        var dataUri = pdf.output('datauristring');
        return dataUri.split(',')[1];
    } finally {
        if (container.parentNode) container.parentNode.removeChild(container);
    }
}

function buildPdfHtml(o) {
    var shop = o.shop || SHOP_INFO;
    var shopName = o.shopName || shop.name || 'RoyalSpl Florist';
    var shopLogo = o.shopLogo || shop.logo || '';
    var shopPhone = o.shopPhone || shop.phone || shop.whatsapp || '';
    var shopEmail = o.shopEmail || shop.email || '';
    var shopAddress = o.shopAddress || shop.address || '';

    // —— 解析訂單明細（支援 items 陣列 / product_names 字串 / product_images 陣列）——
    var rows = '';
    var items = o.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = null; } }

    var names = null, images = null;
    if (o.productNames) names = Array.isArray(o.productNames) ? o.productNames : String(o.productNames).split('|');
    if (o.productImages) images = Array.isArray(o.productImages) ? o.productImages : String(o.productImages).split('|');

    var itemCount = 0;
    if (items && items.length) {
        for (var i = 0; i < items.length; i++) {
            var it = items[i] || {};
            var nm = it.name || it.name_zh || it.product_name || (names && names[i]) || '';
            var img = it.image || it.image_url || (images && images[i]) || '';
            var q = it.quantity || 1;
            var pr = (it.price != null && it.price !== '') ? parseFloat(it.price) : 0;
            rows += orderItemRow(img, nm, q, pr);
            itemCount++;
        }
    } else if (names) {
        for (var j = 0; j < names.length; j++) {
            if (!names[j]) continue;
            var img2 = (images && images[j]) || '';
            var unitPrice = o.subtotal ? (parseFloat(o.subtotal) / names.filter(Boolean).length) : 0;
            rows += orderItemRow(img2, names[j], 1, unitPrice);
            itemCount++;
        }
    } else {
        rows = '<tr><td style="padding:10px;border:1px solid #D8DEE6;text-align:center;color:#888;" colspan="5">花禮商品</td></tr>';
        itemCount = 1;
    }

    // —— 付款狀態映射 ——
    var paymentStatusMap = {
        'unpaid': '待付款',
        'pending_payment': '待付款',
        'paid': '已付款',
        'shipped': '已付款',
        'archived': '已付款',
        'cancelled': '已取消'
    };
    var paymentStatus = o.paymentStatus || paymentStatusMap[o.status] || o.status || '-';

    // —— 配送時段映射 ——
    var timeSlotMap = {
        'full_day': '全日',
        'morning': '上午 (9:00-13:00)',
        'afternoon': '下午 (13:00-18:00)',
        'evening': '晚上 (18:00-21:00)'
    };
    var deliveryTime = timeSlotMap[o.deliveryTime] || o.deliveryTime || '-';

    // —— 下單日期格式化 ——
    var orderDate = '-';
    if (o.createdAt) {
        try {
            var d = new Date(o.createdAt);
            orderDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        } catch(e) {}
    }

    // —— 付款方式 ——
    var paymentMethod = o.paymentMethod || '-';
    if (o.payment_method === 'fps') paymentMethod = '轉數快 FPS';
    else if (o.payment_method === 'card') paymentMethod = '信用卡/Apple Pay';

    // —— 店舖聯絡資訊 ——
    var contactParts = [];
    if (shopPhone) contactParts.push('電話：' + shopPhone);
    if (shopEmail) contactParts.push('電郵：' + shopEmail);
    if (shopAddress) contactParts.push('地址：' + shopAddress);
    contactParts.push('網址：www.royalspl.shop');

    return '<div style="width:600px;margin:0 auto;font-family:Arial,\'Noto Sans TC\',\'Microsoft JhengHei\',sans-serif;padding:8px;background:#fff;color:#1A1B1C;">'
        + '<div style="border:1px solid #E4E3DD;border-radius:10px;padding:26px 30px;">'
        // 店舖Logo + 名稱
        + (shopLogo ? '<div style="text-align:center;margin-bottom:15px;"><img src="' + shopLogo + '" style="max-width:80px;max-height:80px;object-fit:contain;" onerror="this.style.display=\'none\';"></div>' : '')
        + '<h1 style="text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:15px;margin:0 0 10px 0;font-size:24px;">' + shopName + '</h1>'
        + '<p style="text-align:center;font-size:18px;font-weight:bold;margin:15px 0;color:#1A1A1A;">購物收據 / Official Receipt</p>'

        // 訂單資訊
        + '<table style="width:100%;margin:15px 0;border-collapse:collapse;font-size:13px;">'
        + '<tr><td style="padding:6px 0;"><b>訂單編號：</b>' + (o.orderCode || '-') + '</td><td style="padding:6px 0;"><b>下單日期：</b>' + orderDate + '</td></tr>'
        + '<tr><td style="padding:6px 0;"><b>送貨日期：</b>' + (o.deliveryDate || '-') + '</td><td style="padding:6px 0;"><b>配送時段：</b>' + deliveryTime + '</td></tr>'
        + '<tr><td style="padding:6px 0;"><b>付款狀態：</b>' + paymentStatus + '</td><td style="padding:6px 0;"><b>付款方式：</b>' + paymentMethod + '</td></tr>'
        + '</table>'

        // 收件人資訊
        + '<table style="width:100%;margin:10px 0;border-collapse:collapse;font-size:13px;">'
        + '<tr><td style="padding:6px 0;"><b>收件人：</b>' + (o.recipientName || '-') + '</td><td style="padding:6px 0;"><b>電話：</b>' + (o.recipientPhone || '-') + '</td></tr>'
        + '<tr><td colspan="2" style="padding:6px 0;"><b>地址：</b>' + (o.address || '-') + '</td></tr>'
        + (o.customerEmail ? '<tr><td colspan="2" style="padding:6px 0;"><b>客戶電郵：</b>' + o.customerEmail + '</td></tr>' : '')
        + '</table>'

        // 商品明細（含圖片）
        + '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
        + '<tr style="background:#1E3A5F;color:#fff;">'
        + '<th style="padding:8px;border:1px solid #1E3A5F;width:56px;">圖片</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;">商品</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;width:52px;">數量</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;width:80px;">單價</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;width:80px;">小計</th>'
        + '</tr>'
        + rows
        + '</table>'

        // 金額合計
        + '<table style="width:58%;margin-left:auto;margin-top:14px;font-size:13px;border-collapse:collapse;">'
        + '<tr><td style="padding:5px 0;">小計：</td><td style="padding:5px 0;text-align:right;">HK$' + fmtMoney(o.subtotal) + '</td></tr>'
        + '<tr><td style="padding:5px 0;">運費：</td><td style="padding:5px 0;text-align:right;">HK$' + fmtMoney(o.deliveryFee) + '</td></tr>'
        + (o.discountAmount && parseFloat(o.discountAmount) > 0 ? '<tr><td style="padding:5px 0;color:#d32f2f;">折扣：</td><td style="padding:5px 0;text-align:right;color:#d32f2f;">-HK$' + fmtMoney(o.discountAmount) + '</td></tr>' : '')
        + '<tr style="font-size:18px;font-weight:bold;"><td style="padding:8px 0;border-top:2px solid #333;">總計：</td><td style="padding:8px 0;border-top:2px solid #333;text-align:right;">HK$' + fmtMoney(o.total || o.totalAmount) + '</td></tr>'
        + '</table>'

        // 心意卡
        + (o.cardMessage ? '<div style="background:#FFF8E1;padding:12px 15px;border-left:4px solid #FFC107;margin:18px 0;font-size:13px;"><b>心意卡：</b>' + o.cardMessage + '</div>' : '')

        // 店舖聯絡資訊
        + '<div style="margin-top:25px;padding-top:18px;border-top:1px solid #ddd;font-size:12px;color:#666;line-height:1.8;text-align:center;">'
        + contactParts.join('<br>')
        + '</div>'

        // 底部
        + '<p style="text-align:center;margin-top:18px;color:#999;font-size:11px;">此為電腦發出之收據，無需簽署<br>感謝您的訂購！</p>'
        + '</div>'
        + '</div>';
}

function orderItemRow(img, name, q, pr) {
    var imgCell = '';
    if (img) {
        imgCell = '<img src="' + img + '" style="width:44px;height:44px;object-fit:cover;border-radius:4px;display:block;" onerror="this.style.display=\'none\';" />';
    } else {
        imgCell = '<div style="width:44px;height:44px;background:#EEF1F5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌸</div>';
    }
    return '<tr><td style="padding:7px;border:1px solid #D8DEE6;text-align:center;">' + imgCell + '</td>'
        + '<td style="padding:7px;border:1px solid #D8DEE6;">' + name + '</td>'
        + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:center;">' + q + '</td>'
        + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:right;">' + (pr ? 'HK$' + fmtMoney(pr) : '-') + '</td>'
        + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:right;">' + (pr ? 'HK$' + fmtMoney(pr * q) : '-') + '</td></tr>';
}

function fmtMoney(v) {
    if (v == null || v === '') return '0';
    var n = Number(v);
    return (Math.round(n)).toLocaleString('en-US');
}

// ============================================
// 郵件版式：直接展示 PDF 訂單頁面（table 排版，支援 Gmail/Outlook 等電郵客戶端）
// 用法同 buildPdfHtml 一樣：傳入訂單資料物件 o
// ============================================
function buildOrderEmailHtml(o) {
    var shop = Object.assign({}, SHOP_INFO, o.shop || {});
    var ABS_LOGO = 'https://www.royalspl.shop/assets/royalspl-logo.jpg';
    // —— 解析商品明細 ——
    var rows = '';
    var items = o.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = null; } }
    var names = null, images = null;
    if (o.productNames) names = Array.isArray(o.productNames) ? o.productNames : String(o.productNames).split('|');
    if (o.productImages) images = Array.isArray(o.productImages) ? o.productImages : String(o.productImages).split('|');
    var list = [];
    if (items && items.length) {
        for (var i = 0; i < items.length; i++) {
            var it = items[i] || {};
            list.push({
                name: it.name || it.name_zh || it.product_name || (names && names[i]) || '',
                img: it.image || it.image_url || (images && images[i]) || '',
                q: it.quantity || 1,
                pr: (it.price != null && it.price !== '') ? parseFloat(it.price) : 0
            });
        }
    } else if (names) {
        for (var j = 0; j < names.length; j++) { if (!names[j]) continue; list.push({ name: names[j], img: (images && images[j]) || '', q: 1, pr: 0 }); }
    }
    if (list.length) {
        for (var k = 0; k < list.length; k++) {
            var r = list[k];
            var imgCell = r.img
                ? '<img src="' + r.img + '" width="44" height="44" style="width:44px;height:44px;object-fit:cover;border-radius:4px;display:block;border:1px solid #eee;" alt=""/>'
                : '<div style="width:44px;height:44px;background:#EEF1F5;border-radius:4px;text-align:center;line-height:44px;font-size:18px;">🌸</div>';
            rows += '<tr>'
                + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:center;vertical-align:middle;">' + imgCell + '</td>'
                + '<td style="padding:7px;border:1px solid #D8DEE6;vertical-align:middle;">' + r.name + '</td>'
                + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:center;vertical-align:middle;">' + r.q + '</td>'
                + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:right;vertical-align:middle;">' + (r.pr ? 'HK$' + fmtMoney(r.pr) : '-') + '</td>'
                + '<td style="padding:7px;border:1px solid #D8DEE6;text-align:right;vertical-align:middle;">' + (r.pr ? 'HK$' + fmtMoney(r.pr * r.q) : '-') + '</td>'
                + '</tr>';
        }
    } else {
        rows = '<tr><td style="padding:10px;border:1px solid #D8DEE6;text-align:center;color:#888;" colspan="5">花禮商品</td></tr>';
    }
    // —— 店舖聯絡 ——
    var contactParts = [];
    if (shop.email) contactParts.push(shop.email);
    if (shop.whatsapp) contactParts.push('WhatsApp ' + shop.whatsapp);
    if (shop.phone) contactParts.push(shop.phone);
    var contactLine = contactParts.join(' | ');
    var logoUrl = (shop.logo && shop.logo.indexOf('http') === 0) ? shop.logo : ABS_LOGO;
    // —— 訂購人 / 收貨人 ——
    var customer = (o.customerName || '') + (o.customerPhone ? '（' + o.customerPhone + '）' : '') + (o.customerEmail ? ' · ' + o.customerEmail : '');
    if (!o.customerName && o.recipientName) customer = (o.recipientName || '') + (o.recipientPhone ? '（' + o.recipientPhone + '）' : '');
    var recipient = (o.recipientName || '') + (o.recipientPhone ? '（' + o.recipientPhone + '）' : '');
    var delivery = (o.deliveryDate || '-') + (o.deliveryTime ? '（' + o.deliveryTime + '）' : '');
    var e = function (s) { return (s == null || s === '') ? '-' : s; };
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EE;"><tr><td style="padding:18px 8px;">'
        + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;background:#fff;border:1px solid #E4E3DD;border-radius:10px;font-family:Arial,Helvetica,\'Noto Sans TC\',\'Microsoft JhengHei\',sans-serif;color:#1A1B1C;">'
        // 店舖抬頭
        + '<tr><td style="background:#1E3A5F;padding:20px 24px;text-align:center;">'
        + '<img src="' + logoUrl + '" width="104" height="104" style="width:104px;height:104px;object-fit:contain;background:#fff;border-radius:10px;padding:6px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;" alt="' + shop.name + '"/>'
        + '<div style="font-size:24px;font-weight:bold;letter-spacing:3px;color:#fff;">' + shop.name + '</div>'
        + '</td></tr>'
        + '<tr><td style="padding:22px 28px;">'
        + '<div style="text-align:center;font-size:15px;color:#1E3A5F;font-weight:bold;letter-spacing:4px;margin:2px 0 14px;">' + (o.title || '訂單確認書') + '</div>'
        + (o.message ? '<p style="font-size:13px;color:#555;margin:0 0 14px;text-align:center;">' + o.message + '</p>' : '')
        // 訂單基本資料
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:12px;">'
        + '<tr><td style="padding:3px 0;"><b>訂單編號：</b>' + e(o.orderCode) + '</td><td style="padding:3px 0;"><b>狀態：</b>' + e(o.status) + '</td></tr>'
        + '<tr><td style="padding:3px 0;"><b>送貨日期：</b>' + e(delivery) + '</td><td style="padding:3px 0;"><b>配送區域：</b>' + e(o.deliveryArea) + '</td></tr>'
        + '</table>'
        // 訂購人 / 收貨人
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;background:#F4F6F9;border-radius:6px;margin-bottom:16px;">'
        + '<tr><td style="padding:8px 12px;border-bottom:1px solid #E4E3DD;"><b>訂購人：</b>' + e(customer) + '</td></tr>'
        + '<tr><td style="padding:8px 12px;border-bottom:1px solid #E4E3DD;"><b>收貨人：</b>' + e(recipient) + '</td></tr>'
        + '<tr><td style="padding:8px 12px;"><b>送貨地址：</b>' + e(o.address) + '</td></tr>'
        + '</table>'
        // 商品明細
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">'
        + '<tr style="background:#1E3A5F;">'
        + '<th style="padding:8px;border:1px solid #1E3A5F;color:#fff;width:56px;">圖片</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;color:#fff;">商品</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;color:#fff;width:52px;">數量</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;color:#fff;width:80px;">單價</th>'
        + '<th style="padding:8px;border:1px solid #1E3A5F;color:#fff;width:80px;">小計</th>'
        + '</tr>'
        + rows
        + '</table>'
        // 金額
        + '<table role="presentation" width="58%" cellpadding="0" cellspacing="0" align="right" style="font-size:13px;margin-top:14px;">'
        + '<tr><td style="padding:4px 0;">商品小計：</td><td style="padding:4px 0;text-align:right;">HK$' + fmtMoney(o.subtotal) + '</td></tr>'
        + '<tr><td style="padding:4px 0;">配送費：</td><td style="padding:4px 0;text-align:right;">HK$' + fmtMoney(o.deliveryFee) + '</td></tr>'
        + '<tr style="font-size:17px;font-weight:bold;"><td style="padding:6px 0;border-top:1px solid #ccc;">總計：</td><td style="padding:6px 0;border-top:1px solid #ccc;text-align:right;">HK$' + fmtMoney(o.total) + '</td></tr>'
        + '</table>'
        + (o.cardMessage ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td style="background:#FFF8E1;padding:10px 14px;border-left:4px solid #FFC107;font-size:13px;"><b>心意卡：</b>' + o.cardMessage + '</td></tr></table>' : '')
        + (o.remarks ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr><td style="background:#F0F4F8;padding:10px 14px;border-left:4px solid #8BC8EA;font-size:13px;"><b>特別事項：</b>' + o.remarks + '</td></tr></table>' : '')
        + '<p style="text-align:center;margin-top:22px;font-size:11px;color:#888;">感謝您的訂購！如有疑問請聯絡 ' + shop.name + '</p>'
        + '</td></tr>'
        + '<tr><td style="background:#F7F5F1;padding:12px 24px;font-size:11px;color:#888;text-align:center;">此郵件由 ' + shop.name + ' 自動發出</td></tr>'
        + '</table>'
        + '</td></tr></table>';
}
