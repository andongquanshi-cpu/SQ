# 在你自己的 Windows 电脑上运行：构建前端，把运行需要的文件传到服务器，再重启服务。
#   powershell -ExecutionPolicy Bypass -File deploy\upload.ps1 -Server ubuntu@你的服务器IP
# 服务器上不需要 npm install：后端只用 Node 标准库，前端已在本机构建好。
# 照片和数据库在服务器的 /var/lib/photo-share，这个脚本不会碰它们。
param(
  [Parameter(Mandatory = $true)][string]$Server
)
$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$Archive = Join-Path $env:TEMP 'photo-share-release.tgz'

Push-Location $AppDir
try {
  Write-Host '== 构建前端'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw '构建失败' }

  Write-Host '== 打包'
  if (Test-Path $Archive) { Remove-Item $Archive }
  tar -czf $Archive dist server shared package.json
  if ($LASTEXITCODE -ne 0) { throw '打包失败' }
}
finally {
  Pop-Location
}

Write-Host "== 上传到 $Server"
scp $Archive "${Server}:/tmp/photo-share-release.tgz"
if ($LASTEXITCODE -ne 0) { throw '上传失败' }

Write-Host '== 替换代码并重启服务'
# 先解压到新目录，再整体替换；上一版保留在 app.old，出问题可以手动换回去。
$remote = 'set -e; cd /opt/photo-share; sudo rm -rf app.new; sudo mkdir app.new; ' +
  'sudo tar -xzf /tmp/photo-share-release.tgz -C app.new; ' +
  'sudo rm -rf app.old; if [ -d app ]; then sudo mv app app.old; fi; sudo mv app.new app; ' +
  'rm -f /tmp/photo-share-release.tgz; sudo systemctl restart photo-share; sleep 2; ' +
  'sudo systemctl --no-pager --lines=8 status photo-share'
ssh $Server $remote
if ($LASTEXITCODE -ne 0) { throw '服务器上的步骤失败，看上面的输出' }

Remove-Item $Archive
Write-Host '== 完成。邀请码在上面日志里的“邀请码:”一行。'
