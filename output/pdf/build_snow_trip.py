from pathlib import Path
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether,
)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output' / 'pdf'
ASSETS = OUT / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)
PDF = OUT / '日本雪国旅行计划-名古屋与长野.pdf'

pdfmetrics.registerFont(TTFont('YaHei', r'C:\Windows\Fonts\msyh.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('YaHeiBold', r'C:\Windows\Fonts\msyhbd.ttc', subfontIndex=0))
pdfmetrics.registerFontFamily('YaHei', normal='YaHei', bold='YaHeiBold', italic='YaHei', boldItalic='YaHeiBold')

INK = colors.HexColor('#213A3F')
ACCENT = colors.HexColor('#2B645E')
MUTED = colors.HexColor('#5B6E73')
PALE = colors.HexColor('#F0F5F3')
LINE = colors.HexColor('#D6E1DC')

styles = {
    'title': ParagraphStyle('title', fontName='YaHeiBold', fontSize=23, leading=31, textColor=INK, wordWrap='CJK'),
    'sub': ParagraphStyle('sub', fontName='YaHei', fontSize=10, leading=16, textColor=MUTED, wordWrap='CJK'),
    'h': ParagraphStyle('h', fontName='YaHeiBold', fontSize=14, leading=22, spaceBefore=10, spaceAfter=7, textColor=INK, wordWrap='CJK'),
    'body': ParagraphStyle('body', fontName='YaHei', fontSize=10.3, leading=17, spaceAfter=6, textColor=INK, wordWrap='CJK'),
    'small': ParagraphStyle('small', fontName='YaHei', fontSize=8.5, leading=13, spaceAfter=5, textColor=MUTED, wordWrap='CJK'),
    'cell': ParagraphStyle('cell', fontName='YaHei', fontSize=9.4, leading=15, textColor=INK, wordWrap='CJK'),
    'th': ParagraphStyle('th', fontName='YaHeiBold', fontSize=9.3, leading=15, textColor=INK, wordWrap='CJK'),
    'num': ParagraphStyle('num', fontName='YaHeiBold', fontSize=19, leading=29, textColor=ACCENT, wordWrap='CJK'),
}

def p(text, kind='body'):
    return Paragraph(text, styles[kind])

def table(rows, widths, header=True):
    processed = [[p(str(c).replace('\n', '<br/>'), 'th' if header and i == 0 else 'cell') for c in row] for i, row in enumerate(rows)]
    t = Table(processed, colWidths=widths, hAlign='LEFT', repeatRows=1 if header else 0)
    rules = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, 0), (-1, 0), .7, LINE),
        ('LINEBELOW', (0, 1), (-1, -1), .4, LINE),
    ]
    if header:
        rules.append(('BACKGROUND', (0, 0), (-1, 0), PALE))
    t.setStyle(TableStyle(rules))
    return t

photo = ASSETS / 'nozawa-winter-official.jpg'
if not photo.exists():
    req = Request('https://nozawakanko.jp/wp/wp-content/uploads/2025/02/R3X_0416-900x600.jpg', headers={'User-Agent': 'Mozilla/5.0'})
    with urlopen(req, timeout=25) as r:
        photo.write_bytes(r.read())

doc = SimpleDocTemplate(
    str(PDF), pagesize=A4, rightMargin=42, leftMargin=42,
    topMargin=39, bottomMargin=43,
    title='日本雪国旅行计划：名古屋与长野', author='旅行规划',
)
W = A4[0] - 84
story = []

