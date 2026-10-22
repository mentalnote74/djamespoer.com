import { TestBed } from '@angular/core/testing';
import { About } from './about';

describe('About', () => {
  it('presents the approved editorial copy with one page heading and emphasized statements', async () => {
    await TestBed.configureTestingModule({ imports: [About] }).compileComponents();
    const fixture = TestBed.createComponent(About);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('h1')?.textContent).toBe('About D. James Poer');
    const paragraphs = Array.from(root.querySelectorAll('p'), (p) =>
      p.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(paragraphs).toHaveLength(9);
    expect(paragraphs[0]).toBe(
      "I build things. Sometimes they're software. Sometimes they're guitars. Sometimes they're ideas that probably seemed simpler when I started.",
    );
    expect(root.querySelector('.about__thought strong')?.textContent).toBe(
      'Why are we doing it this way?',
    );
    expect(root.querySelector('p:last-of-type strong')?.textContent).toBe(
      'I design. I build. I break things. I figure out why. Then I make them better.',
    );
    expect(root.querySelector('main')).toBeNull();
    expect(root.textContent).not.toContain('future content phase');
  });
});
