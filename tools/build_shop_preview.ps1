$ErrorActionPreference='Stop'
$rootPath=Split-Path $PSScriptRoot -Parent
Set-Location $rootPath
$vcPath='D:\Program Files\visual studio\VC\Tools\MSVC\14.44.35207'
$sdkPath="$rootPath\dependencies\sdk\microsoft.windows.sdk.cpp\c"
$libPath="$rootPath\dependencies\sdk\microsoft.windows.sdk.cpp.x86\c"
$env:PATH="$vcPath\bin\Hostx64\x86;"+$env:PATH
$env:INCLUDE="$vcPath\include;$sdkPath\Include\10.0.26100.0\ucrt;$sdkPath\Include\10.0.26100.0\um;$sdkPath\Include\10.0.26100.0\shared"
$env:LIB="$vcPath\lib\x86;$libPath\ucrt\x86;$libPath\um\x86"
$env:TEMP="$rootPath\temp"; $env:TMP=$env:TEMP
cl /nologo /EHsc /MT /std:c++17 temp/shop_launcher.cpp /Fotemp/shop_launcher.obj '/FeShop Preview.exe' /link /SUBSYSTEM:WINDOWS user32.lib
exit $LASTEXITCODE
