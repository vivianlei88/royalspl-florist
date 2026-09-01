import re

with open(r'C:\Users\Administrator\Desktop\royalspl-florist\admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找所有 uploadedImages 出现位置
idx = 0
count = 0
while True:
    idx = content.find('uploadedImages', idx)
    if idx < 0 or count >= 10:
        break
    print(f'--- 位置 {idx} ---')
    print(content[max(0,idx-100):idx+350])
    print()
    idx += 1
    count += 1

# 找图片预览渲染
print("\n\n=== 搜索 image-preview / img-preview / 图片预览 ===")
for keyword in ['image-preview', 'img-preview', '图片预览', 'previewImages', 'imageList']:
    idx = content.find(keyword)
    if idx > 0:
        print(f'\n--- {keyword} 位置 {idx} ---')
        print(content[max(0,idx-100):idx+300])
