import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CaseStudy } from './case-study';
import { CaseStudy as Content } from './case-study.model';

describe('CaseStudy presentation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [CaseStudy], providers: [provideRouter([])] }),
  );
  const render = (study: Content) => {
    const fixture = TestBed.createComponent(CaseStudy);
    fixture.componentRef.setInput('study', study);
    fixture.detectChanges();
    return fixture;
  };
  it('omits unsupported sections and introduction instead of imposing a narrative', () => {
    const fixture = render({ title: 'Synthetic study', sections: [] });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('section')).toBeNull();
    expect(root.querySelector('main')).toBeNull();
    expect(root.textContent).not.toContain('Content pending');
    expect(root.querySelector('[href="/work"]')).not.toBeNull();
  });
  it('renders supplied section order, lists and plain text without interpreting HTML', () => {
    const fixture = render({
      title: 'Synthetic study',
      sections: [
        { heading: 'Lessons', paragraphs: ['<strong>Literal content</strong>'] },
        { heading: 'Constraints', items: ['Synthetic constraint'] },
      ],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.querySelectorAll('h2'), (heading) => heading.textContent)).toEqual([
      'Lessons',
      'Constraints',
    ]);
    expect(root.querySelector('strong')).toBeNull();
    expect(root.querySelector('li')?.textContent).toBe('Synthetic constraint');
    fixture.componentRef.setInput('study', {
      title: 'Revised study',
      sections: [{ heading: 'Context', paragraphs: ['Revised'] }],
    } satisfies Content);
    fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toBe('Revised study');
    expect(root.querySelectorAll('h2')).toHaveLength(1);
  });
  it('renders optional public evidence with labelled links and reserved image dimensions', () => {
    const fixture = render({
      title: 'Synthetic study',
      sections: [
        {
          heading: 'Evidence',
          evidence: [
            { kind: 'link', href: '/example-artifact', label: 'Synthetic artifact' },
            {
              kind: 'image',
              src: '/example-image.png',
              alt: 'Synthetic interface example',
              width: 800,
              height: 600,
              caption: 'Synthetic caption',
            },
          ],
        },
      ],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[href="/example-artifact"]')?.textContent).toBe(
      'Synthetic artifact',
    );
    const image = root.querySelector('img')!;
    expect(image.alt).toBe('Synthetic interface example');
    expect(image.width).toBe(800);
    expect(image.height).toBe(600);
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(root.querySelector('figcaption')?.textContent).toBe('Synthetic caption');
    expect(root.querySelectorAll('[id]')).toHaveLength(0);
  });
});
