$rootPath=Split-Path $PSScriptRoot -Parent
Set-Location $rootPath
$vcPath='D:\Program Files\visual studio\VC\Tools\MSVC\14.44.35207'
$sdkPath="$rootPath\dependencies\sdk\microsoft.windows.sdk.cpp\c"
$libPath="$rootPath\dependencies\sdk\microsoft.windows.sdk.cpp.x86\c"
$env:PATH="$vcPath\bin\Hostx64\x86;$sdkPath\bin\10.0.26100.0\x64;"+$env:PATH
$env:INCLUDE="$vcPath\include;$sdkPath\Include\10.0.26100.0\ucrt;$sdkPath\Include\10.0.26100.0\um;$sdkPath\Include\10.0.26100.0\shared;$rootPath\dependencies\installed\x86-windows-static\include;$rootPath\edopro-source\ocgcore"
$env:LIB="$vcPath\lib\x86;$libPath\ucrt\x86;$libPath\um\x86"
$env:TEMP="$rootPath\temp"; $env:TMP=$env:TEMP
cl /nologo /EHsc /MT /std:c++17 tools/retry_replay_check.cpp /Fotemp/retry_replay_check.obj /Feruntime/retry_replay_check.exe edopro-source/bin/release/ocgcore.lib edopro-source/bin/release/lua.lib /link /LTCG
exit $LASTEXITCODE
