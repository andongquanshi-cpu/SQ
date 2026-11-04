# shuaqi

这个仓库目前包含两部分内容：

1. **双人旅行手账 App 的产品设计文档**：只有需求和方案，还没有任何应用代码，也没有开通云服务。
2. **一次日本冬季旅行（名古屋 × 长野）的行程资料**：一份 PDF 和一个单文件网页，均由 Python 脚本生成。

## 目录

| 路径 | 内容 |
| --- | --- |
| [docs/travel-journal-blueprint-v0.2.md](docs/travel-journal-blueprint-v0.2.md) | 当前版本的产品与开发蓝图：功能范围、权限、记账与 AA 规则、架构、分阶段计划 |
| [docs/travel-journal-blueprint-v0.1.md](docs/travel-journal-blueprint-v0.1.md) | 上一版蓝图，已被 v0.2 取代，保留作对照 |
| [docs/pwa-photo-sharing-mvp-v0.1.md](docs/pwa-photo-sharing-mvp-v0.1.md) | 第一个验证版本（PWA 照片共享）的功能和两部真机的验收步骤 |
| [output/pdf/](output/pdf/) | 旅行计划 PDF、生成脚本和图片素材 |
| [sites/snow-city-trip/](sites/snow-city-trip/) | 旅行计划网页：模板、生成脚本和生成结果 `dist/index.html` |
| [tmp/](tmp/) | 预览截图和原型的中间文件，可以忽略 |

## 产品文档阅读顺序

先读 [蓝图 v0.2](docs/travel-journal-blueprint-v0.2.md) 了解整体方向。已确认的事项：两人使用（小米 15 + iPhone），以 PWA 网页 App 运行，数据存在云端，v1 包含手账、行程、记账和 AA。

再读 [PWA 照片共享验证版](docs/pwa-photo-sharing-mvp-v0.1.md)，这是下一步要做的内容：两台手机各自登录同一个旅行本，上传照片并补充备注、地点和标签，在另一端看到更新。

文档中标为“建议”的部分还没有定稿。

## 生成旅行资料

需要 Python 3。

### PDF

```sh
pip install reportlab
python output/pdf/build_snow_trip.py
```

- 输出 `output/pdf/日本雪国旅行计划-名古屋与长野.pdf`。
- 脚本使用 Windows 自带的微软雅黑字体（`C:\Windows\Fonts\msyh.ttc`、`msyhbd.ttc`），在其他系统上需要改字体路径。
- 如果缺少 `assets/nozawa-winter-official.jpg`，脚本会从野泽温泉观光协会网站下载。
- `assets/nagano-region-map.png` 需要提前截好放进去，缺少时脚本报错退出。

### 网页

```sh
python sites/snow-city-trip/build.py
```

- 读取 `page.template.html`，把 `output/pdf/assets/` 下的三张图片以 base64 嵌入，生成单个文件 `sites/snow-city-trip/dist/index.html`，不依赖外部图片，可以直接用浏览器打开或发给别人。
- 只需要标准库。网页的图片来自 PDF 的素材目录，所以要保留 `output/pdf/assets/`。
- 脚本会检查是否残留未替换的占位符，以及页面中是否还出现已从行程删除的雪猴、东山动物园相关内容。
- 修改网页内容时改 `page.template.html`，不要直接改 `dist/index.html`，它会在下次生成时被覆盖。

## 注意

- PDF 里仍保留雪猴一日作为可选项，网页版已经去掉。两份资料不完全一致。
- 行程里的票价、时刻和开放日期来自各官方网站链接，出发前需要重新核对。
- `tmp/build-journal-prototype.py` 写死了本机路径，只在原作者电脑上能运行。
