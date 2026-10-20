param([switch]$Check)
$ErrorActionPreference='Stop'
$candidates=@()
$command=Get-Command node.exe -ErrorAction SilentlyContinue
if($command){$candidates+=$command.Source}
$miseRoot=Join-Path $env:LOCALAPPDATA 'mise/installs/node'
if(Test-Path -LiteralPath $miseRoot){$candidates+=Get-ChildItem -LiteralPath $miseRoot -Directory|Sort-Object Name -Descending|ForEach-Object{Join-Path $_.FullName 'node.exe'}}
$nodeRuntime=$null
foreach($candidate in ($candidates|Select-Object -Unique)){
 if(!(Test-Path -LiteralPath $candidate)){continue}
 try{$version=& $candidate --version 2>$null;if($LASTEXITCODE-eq 0 -and $version-match '^v(\d+)' -and [int]$Matches[1]-ge 22){$nodeRuntime=$candidate;break}}catch{}
}
if(!$nodeRuntime){throw 'Node.js 22 or newer is required for publishing.'}
$mode=if($Check){'--check'}else{'--upload'}
& $nodeRuntime (Join-Path $PSScriptRoot 'upload-release.mjs') $mode
if($LASTEXITCODE-ne 0){throw 'Release preparation or upload failed. Review the message above.'}
