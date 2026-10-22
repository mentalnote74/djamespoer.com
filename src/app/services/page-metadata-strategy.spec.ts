import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageMetadataStrategy } from './page-metadata-strategy';
import { PUBLIC_PAGES } from '../content/public-pages';

@Component({ template: '<h1>Test page</h1>' })
class MetadataPage {}

describe('public route metadata', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...PUBLIC_PAGES.map((p) => ({
            path: p.path,
            component: MetadataPage,
            title: p.title,
            data: { description: p.description },
          })),
          { path: 'product-journal/:date', component: MetadataPage },
          {
            path: 'test/thingamajob',
            component: MetadataPage,
            title: 'Test evaluator',
            data: { robots: 'noindex, nofollow' },
          },
        ]),
        { provide: TitleStrategy, useExisting: PageMetadataStrategy },
      ],
    }),
  );

  it('updates canonical, social metadata and schema across navigation without leaving the preceding page identity', async () => {
    const harness = await RouterTestingHarness.create('/about?utm_source=test#main');
    const document = TestBed.inject(DOCUMENT),
      meta = TestBed.inject(Meta);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://djamespoer.com/about',
    );
    expect(
      JSON.parse(document.getElementById('portfolio-structured-data')!.textContent!)['@graph'][2][
        '@type'
      ],
    ).toBe('ProfilePage');
    await harness.navigateByUrl('/accessibility');
    expect(TestBed.inject(Title).getTitle()).toContain('WCAG & Section 508');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://djamespoer.com/accessibility');
    expect(meta.getTag('name="twitter:title"')?.content).toBe(TestBed.inject(Title).getTitle());
    expect(meta.getTag('name="robots"')?.content).toBe('index, follow');
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('#portfolio-structured-data')).toHaveLength(1);
  });

  it('keeps test surfaces noindex and clears public schema and descriptions on navigation', async () => {
    const harness = await RouterTestingHarness.create('/work/exl');
    await harness.navigateByUrl('/test/thingamajob');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
    expect(TestBed.inject(DOCUMENT).getElementById('portfolio-structured-data')).toBeNull();
    expect(TestBed.inject(Meta).getTag('name="description"')).toBeNull();
    await harness.navigateByUrl('/about');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('index, follow');
  });

  it('gives each dated journal page its own canonical and dated title', async () => {
    const harness = await RouterTestingHarness.create('/product-journal/2026-10-22');
    expect(TestBed.inject(Title).getTitle()).toContain('2026-10-22');
    await harness.navigateByUrl('/product-journal/2026-10-21?source=archive');
    expect(TestBed.inject(Title).getTitle()).toContain('2026-10-21');
    expect(
      TestBed.inject(DOCUMENT).querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://djamespoer.com/product-journal/2026-10-21');
  });

  it('does not index an unwritten journal date or publish a graph for it', async () => {
    await RouterTestingHarness.create('/product-journal/2099-01-01');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
    expect(TestBed.inject(DOCUMENT).getElementById('portfolio-structured-data')).toBeNull();
  });
});
