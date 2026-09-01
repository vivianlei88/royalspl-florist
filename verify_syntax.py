import re, subprocess

with open(r'C:\Users\Administrator\Desktop\royalspl-florist\admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
errors = 0
for i, script in enumerate(scripts):
    if not script.strip():
        continue
    with open(f'C:\\Users\\Administrator\\Desktop\\royalspl-florist\\tmp_s_{i}.js', 'w', encoding='utf-8') as f:
        f.write(script)
    r = subprocess.run(['node', '--check', f'C:\\Users\\Administrator\\Desktop\\royalspl-florist\\tmp_s_{i}.js'], capture_output=True, text=True)
    if r.returncode != 0:
        errors += 1
        print(f'❌ script_{i}:', r.stderr[:200])

# 清理临时文件
import os
for i in range(20):
    p = f'C:\\Users\\Administrator\\Desktop\\royalspl-florist\\tmp_s_{i}.js'
    if os.path.exists(p):
        os.remove(p)

print(f'总错误: {errors}')
