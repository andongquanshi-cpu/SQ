# 部署到云服务器

目标：拿到一个 `https://你的域名` 地址，电脑关机后两部手机照样能用，iPhone 可以正常添加到桌面。

整体结构：一台 Ubuntu 云服务器上，Caddy 负责 HTTPS 证书并把请求转给本机 8787 端口的 Node 服务。照片和数据库存在服务器的 `/var/lib/photo-share`，和代码分开放，更新代码不会动到数据。

## 1. 你需要准备的（要本人注册和付款）

1. **一台云服务器**
   - 地域选**香港**或**日本（东京）**。这两个地方的服务器绑定域名不需要备案；中国大陆的服务器需要备案，要花几周。
   - 系统选 **Ubuntu 22.04 或 24.04**。
   - 配置选最低档就够了，比如 2 核 2G、40G 硬盘。两个人用，几千张压缩后的照片大约占几个 G。
   - 腾讯云轻量应用服务器、阿里云轻量应用服务器都可以，价格以官网为准。
2. **一个域名**
   - 在买服务器的同一家云平台买最省事，`.com`、`.top` 之类都行，一年几十元。
   - 买好后添加一条 **A 记录**：主机记录填 `trip`（或者你喜欢的前缀），记录值填服务器的公网 IP。之后的地址就是 `https://trip.你的域名`。
3. **在云控制台的防火墙里放行 80 和 443 端口**。22 端口（SSH）一般默认已经开了。Caddy 申请 HTTPS 证书要用到 80 端口。

准备好后，把**服务器公网 IP、登录用户名（腾讯云 Ubuntu 一般是 `ubuntu`）和域名**告诉我。登录密码或密钥不要发给我。

## 2. 初始化服务器（只做一次）

在你的 Windows 电脑上打开 PowerShell，进入本目录：

```powershell
cd "C:\Users\35552\Desktop\trae projects\shuaqi\apps\photo-share-demo"
```

把初始化脚本传到服务器，再登录上去运行：

```powershell
scp deploy\server-setup.sh ubuntu@服务器IP:/tmp/
ssh ubuntu@服务器IP
```

登录进服务器后运行：

```sh
sudo bash /tmp/server-setup.sh trip.你的域名
exit
```

脚本会安装 Node.js 24 和 Caddy，创建服务和 HTTPS 配置，大约需要几分钟。

## 3. 上传代码并启动

回到你电脑的 PowerShell，还是在本目录下运行：

```powershell
powershell -ExecutionPolicy Bypass -File deploy\upload.ps1 -Server ubuntu@服务器IP
```

脚本会在本机构建前端，把代码打包传上去，替换旧版本，再重启服务。最后会打印服务日志，里面有一行 **邀请码**。

以后改了代码，只需要重新运行这一条命令。上一版代码会留在服务器的 `/opt/photo-share/app.old`。

## 4. 验收

1. 手机浏览器打开 `https://trip.你的域名`，两人分别用昵称、PIN 和邀请码加入。
2. iPhone 用 Safari 打开，点分享按钮，选"添加到主屏幕"。小米用实际使用的浏览器，在菜单里找"添加到桌面"或"安装应用"。
3. 按 [验收步骤](../../../docs/pwa-photo-sharing-mvp-v0.1.md) 再走一遍。重点做第 5 步：**把你的电脑关机**，两部手机重新打开，照片和备注应该都还在。

## 常用操作

以下命令在 SSH 登录服务器后运行。

| 要做什么 | 命令 |
| --- | --- |
| 看服务状态和邀请码 | `sudo systemctl status photo-share` |
| 看最近的日志 | `sudo journalctl -u photo-share -n 100` |
| 重启服务 | `sudo systemctl restart photo-share` |
| 备份照片和数据库到当前目录 | `sudo tar -czf ~/trip-backup-$(date +%F).tgz -C /var/lib photo-share` |
| 回退到上一版代码 | `cd /opt/photo-share && sudo mv app app.bad && sudo mv app.old app && sudo systemctl restart photo-share` |

备份文件可以在你的电脑上用 `scp ubuntu@服务器IP:~/trip-backup-日期.tgz .` 下载下来。服务器硬盘坏了或者误删，照片只能靠这个找回，旅行期间建议隔几天下载一次。

## 打不开的时候

- **浏览器提示连接失败**：在电脑上运行 `ping trip.你的域名`，看显示的 IP 是不是服务器的。刚加的 A 记录可能要几分钟到半小时才生效。
- **提示证书错误，或者一直在加载**：检查云控制台防火墙有没有放行 80 和 443。然后在服务器上运行 `sudo journalctl -u caddy -n 50`，看证书申请是否失败。
- **显示"前端还没构建"**：重新运行第 3 步的上传命令。
- **服务一直重启**：运行 `sudo journalctl -u photo-share -n 50` 看报错，把输出发给我。
