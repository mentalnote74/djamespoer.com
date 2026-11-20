import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { About } from './about';

const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

describe('About', () => {
  it('leads with identity, receipts and one primary next step, without a nested main', async () => {
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(About);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(text(root.querySelector('h1'))).toBe('About D. James Poer');
    expect(text(root.querySelector('.about-hero__statement'))).toBe(
      'I design. I build. I break things. I figure out why. Then I make them better.',
    );
    expect(text(root.querySelector('.about__opening'))).toBe(
      "I build things. Sometimes they're software. Sometimes they're guitars. Sometimes they're ideas that probably seemed simpler when I started.",
    );
    expect(text(root.querySelector('.about__thought strong'))).toBe(
      'Why are we doing it this way?',
    );

    // Every receipt is a whole-card link to the published case study behind it.
    const receipts = Array.from(root.querySelectorAll('.receipt h3 a'), (a) =>
      a.getAttribute('href'),
    );
    expect(receipts).toEqual([
      '/case-studies/exl',
      '/case-studies/dr',
      '/case-studies/tcc',
      '/case-studies/ips',
    ]);

    const roles = Array.from(root.querySelectorAll('.about-timeline a'), (a) =>
      a.getAttribute('href'),
    );
    expect(roles).toEqual(['/work/exl', '/work/ips', '/work/tcc', '/work/dr']);

    // One visual primary action per action group, always the résumé.
    for (const group of Array.from(root.querySelectorAll('.about-actions'))) {
      const primary = group.querySelectorAll('.about-action--primary');
      expect(primary).toHaveLength(1);
      expect(primary[0].getAttribute('href')).toBe('/resume');
    }

    expect(root.querySelector('main')).toBeNull();
  });
});
