import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';

describe('Thingamajob public route', () => {
  it('loads the actual lazy product route and separates working foundation from product direction', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/thingamajob');
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('h1')?.textContent).toBe('Thingamajob');
    expect(root.querySelector('main')).toBeNull();
    expect(root.textContent).toContain('first live prototype');
    expect(root.textContent).toContain('second independent live');
    expect(root.textContent).toContain('product direction, not actions offered');
    expect(root.textContent).toContain('Daily Job Dredge');
    expect(root.querySelector('form, input, button, iframe')).toBeNull();
    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).not.toMatch(
      /UNKNOWN|VERIFIED|ASSERTED|REVIEWING|TEST|LIVE|api-test|claim ID/,
    );
    expect(routes.find((route) => route.path === 'thingamajob')?.loadComponent).toBeTypeOf(
      'function',
    );
  });
});