# Page 1: one readable route, with a genuine seasonal photograph.
intro = [
    p('名古屋 × 长野', 'title'),
    Spacer(1, 6),
    p('本州厚雪、动物与城市\u3000|\u30002人省钱版', 'sub'),
    p('2027.01.06 - 01.14\u3000|\u30009天8晚', 'sub'),
    p('只住两个地区，换两次住宿。<br/>名古屋负责城市；长野作看雪与雪猴的基地。', 'body'),
]
hero = Table([[intro, Image(str(photo), width=180, height=120)]], colWidths=[W-190, 190])
hero.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING',(0,0),(-1,-1),0), ('RIGHTPADDING',(0,0),(-1,-1),0)]))
story += [hero, p('右图：野泽温泉观光局冬季照片，非2027年1月实时雪况。', 'small')]
story += [p('路线安排', 'h')]
story += [table([
    ['日期 / 住宿', '当天怎么玩', '移动强度'],
    ['1/6 周三\n名古屋', '抵达中部机场，名铁进城；入住、吃饭休息。去程落地时间待补，不接长途。', '机场进城'],
    ['1/7 周四\n名古屋', '大须商店街、荣和久屋大通。集中市区散步，体验城市夜景。', '市内地铁'],
    ['1/8 周五\n长野', '乘特急 Shinano 直达长野；安顿酒店，下午轻松吃饭散步。', '铁路约3小时'],
    ['1/9 周六\n长野', '地狱谷雪猴单独留一天。树林步道与野生猕猴，是动物重点。', '巴士 + 徒步'],
    ['1/10 周日\n长野', '野泽温泉雪镇候选日：看雪中的温泉街、吃午饭、按开放情况到日影区域。', '单程约1.5-2小时'],
    ['1/11 周一\n长野', '善光寺、门前町与长野市内慢逛；也可与前两日对调，留给天气调整。', '市内活动'],
    ['1/12 周二\n名古屋', '白天乘特急回名古屋，同一酒店连住两晚。下午自由活动。', '铁路约3小时'],
    ['1/13 周三\n名古屋', '上午去东山动植物园，下午按兴趣继续园区。晚饭后整理行李，保留返程缓冲。', '市内地铁'],
    ['1/14 周四\n返程', '建议约11:00从名古屋站去机场，12:00前后抵达；15:25飞香港。', '机场出境'],
], [85, W-181, 96])]
story += [Spacer(1, 9), p('<b>住宿合计：</b>名古屋2晚 + 长野4晚 + 名古屋2晚。两次跨地区移动各留半天；两次雪区日游不排在同一天。', 'body')]
story += [p('<b>我的判断：</b>这版能同时满足城市、雪镇与动物，但长野市不是东京式大都市，酒店外也不保证厚雪。真正的雪景重点在北部山地。', 'small')]
story += [p('1/9-11是日本成人日连休，雪区日游尽量早出发；房价与新季接驳公布后优先核对。', 'small')]
story += [PageBreak()]

# Page 2: honest cost model and transport choices.
story += [p('钱花在哪里', 'title'), Spacer(1, 6)]
story += [p('人民币估算统一按 100 日元 ≈ 5 元；不是实时汇率或已成交报价。', 'sub')]
story += [p('约 4,200 - 5,300 元 / 人', 'num')]
story += [p('两人约8,400 - 10,600元。含当地吃住行与所列项目；不含已买国际机票、签证保险、购物及另购防寒装备。', 'body')]
story += [table([
    ['项目', '每人预算（人民币）', '计算口径'],
    ['住宿8晚', '1,500 - 2,000', '整间双人入住总价375-500元/晚，8晚两人均摊。是含税筛选目标，双床与实际房价待核。'],
    ['餐饮9天', '900 - 1,200', '平均100-133元/人/天；普通餐馆、定食、便利店搭配。'],
    ['铁路、机场及市内交通', '1,000 - 1,200', 'Shinano往返先留约15,000日元；名铁机场往返、地铁及市内交通另计入此栏。'],
    ['雪猴一日', '340', '新季官方巴士往返套票6,800日元，已含一次入园；不重复加门票。'],
    ['野泽温泉日游交通', '150', '留3,000日元/人；普通铁路+巴士估算，2026-27冬季接驳班次、票价待核。不含泡汤和缆车。'],
    ['东山动植物园', '40', '现行成人800日元。1/12休园，安排1/13。'],
    ['机动与其他小额支出', '200 - 300', '小额门票、寄存、临时调整等；不将它视为购物预算。'],
], [103, 113, W-216])]
story += [p('怎么坐车更合理', 'h')]
story += [p('<b>名古屋 - 长野：</b>特急Shinano直达，约3小时。往返先按15,000日元做预算，具体车次与票价出票前核对。当前直达长野的高速巴士全线停运，不拿旧攻略的廉价巴士当方案。', 'body')]
story += [p('<b>长野 - 野泽温泉：</b>普通铁路到饭山站，再转Liner；现价参考为(610+600)×2=2,420日元。含等车，单程按1.5-2小时规划；部分铁路组合需换乘。不要坐到名称相似的“户狩野泽温泉站”。', 'body')]
story += [p('<b>雪猴：</b>使用新季专用急行巴士套票，乘车按排队顺序，不保证某一班座位。今冬志贺高原急行不再停猴园，不能混坐。下车后还要走约35分钟单程的山林步道。', 'body')]
story += [p('住宿与预算底线', 'h')]
story += [p('长野住车站步行范围的普通商务酒店；名古屋也优先车站附近。两人是否必须双床、税费和取消条件一起比。若报价超目标，先调整付费项目，不用远郊低价房换每天通勤。', 'body')]
story += [p('<b>这版并不天然比北海道便宜。</b>它省国内航班，但铁路和山地交通仍是大项。若总预算硬卡人均3,500元，建议删雪猴日（约省340元/人），或另选高山/白川乡+名古屋动物园的更省路线。', 'small')]
story += [PageBreak()]

