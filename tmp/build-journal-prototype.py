from pathlib import Path
import base64
import re

workspace = Path(r'C:\Users\35552\Desktop\trae projects\shuaqi')
fragment = Path(r'C:\Users\35552\.codex\visualizations\2026\10\30\01a18c01-7556-7382-ba00-cc0ff55db1b0\travel-journal-prototype.html')
text = fragment.read_text(encoding='utf-8')
for placeholder, name in [
    ('@@CITY_IMAGE@@', 'nagoya-hisaya-official.jpg'),
    ('@@SNOW_IMAGE@@', 'nozawa-winter-official.jpg'),
]:
    image = (workspace / 'output/pdf/assets' / name).read_bytes()
    text = text.replace(placeholder, 'data:image/jpeg;base64,' + base64.b64encode(image).decode('ascii'))
assert '@@' not in text
assert len(text.encode('utf-8')) < 1024 * 1024
assert not any(tag in text.lower() for tag in ['<!doctype', '<html', '<head>', '<body'])
fragment.write_text(text, encoding='utf-8')
script = re.search(r'<script>([\s\S]*?)</script>', text).group(1)
(workspace / 'tmp/journal-prototype-script.js').write_text(script, encoding='utf-8')
print(f'Prototype ready: {len(text.encode("utf-8")):,} bytes')
