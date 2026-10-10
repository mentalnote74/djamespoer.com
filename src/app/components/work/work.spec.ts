import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';

describe('Work routes', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    }),
  );
  it('keeps Home, Perspectives and Work lazy', () => {
    expect(routes.filter((route) => route.path?.startsWith('work'))).toHaveLength(6);
    for (const route of routes) {
      expect(route.loadComponent).toBeTypeOf('function');
      expect(route.component).toBeUndefined();
    }
    expect(routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '',
        'engineering',
        'ux-product',
        'accessibility',
        'ai',
        'creative',
        'impact',
      ]),
    );
  });
  it('places the current project above EXL with whole-card links and a single index heading', async () => {
    const harness = await RouterTestingHarness.create('/work');
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('h1')?.textContent).toBe('Work');
    expect(Array.from(root.querySelectorAll('li a'), (link) => link.getAttribute('href'))).toEqual([
      '/work/djamespoer',
      '/work/exl',
      '/work/ips',
      '/work/tcc',
      '/work/dr',
    ]);
    expect(root.querySelectorAll('li a h2')).toHaveLength(5);
    expect(root.querySelector('li a')?.textContent).toContain('Current professional project');
    expect(root.querySelector('main')).toBeNull();
  });
  it.each([
    ['ips', 'IPS / PowerSchool'],
    ['dr', 'Dreyer & Reinbold'],
  ])('scaffolds /work/%s without career claims', async (path, heading) => {
    const harness = await RouterTestingHarness.create(`/work/${path}`);
    const root = harness.routeNativeElement!;
    expect(root.querySelector('h1')?.textContent).toBe(heading);
    expect(root.querySelector('article')).not.toBeNull();
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelectorAll('section h2')).toHaveLength(6);
    expect(root.textContent).toContain('Supporting content and evidence have not yet been added');
    expect(root.querySelector('[href="/work"]')).not.toBeNull();
  });

  it.each([
    ['djamespoer', 'djamespoer.com', 'Performance 92'],
    ['exl', 'EXL / LifePRO', 'roughly 150 lines of Sass'],
    ['tcc', 'TCC Software Solutions', 'During my final week at TCC'],
  ])(
    'renders the authored /work/%s draft as semantic, indexable text',
    async (path, heading, fact) => {
      const harness = await RouterTestingHarness.create(`/work/${path}`);
      const root = harness.routeNativeElement!;
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')?.textContent).toBe(heading);
      expect(root.querySelector('article')).not.toBeNull();
      expect(root.querySelectorAll('section h2').length).toBeGreaterThan(5);
      expect(root.textContent).toContain(fact);
      expect(root.textContent).not.toContain('Content pending.');
    },
  );
});
