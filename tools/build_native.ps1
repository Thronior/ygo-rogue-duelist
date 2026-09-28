$ErrorActionPreference = 'Stop'
$rootPath = Split-Path $PSScriptRoot -Parent
Set-Location "$rootPath\edopro-source"
$env:TEMP = "$rootPath\temp"
$env:TMP = $env:TEMP
& "$rootPath\tools\premake5.exe" --no-direct3d --sound=miniaudio --architecture=x86 --vcpkg-root='../dependencies' --vcpkg-triplet=-windows-static vs2022
Set-Location $rootPath
python -B tools/patch_native.py
python -B tools/build_dependencies.py
& 'D:\Program Files\visual studio\MSBuild\Current\Bin\MSBuild.exe' edopro-source/build/ygo.sln /t:ygopro /p:Configuration=Release /p:Platform=Win32 /m:1 /nr:false /v:minimal /nologo *> build.log
exit $LASTEXITCODE
