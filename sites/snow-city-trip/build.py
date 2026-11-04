from pathlib import Path
import base64
import re

project = Path(__file__).resolve().parent
workspace = project.parents[1]
assets = workspace / 'output' / 'pdf' / 'assets'
html = (project / 'page.template.html').read_text(encoding='utf-8')
images = {
    '@@SNOW_IMAGE@@': ('nozawa-winter-official.jpg', 'image/jpeg'),
    '@@CITY_IMAGE@@': ('nagoya-hisaya-official.jpg', 'image/jpeg'),
    '@@MAP_IMAGE@@': ('nagano-region-map.png', 'image/png'),
}
for placeholder, (name, mime) in images.items():
    data = base64.b64encode((assets / name).read_bytes()).decode('ascii')
    html = html.replace(placeholder, f'data:{mime};base64,{data}')
assert not re.search(r'@@[A-Z_]+@@', html)
assert all(word not in html for word in ['雪猴', '动物园', 'jigokudani', 'higashiyama.city'])
assert '<meta charset="utf-8">' in html
dist = project / 'dist'
dist.mkdir(exist_ok=True)
out = dist / 'index.html'
out.write_text(html, encoding='utf-8')
print(f'Self-contained HTML ready: {out.stat().st_size:,} bytes')
