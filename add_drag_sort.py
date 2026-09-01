import re

with open(r'C:\Users\Administrator\Desktop\royalspl-florist\admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 在 </head> 前引入 SortableJS CDN
old_head = '</head>'
new_head = '''    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
</head>'''
if old_head in content:
    content = content.replace(old_head, new_head, 1)
    print("✅ 引入 SortableJS CDN")

# 2. 修改 renderUploadedImages 函数，添加拖拽初始化
old_render = """    function renderUploadedImages() { var c = document.getElementById('uploadedImages'); if (!c) return; var h = ''; for (var i = 0; i < uploadedImages.length; i++) { h += '<div class="uploaded-img-item"><img src="' + uploadedImages[i] + '"><button class="del-btn" onclick="removeImage(' + i + ')">×</button></div>'; } c.innerHTML = h; }"""

new_render = """    function renderUploadedImages() { var c = document.getElementById('uploadedImages'); if (!c) return; var h = ''; for (var i = 0; i < uploadedImages.length; i++) { h += '<div class="uploaded-img-item" data-index="' + i + '"><img src="' + uploadedImages[i] + '"><button class="del-btn" onclick="removeImage(' + i + ')">×</button></div>'; } c.innerHTML = h; initImageSortable(); }
    function initImageSortable() { var c = document.getElementById('uploadedImages'); if (!c || typeof Sortable === 'undefined') return; if (c._sortable) { c._sortable.destroy(); } c._sortable = Sortable.create(c, { animation: 200, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', onEnd: function(evt) { var oldIndex = evt.oldIndex; var newIndex = evt.newIndex; if (oldIndex !== newIndex) { var item = uploadedImages.splice(oldIndex, 1)[0]; uploadedImages.splice(newIndex, 0, item); renderUploadedImages(); } } }); }"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("✅ 修改 renderUploadedImages + 添加 initImageSortable")
else:
    print("❌ 未匹配 renderUploadedImages")
    # 搜索实际的函数
    idx = content.find('function renderUploadedImages')
    if idx > 0:
        print(content[idx:idx+500])

# 3. 添加拖拽样式
old_style_end = '.cover-image-preview { max-width: 150px; max-height: 100px; object-fit: cover; }'
new_style_end = """.cover-image-preview { max-width: 150px; max-height: 100px; object-fit: cover; }
        .uploaded-imgs { display: flex; flex-wrap: wrap; gap: 10px; }
        .uploaded-img-item { position: relative; cursor: move; user-select: none; transition: transform 0.2s; }
        .uploaded-img-item:hover { transform: scale(1.03); }
        .sortable-ghost { opacity: 0.4; transform: scale(0.95); }
        .sortable-chosen { cursor: grabbing; }"""

if old_style_end in content:
    content = content.replace(old_style_end, new_style_end)
    print("✅ 添加拖拽样式")
else:
    print("❌ 未匹配样式位置")

with open(r'C:\Users\Administrator\Desktop\royalspl-florist\admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ 修改完成")
