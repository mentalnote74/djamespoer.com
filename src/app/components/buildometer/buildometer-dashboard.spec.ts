import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { BuildometerDashboard } from './buildometer-dashboard';
import { BuildometerDataStore } from './data/buildometer-data';
import { InstrumentCluster } from './instrument-cluster';
describe('portable Buildometer Dashboard', () => {
  it('mounts without the Buildometer Page or router and shares one data request across skin changes', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const store = { data: signal(null), loading: signal(false), error: signal(false), load };
    TestBed.configureTestingModule({
      imports: [BuildometerDashboard],
      providers: [{ provide: BuildometerDataStore, useValue: store }],
    });
    const f = TestBed.createComponent(BuildometerDashboard);
    f.detectChanges();
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('.instrument').length).toBe(7);
    expect(f.nativeElement.querySelector('#metric-stories')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    await f.componentInstance.selectSkin('workshop');
    f.detectChanges();
    expect(load).toHaveBeenCalledTimes(1);
    f.destroy();
    TestBed.resetTestingModule();
  });
  it('keeps InstrumentCluster presentational with no provider/data dependency', () => {
    TestBed.configureTestingModule({ imports: [InstrumentCluster] });
    const f = TestBed.createComponent(InstrumentCluster);
    f.componentRef.setInput('metrics', [
      {
        id: 'test',
        label: 'Test metric',
        value: '7',
        note: 'test only',
        state: 'ready',
        level: null,
      },
    ]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('7');
    f.destroy();
    TestBed.resetTestingModule();
  });
});
