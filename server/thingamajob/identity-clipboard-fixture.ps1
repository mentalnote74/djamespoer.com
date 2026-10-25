param([switch]$Invalid)
$ErrorActionPreference = 'Stop'
$pipeName = 'thingamajob-clipboard-fixture-' + [guid]::NewGuid().ToString('N')
$security = [IO.Pipes.PipeSecurity]::new()
$security.SetAccessRuleProtection($true, $false)
$security.AddAccessRule([IO.Pipes.PipeAccessRule]::new([Security.Principal.WindowsIdentity]::GetCurrent().User, [IO.Pipes.PipeAccessRights]::FullControl, [Security.AccessControl.AccessControlType]::Allow))
$server = [IO.Pipes.NamedPipeServerStream]::new($pipeName, [IO.Pipes.PipeDirection]::In, 1, [IO.Pipes.PipeTransmissionMode]::Byte, [IO.Pipes.PipeOptions]::None, 0, 0, $security)
# Mock only clipboard operations in the test copy; never access the real clipboard.
$sender = @'
$env:THINGAMAJOB_TEST_AUD = 'fictional'
$env:THINGAMAJOB_TEST_ISSUER = 'fictional'
$global:cleared = $false
function Get-Clipboard { param([switch]$Raw) return '__FIXTURE__' }
function Set-Clipboard {
  param([string]$Value)
  if ($PSBoundParameters.ContainsKey('Value')) { throw 'Unsupported empty-value cleanup detected' }
  $global:cleared = $true
}
$source = [IO.File]::ReadAllText('__SCRIPT__')
if (-not $source.Contains('[System.Windows.Forms.Clipboard]::Clear()')) { throw 'Expected cleanup call missing' }
# Replace the OS effect only, in memory. Production source remains unchanged.
$source = $source.Replace('Add-Type -AssemblyName System.Windows.Forms', '').Replace('[System.Windows.Forms.Clipboard]::Clear()', 'Set-Clipboard')
try { & ([scriptblock]::Create($source)) -PipeName '__PIPE__' } catch { Write-Output 'Synthetic sender rejected before connection.' }
Write-Output ('CLIPBOARD_CLEARED=' + $global:cleared)
'@
$sender = $sender.Replace('__FIXTURE__', $(if ($Invalid) { 'aaa bbb.ccc' } else { 'aaa.bbb.ccc' })).Replace('__PIPE__', $pipeName).Replace('__SCRIPT__', (Join-Path $PSScriptRoot 'identity-handoff.ps1').Replace("'", "''"))
$info = [Diagnostics.ProcessStartInfo]::new()
$info.FileName = 'powershell.exe'
$info.Arguments = '-NoProfile -EncodedCommand ' + [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($sender))
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$child = [Diagnostics.Process]::new()
$child.StartInfo = $info
$received = $null
$connected = $false
try {
  $connection = $server.WaitForConnectionAsync()
  $child.Start() | Out-Null
  if (-not $Invalid) {
    if (-not $connection.Wait(15000)) { throw 'Synthetic clipboard sender timed out' }
    $connected = $true
    $reader = [IO.StreamReader]::new($server)
    $received = $reader.ReadToEnd() | ConvertFrom-Json
    $reader.Dispose()
  }
  if (-not $child.WaitForExit(15000)) { throw 'Synthetic clipboard child timed out' }
  $output = $child.StandardOutput.ReadToEnd()
  $shapeLine = @($output -split '[\r\n]+' | Where-Object { $_.StartsWith('{') })[0]
  $shape = $shapeLine | ConvertFrom-Json
  if ($Invalid) { $connected = $connection.IsCompleted -and -not $connection.IsFaulted }
  $value = if ($received) { [string]$received.jwt } else { '' }
  @{ sender = $shape; connected = $connected; clipboardCleared = $output.Contains('CLIPBOARD_CLEARED=True');
    receiver = @{ inputPresent = $value.Length -gt 0; inputLength = $value.Length;
      segmentCount = $value.Split('.').Count; containsWhitespace = $value -match '\s';
      equalsExpectedFixture = $value -ceq 'aaa.bbb.ccc' } } | ConvertTo-Json -Compress -Depth 4
} finally {
  $server.Dispose()
  if (-not $child.HasExited) { $child.Kill() }
  $child.Dispose()
}
