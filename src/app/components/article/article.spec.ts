import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Article } from './article';
import { SlideHero } from '../slide-hero/slide-hero';
import { ARTICLES } from '../../content/articles';
import { interiorRoutes } from '../../app.routes.interior';
import type { Article as ArticleContent } from './article.model';

@Component({ selector: 'app-slide-hero', template: '<h1>{{ heading() }}</h1>' })
class HeroStub {
  readonly destination = input.required<string>();
  readonly heading = input.required<string>();
}

describe('article shared hero composition', () => {
  for (const slug of [
    'like-a-big-dumb-bass',
    'honey-should-i-add-bot-herder-to-my-resume',
    'software-development-is-never-done',
  ]) {
    it(`preserves one article H1 and only uses registered artwork for ${slug}`, async () => {
      const summary = ARTICLES.find((article) => article.slug === slug);
      expect(summary).toBeDefined();
      TestBed.configureTestingModule({ imports: [Article], providers: [provideRouter([])] });
      TestBed.overrideComponent(Article, {
        remove: { imports: [SlideHero] },
        add: { imports: [HeroStub] },
      });
      const fixture = TestBed.createComponent(Article);
      fixture.componentRef.setInput('article', {
        ...summary,
        body: '<p>Article body.</p>',
        sources: [],
      });
      fixture.detectChanges();
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')?.textContent).toBe(summary?.title);
      expect(root.querySelectorAll('app-slide-hero')).toHaveLength(
        slug === 'like-a-big-dumb-bass' ? 1 : 0,
      );
      expect(root.querySelector('.blognostisphere-article__body')?.textContent).toBe(
        'Article body.',
      );
      expect(root.querySelector('a')?.getAttribute('href')).toBe('/blognostisphere');
    });
  }
  it('resolves every existing and new article by slug after publication-date sorting', async () => {
    for (const summary of ARTICLES) {
      const route = interiorRoutes.find(
        (route) => route.path === `blognostisphere/${summary.slug}`,
      );
      expect(route?.loadComponent).toBeTypeOf('function');
      const resolve = route?.resolve?.['article'] as () => Promise<ArticleContent>;
      const content = await resolve();
      expect(content.slug).toBe(summary.slug);
      expect(content.title).toBe(summary.title);
      expect(content.body.length).toBeGreaterThan(100);
    }
  });
});

describe('article signature', () => {
  for (const article of ARTICLES) {
    it(`signs ${article.slug} as Blognosticator with one donkey note`, async () => {
      TestBed.configureTestingModule({ imports: [Article], providers: [provideRouter([])] });
      TestBed.overrideComponent(Article, {
        remove: { imports: [SlideHero] },
        add: { imports: [HeroStub] },
      });
      const fixture = TestBed.createComponent(Article);
      fixture.componentRef.setInput('article', { ...article, body: '<p>Body.</p>', sources: [] });
      fixture.detectChanges();
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('footer .article-signature__name')?.textContent ?? '').toContain(
        'Blognosticator',
      );
      const notes = root.querySelectorAll('#article-author-note');
      expect(notes).toHaveLength(1);
      expect(notes[0].textContent).toContain('emotional-support donkey');
      // The byline's asterisk lands on the note inside the signature.
      expect(root.querySelector('header a[href="#article-author-note"]')).not.toBeNull();
    });
  }
});
