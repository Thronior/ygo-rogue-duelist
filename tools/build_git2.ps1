$ErrorActionPreference='Continue'
$rootPath=Split-Path $PSScriptRoot -Parent
Set-Location $rootPath
$vcPath='D:\Program Files\visual studio\VC\Tools\MSVC\14.44.35207'
$sdkPath="$rootPath\dependencies\sdk\microsoft.windows.sdk.cpp\c"
$libPath="$rootPath\dependencies\sdk\microsoft.windows.sdk.cpp.x86\c"
$env:PATH="$vcPath\bin\Hostx64\x86;$sdkPath\bin\10.0.26100.0\x64;"+$env:PATH
$env:INCLUDE="$vcPath\include;$sdkPath\Include\10.0.26100.0\ucrt;$sdkPath\Include\10.0.26100.0\um;$sdkPath\Include\10.0.26100.0\shared"
$env:LIB="$vcPath\lib\x86;$libPath\ucrt\x86;$libPath\um\x86"
$env:TEMP="$rootPath\temp"
$env:TMP=$env:TEMP
cmake -S dependencies/libgit2-1.8.5 -B dependencies/git2-build -G 'NMake Makefiles' -DCMAKE_STATIC_LINKER_FLAGS=/MACHINE:X86 -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTS=OFF -DBUILD_CLI=OFF -DUSE_SSH=OFF -DUSE_HTTPS=WinHTTP -DSTATIC_CRT=ON -DREGEX_BACKEND=builtin -DUSE_BUNDLED_ZLIB=ON *> git2-build.log
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmake --build dependencies/git2-build --config Release >> git2-build.log 2>&1
exit $LASTEXITCODE
