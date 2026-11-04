# shuaqi

这个仓库目前包含三部分内容：

1. **双人旅行手账 App 的产品设计文档**：需求、方案和分阶段计划。
2. **照片共享验证版 demo**：两人登录同一个旅行本，上传照片并补充备注、地点和标签。已在局域网用两部真机测试通过，还没有部署到云端。
3. **一次日本冬季旅行（名古屋 × 长野）的行程资料**：一份 PDF 和一个单文件网页，均由 Python 脚本生成。

## 目录

| 路径 | 内容 |
| --- | --- |
| [docs/travel-journal-blueprint-v0.2.md](docs/travel-journal-blueprint-v0.2.md) | 当前版本的产品与开发蓝图：功能范围、权限、记账与 AA 规则、架构、分阶段计划 |
| [docs/travel-journal-blueprint-v0.1.md](docs/travel-journal-blueprint-v0.1.md) | 上一版蓝图，已被 v0.2 取代，保留作对照 |
| [docs/pwa-photo-sharing-mvp-v0.1.md](docs/pwa-photo-sharing-mvp-v0.1.md) | 第一个验证版本（PWA 照片共享）的功能和两部真机的验收步骤 |
| [apps/photo-share-demo/](apps/photo-share-demo/) | 照片共享 demo：React + Vite 前端，Node 标准库后端 |
| [output/pdf/](output/pdf/) | 旅行计划 PDF、生成脚本和图片素材 |
| [sites/snow-city-trip/](sites/snow-city-trip/) | 旅行计划网页：模板、生成脚本和生成结果 `dist/index.html` |
| [tmp/](tmp/) | 预览截图和原型的中间文件，可以忽略 |

## 产品文档阅读顺序

先读 [蓝图 v0.2](docs/travel-journal-blueprint-v0.2.md) 了解整体方向。已确认的事项：两人使用（小米 15 + iPhone），以 PWA 网页 App 运行，数据存在云端，v1 包含手账、行程、记账和 AA。

再读 [PWA 照片共享验证版](docs/pwa-photo-sharing-mvp-v0.1.md)：两台手机各自登录同一个旅行本，上传照片并补充备注、地点和标签，在另一端看到更新。

文档中标为“建议”的部分还没有定稿。

## 运行照片共享 demo

需要 Node.js 22.18 或更高版本（服务端直接运行 `.ts` 文件）。

```sh
cd apps/photo-share-demo
npm install
npm run build   # 构建前端，改了前端代码后要重新运行
npm start       # 启动服务，默认端口 8787
```

- 终端会打印本机地址、局域网地址和邀请码。电脑打开 `http://localhost:8787`，同一 Wi-Fi 下的手机打开局域网地址。
- 第一次进入：填昵称，自己设 4–8 位数字 PIN，再填邀请码。以后只填昵称和 PIN。一个旅行本最多两人。
- 数据保存在 `apps/photo-share-demo/data/`：`db.json` 存成员、备注、地点和标签，`photos/` 存照片。这个目录不进 git，删掉它就是清空旅行本，邀请码也会重新生成。
- 开发时可以分开运行：`npm run server` 启动后端，`npm run dev` 启动 Vite（端口 5173，`/api` 转发到 8787）。
- 局域网地址是 http，iPhone 上"添加到桌面"不完整；电脑关机后手机也无法访问。这两点要部署到 HTTPS 云端才能解决。

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
