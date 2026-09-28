from pathlib import Path
root=Path(__file__).resolve().parents[1]
deps=root/'dependencies/installed/x86-windows-static'
for p in (root/'edopro-source/build').glob('*.vcxproj'):
    t=p.read_text()
    t=t.replace('<IncludePath>',f'<IncludePath>{deps}/include;')
    t=t.replace('<LibraryPath>',f'<LibraryPath>{deps}/lib;')
    if p.stem.startswith('ygopro'):
        libs=';'.join(str(x) for x in (deps/'lib').glob('*.lib'))
        t=t.replace('<AdditionalDependencies>',f'<AdditionalDependencies>{libs};')
        t=t.replace('<PreprocessorDefinitions>','<PreprocessorDefinitions>CURL_STATICLIB;')
    p.write_text(t)
