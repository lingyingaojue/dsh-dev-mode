# 打包脚本：在项目内建 .venv，装 PyInstaller，生成 one-folder 成品。
# 用法：powershell -ExecutionPolicy Bypass -File build.ps1
$ErrorActionPreference = "Stop"
$AppName = "Jizhang"
$Root = $PSScriptRoot
Set-Location $Root

$Python = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $Python) {
    throw "没有找到 Python。请先安装 Python 3.10+（https://www.python.org/downloads/），或让开发者换一种做法。"
}
& python -c "import sys; print('python', sys.version.split()[0])" | Write-Host
if ($LASTEXITCODE -ne 0) {
    throw "python 命令不可用（可能是应用商店占位符）。请安装真正的 Python 3.10+。"
}

$Venv = Join-Path $Root ".venv"
$VenvPython = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "创建虚拟环境 .venv ..."
    & python -m venv $Venv
    if ($LASTEXITCODE -ne 0) { throw "创建 .venv 失败。" }
}

Write-Host "安装 PyInstaller ..."
& $VenvPython -m pip install --upgrade pip | Write-Host
& $VenvPython -m pip install pyinstaller | Write-Host
if ($LASTEXITCODE -ne 0) { throw "安装 PyInstaller 失败（检查网络/代理后重试）。" }

Write-Host "开始打包 ..."
& $VenvPython -m PyInstaller --noconfirm --clean --windowed --name $AppName `
    --distpath (Join-Path $Root "dist") `
    --workpath (Join-Path $Root "build") `
    --specpath (Join-Path $Root "build") `
    (Join-Path $Root "app.py")
if ($LASTEXITCODE -ne 0) { throw "PyInstaller 打包失败。" }

$Exe = Join-Path $Root "dist\$AppName\$AppName.exe"
if (-not (Test-Path $Exe)) { throw "打包结束但找不到 $Exe。" }

Copy-Item (Join-Path $Root "README.md") (Join-Path $Root "dist\$AppName\") -Force
@(
    "app=$AppName",
    "built_at=$((Get-Date).ToString('o'))",
    "exe=$Exe"
) | Set-Content -Path (Join-Path $Root "dist\$AppName\build-info.txt") -Encoding utf8

Write-Host ""
Write-Host "打包成功：$Exe"
Write-Host "把 dist\$AppName 整个文件夹复制到最终位置，再从那里双击 exe 测试。"
