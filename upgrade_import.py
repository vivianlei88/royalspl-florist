import re

with open('admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到旧的 importCSV 函数
old_pattern = r"    function importCSV\(file\) \{.*?reader\.readAsText\(file\); \}"
match = re.search(old_pattern, content, re.DOTALL)

if match:
    old_func = match.group(0)
    print(f"找到旧函数，长度: {len(old_func)}")
    
    new_func = '''    function parseCSVLine(line) {
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
            var lines = text.split(/\\r?\\n/);
            var header = parseCSVLine(lines[0]).map(function(h){ return h.trim().replace(/^\\uFEFF/, ''); });
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
    }'''
    
    content = content.replace(old_func, new_func)
    
    with open('admin.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ importCSV 函数已升级")
else:
    print("❌ 未找到旧函数")
    # 搜索 importCSV
    idx = content.find('function importCSV')
    if idx > 0:
        print(content[idx:idx+500])
