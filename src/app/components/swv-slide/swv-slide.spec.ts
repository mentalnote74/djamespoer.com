import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicAnalytics } from '../../services/public-analytics';
import { SwvSlide } from './swv-slide';

describe('SWV stable explicit embed context', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SwvSlide],
      providers: [
        provideRouter([]),
        { provide: PublicAnalytics, useValue: { track: vi.fn(), carouselExposure: vi.fn() } },
      ],
    }),
  );
  for (const hero of [false, true])
    it(`uses finite ${hero ? 'hero' : 'carousel'} context with no UTM and preserves the same iframe`, async () => {
      const f = TestBed.createComponent(SwvSlide);
      f.componentRef.setInput('hero', hero);
      f.componentRef.setInput('active', false);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      const frame = f.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      expect(frame).not.toBeNull();
      const url = new URL(frame.src);
      expect(url.origin).toBe('https://shadywhitevan.rocks');
      expect(url.hash).toBe('#swv-embed-stage');
      expect([...url.searchParams.entries()]).toEqual([
        ['embed_source', 'djamespoer.com'],
        ['embed_surface', hero ? 'project-hero' : 'home-carousel'],
      ]);
      expect(frame.getAttribute('loading')).toBe('eager');
      f.componentRef.setInput('active', true);
      f.detectChanges();
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('portfolio-analytics-change'));
      f.detectChanges();
      f.componentRef.setInput('active', false);
      f.detectChanges();
      expect(f.nativeElement.querySelector('iframe')).toBe(frame);
      expect(frame.src).toBe(url.href);
    });
});
