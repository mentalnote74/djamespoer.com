# Run only after an authorized diagnostic receiver is ready. No files or secrets logged.
param([string]$PipeName = 'thingamajob-james-test-identity')
$ErrorActionPreference = 'Stop'
$value = $null
$payload = $null
$writer = $null
$pipe = $null
try {
  if ([string]::IsNullOrWhiteSpace($env:THINGAMAJOB_TEST_AUD) -or
      [string]::IsNullOrWhiteSpace($env:THINGAMAJOB_TEST_ISSUER)) {
    throw 'TEST environment settings are not present in this process; no cookie requested.'
  }
  $value = Get-Clipboard -Raw
  if ($null -eq $value) { $value = '' }
  # Preserve the value exactly. These checks precede JSON serialization and connection.
  $shape = @{ inputPresent = $value.Length -gt 0; inputLength = $value.Length;
    segmentCount = $value.Split('.').Count; containsWhitespace = $value -match '\s' }
  Write-Output ($shape | ConvertTo-Json -Compress)
  if (-not $shape.inputPresent -or $shape.inputLength -gt 16384 -or
      $shape.segmentCount -ne 3 -or $shape.containsWhitespace) {
    throw 'Sender structure validation failed; nothing sent. No JWT normalization attempted.'
  }
  $payload = @{ aud = $env:THINGAMAJOB_TEST_AUD; issuer = $env:THINGAMAJOB_TEST_ISSUER;
    jwt = $value } | ConvertTo-Json -Compress
  $pipe = [IO.Pipes.NamedPipeClientStream]::new('.', $PipeName, [IO.Pipes.PipeDirection]::Out)
  $pipe.Connect(10000)
  $writer = [IO.StreamWriter]::new($pipe)
  $writer.Write($payload)
  $writer.Flush()
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.Clipboard]::Clear()
  $value = $null; $payload = $null
  Write-Output 'Structurally valid TEST input sent through the selected local pipe; value suppressed.'
} finally {
  if ($writer) { $writer.Dispose() }
  if ($pipe) { $pipe.Dispose() }
  $value = $null; $payload = $null
}