# Page 3: real map, limitations and directly useful references.
story += [p('位置、雪况与核验', 'title'), Spacer(1, 8)]
map_file = ASSETS / 'nagano-region-map.png'
if not map_file.exists():
    raise FileNotFoundError('Capture the actual map before generating the PDF.')
story += [Image(str(map_file), width=W, height=W*720/1280)]
story += [p('Google Maps 北部长野位置图：长野市在下方；饭山、野泽温泉在北侧；雪猴位于山之内方向。地图只用于看位置，天气栏不是出行日期预报。', 'small')]
story += [p('哪些期待需要校准', 'h')]
story += [p('“雪窝”未查到可唯一对应的固定景点名，网上常用它形容日本海侧的豪雪地区。本方案按你的厚雪需求选择北部长野，不把这个俗称当成某个已确认目的地。', 'body')]
story += [p('野泽是冬季雪镇；雪厚度仍受当季降雪影响。若临近出发雪况不足或接驳不顺，再把同一天替换为志贺高原山之站：新季直达急行往返6,000日元/人，比本预算多约150元/人；不额外加一天或住一晚。', 'body')]
story += [p('雪猴是野生动物，不保证当天出现或泡温泉；网友评价也存在“去了但没有网红画面”的反馈。因此把雪镇、雪猴和动物园分开安排。带防滑防水鞋，购买雪猴票前查看官网动物与步道状态。', 'body')]
story += [p('饭山雪屋村2027年1月22日才开始，赶不上你们的日期。不要用它的雪屋火锅照片作为这次行程的承诺。', 'body')]
story += [p('官方来源与游客体验（可点击）', 'h')]
sources = [
    ('长野市：名古屋乘特急约3小时', 'https://www.city.nagano.nagano.jp/n042000/contents/p004106.html'),
    ('名铁巴士：长野线停运说明', 'https://www.meitetsu-bus.co.jp/express/matsumoto_nagano/'),
    ('长电巴士：2026-27雪猴套票、购票与乘车规则', 'https://www.nagadenbus.co.jp/ticket-otoku/2022/01/snow-monkey-pass-for-busonline-ticket.php'),
    ('猴园：步道交通与动物状态', 'https://jigokudani-yaenkoen.co.jp/access/'),
    ('野泽观光局：非滑雪冬季散步；Liner运营方', 'https://nozawakanko.jp/course/course-918/'),
    ('野泽Liner：现价与时刻更新', 'https://nozawaonsen.info/nozawa-onsen-liner/'),
    ('东山：800日元门票及2027年休园日', 'https://www.higashiyama.city.nagoya.jp/01_annai/01_01kaien/'),
    ('志贺：2026-27急行巴士时刻与票价', 'https://www.shigakogen.gr.jp/manage/wp-content/uploads/2026/11/26-27-EXP_Timetables.pdf'),
    ('饭山观光局：雪屋村2027年1月22日开幕', 'https://www.iiyama-ouendan.net/2026/09/20615/'),
    ('游客评价样本：雪猴体验有好评也有落差，不能代表整体', 'https://www.tripadvisor.com/Attraction_Review-g1117904-d324924-Reviews-or10-Jigokudani_Snow_Monkey_Park-Yamanouchi_machi_Shimotakai_gun_Nagano_Prefectur.html'),
]
for i, (label, url) in enumerate(sources, 1):
    story += [p(f'{i:02d}  <link href="{escape(url, {chr(34): "&quot;"})}" color="#2B645E">{escape(label)}</link>', 'small')]

def footer(c, d):
    c.saveState()
    c.setStrokeColor(LINE)
    c.line(42, 32, A4[0]-42, 32)
    c.setFillColor(MUTED)
    c.setFont('YaHei', 8)
    c.drawString(42, 19, '资料核对：2026.11.02 | 规划预算，非已订行程 | 正式预订前核验余票、房价和冬季接驳')
    c.drawRightString(A4[0]-42, 19, str(d.page))
    c.restoreState()

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(PDF)
