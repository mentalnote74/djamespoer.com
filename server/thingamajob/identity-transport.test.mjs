import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test(
  'Windows PowerShell provides parameterless Clipboard.Clear without invoking it',
  {
    skip: process.platform !== 'win32',
  },
  () => {
    const output = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "Add-Type -AssemblyName System.Windows.Forms; $m = [System.Windows.Forms.Clipboard].GetMethod('Clear', [Type[]]@()); Write-Output ($null -ne $m)",
      ],
      { encoding: 'utf8' },
    );
    assert.equal(output.trim(), 'True');
  },
);

for (const mode of ['masked', 'direct']) {
  test(
    `Windows ${mode} input survives real JSON/named-pipe transport`,
    {
      skip: process.platform !== 'win32',
      timeout: 30000,
    },
    () => {
      const output = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-File',
          fileURLToPath(new URL('./identity-transport-fixture.ps1', import.meta.url)),
          '-Mode',
          mode,
        ],
        {
          encoding: 'utf8',
          timeout: 25000,
        },
      );
      const report = JSON.parse(output.trim());
      const expected = {
        inputPresent: true,
        inputLength: 11,
        segmentCount: 3,
        containsWhitespace: false,
        equalsExpectedFixture: true,
      };
      assert.deepEqual(report.sender, expected);
      assert.deepEqual(report.receiver, expected);
    },
  );
}

for (const invalid of [false, true]) {
  test(
    `guarded clipboard sender ${invalid ? 'rejects whitespace before connection' : 'preserves fixture and clears clipboard after sending'}`,
    {
      skip: process.platform !== 'win32',
      timeout: 30000,
    },
    () => {
      const args = [
        '-NoProfile',
        '-File',
        fileURLToPath(new URL('./identity-clipboard-fixture.ps1', import.meta.url)),
      ];
      if (invalid) args.push('-Invalid');
      const report = JSON.parse(
        execFileSync('powershell.exe', args, { encoding: 'utf8', timeout: 25000 }).trim(),
      );
      assert.equal(report.connected, !invalid);
      assert.equal(report.clipboardCleared, !invalid);
      assert.equal(report.sender.containsWhitespace, invalid);
      if (!invalid) {
        assert.equal(report.sender.inputLength, 11);
        assert.equal(report.sender.segmentCount, 3);
        assert.equal(report.receiver.equalsExpectedFixture, true);
        assert.equal(report.receiver.segmentCount, 3);
        assert.equal(report.receiver.containsWhitespace, false);
      }
    },
  );
}
