param([Parameter(Mandatory=$true)][string]$CharacterId)
$ErrorActionPreference = 'Stop'
$artDir = Join-Path (Get-Location) "artwork/creative-town/characters/$CharacterId/draft-v1"
$magick = 'C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe'
$master = Join-Path $artDir 'master.png'
& $magick $master -resize '512x512>' -quality 82 (Join-Path $artDir 'character-512.webp')
if ($LASTEXITCODE) { throw 'Compression failed' }
& $magick $master -resize '480x480>' -background '#f1e8db' -alpha remove -alpha off -gravity center -extent 512x512 (Join-Path $artDir 'preview-light.jpg')
& $magick $master -resize '480x480>' -background '#27313a' -alpha remove -alpha off -gravity center -extent 512x512 (Join-Path $artDir 'preview-dark.jpg')
& $magick $master -resize '64x64>' -background '#f1e8db' -alpha remove -alpha off -gravity center -extent 96x96 (Join-Path $artDir 'preview-64.png')
& $magick montage (Join-Path $artDir 'preview-light.jpg') (Join-Path $artDir 'preview-dark.jpg') (Join-Path $artDir 'preview-64.png') -tile 3x1 -geometry +8+8 -background '#b7c1c5' (Join-Path $artDir 'review-sheet.jpg')
$dimensions = & $magick identify -format '%wx%h' $master
$alphaRange = & $magick $master -alpha extract -format '%[min],%[max],%[mean]' info:
$bounds = & $magick $master -alpha extract -threshold '1%' -format '%@' info:
$files = Get-ChildItem -LiteralPath $artDir -File | Where-Object Name -ne 'qa.json' | ForEach-Object { [ordered]@{path=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()} }
[ordered]@{dimensions=$dimensions;alphaMinMaxMean=$alphaRange;alphaBoundsAtOnePercent=$bounds;files=@($files);approval='draft awaiting James review';checks='Inspect review-sheet.jpg and original; numeric alpha checks do not establish aesthetic approval.'} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $artDir 'qa.json') -Encoding utf8
