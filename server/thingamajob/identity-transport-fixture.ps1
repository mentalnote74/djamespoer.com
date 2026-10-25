param([ValidateSet('masked', 'direct')][string]$Mode = 'masked')
$ErrorActionPreference = 'Stop'
$pipeName = 'thingamajob-fixture-' + [guid]::NewGuid().ToString('N')
$security = [IO.Pipes.PipeSecurity]::new()
$security.SetAccessRuleProtection($true, $false)
$security.AddAccessRule([IO.Pipes.PipeAccessRule]::new([Security.Principal.WindowsIdentity]::GetCurrent().User, [IO.Pipes.PipeAccessRights]::FullControl, [Security.AccessControl.AccessControlType]::Allow))
$server = [IO.Pipes.NamedPipeServerStream]::new($pipeName, [IO.Pipes.PipeDirection]::In, 1, [IO.Pipes.PipeTransmissionMode]::Byte, [IO.Pipes.PipeOptions]::None, 0, 0, $security)
$sender = @'
$ErrorActionPreference = 'Stop'
function Shape([string]$value) {
  return @{ inputPresent = $value.Length -gt 0; inputLength = $value.Length; segmentCount = $value.Split('.').Count; containsWhitespace = $value -match '\s'; equalsExpectedFixture = $value -ceq 'aaa.bbb.ccc' }
}
if ('__MODE__' -eq 'masked') {
  $s = Read-Host 'SYNTHETIC ONLY: aaa.bbb.ccc' -AsSecureString
  $value = [Net.NetworkCredential]::new('', $s).Password
} else { $value = 'aaa.bbb.ccc' }
$diagnostics = Shape $value
$payload = @{ aud = 'fictional'; issuer = 'fictional'; jwt = $value; sender = $diagnostics } | ConvertTo-Json -Compress
$p = [IO.Pipes.NamedPipeClientStream]::new('.', '__PIPE__', [IO.Pipes.PipeDirection]::Out)
$p.Connect(10000)
$w = [IO.StreamWriter]::new($p)
$w.Write($payload); $w.Dispose(); $p.Dispose()
if ($s) { $s.Dispose() }
'@
$sender = $sender.Replace('__MODE__', $Mode).Replace('__PIPE__', $pipeName)
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($sender))
$child = Start-Process powershell.exe -ArgumentList @('-NoProfile', '-EncodedCommand', $encoded) -WindowStyle Hidden -PassThru
try {
  if ($Mode -eq 'masked') {
    # Inject only fictional characters into this child console's input buffer.
    # No SendKeys/global input, clipboard access, or existing user console access.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FixtureConsole {
  [StructLayout(LayoutKind.Sequential)] public struct KeyEvent {
    [MarshalAs(UnmanagedType.Bool)] public bool Down;
    public ushort Repeat, VirtualKey, Scan;
    public char Character;
    public uint Control;
  }
  [StructLayout(LayoutKind.Explicit, Size=20)] public struct InputRecord {
    [FieldOffset(0)] public ushort Type;
    [FieldOffset(4)] public KeyEvent Key;
  }
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AttachConsole(uint pid);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool WriteConsoleInputW(IntPtr input, InputRecord[] records, uint count, out uint written);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  public static void Send(int pid) {
    FreeConsole();
    if (!AttachConsole((uint)pid)) throw new Exception("Test child console unavailable");
    IntPtr handle = CreateFile("CONIN$", 0x40000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
    try {
      string fixture = "aaa.bbb.ccc\r";
      InputRecord[] records = new InputRecord[fixture.Length * 2];
      for (int i=0; i<fixture.Length; i++) {
        KeyEvent key = new KeyEvent { Down=true, Repeat=1, Character=fixture[i], VirtualKey=(ushort)(fixture[i]=='\r' ? 13 : char.ToUpperInvariant(fixture[i])) };
        records[i*2] = new InputRecord { Type=1, Key=key };
        key.Down=false;
        records[i*2+1] = new InputRecord { Type=1, Key=key };
      }
      uint written;
      if (!WriteConsoleInputW(handle, records, (uint)records.Length, out written) || written != records.Length) throw new Exception("Test console input failed");
    } finally { CloseHandle(handle); FreeConsole(); }
  }
}
'@
    Start-Sleep -Milliseconds 300
    [FixtureConsole]::Send($child.Id)
  }
  $connection = $server.WaitForConnectionAsync()
  if (-not $connection.Wait(15000)) { throw 'Synthetic sender timed out' }
  $reader = [IO.StreamReader]::new($server)
  $received = $reader.ReadToEnd() | ConvertFrom-Json
  $reader.Dispose()
  $value = [string]$received.jwt
  $receiver = @{ inputPresent = $value.Length -gt 0; inputLength = $value.Length; segmentCount = $value.Split('.').Count; containsWhitespace = $value -match '\s'; equalsExpectedFixture = $value -ceq 'aaa.bbb.ccc' }
  @{ mode = $Mode; sender = $received.sender; receiver = $receiver } | ConvertTo-Json -Compress -Depth 4
} finally {
  $server.Dispose()
  if (-not $child.HasExited) { $child.WaitForExit(1000) | Out-Null }
  if (-not $child.HasExited) { Stop-Process -Id $child.Id }
}
