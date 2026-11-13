import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ARTICLES,
  ARTICLE_AUTHOR_NOTE,
  ARTICLE_BYLINE,
  articleDateLabel,
} from '../../content/articles';
import type { Article as ArticleContent } from './article.model';
import { destinationSlides } from '../../content/portfolio-slides';
import { SlideHero } from '../slide-hero/slide-hero';
import { HiddenCookie } from '../../features/cookie-hunt/hidden-cookie';

@Component({
  selector: 'app-article',
  imports: [RouterLink, SlideHero, HiddenCookie],
  templateUrl: './article.html',
  styleUrl: './article.scss',
  // Authored innerHTML needs descendant styles; every selector is article-prefixed.
  encapsulation: ViewEncapsulation.None,
})
export class Article {
  readonly article = input.required<ArticleContent>();
  readonly heroDestination = computed(() => {
    const destination = '/blognostisphere/' + this.article().slug;
    return destinationSlides(destination).length ? destination : null;
  });
  readonly byline = ARTICLE_BYLINE;
  readonly authorNote = ARTICLE_AUTHOR_NOTE;
  readonly publishedLabel = computed(() => articleDateLabel(this.article().publishedDate));
  // Derived from the authored body (about 230 words per minute), never hand-entered.
  readonly readMinutes = computed(() => {
    const words = this.article().body.replace(/<[^>]+>/g, ' ').match(/\S+/g)?.length ?? 0;
    return Math.max(1, Math.ceil(words / 230));
  });
  readonly related =computed(() => ARTICLES.filter((item) => item.slug !== this.article().slug));
}
