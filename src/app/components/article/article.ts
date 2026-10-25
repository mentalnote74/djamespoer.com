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

@Component({
  selector: 'app-article',
  imports: [RouterLink, SlideHero],
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
  readonly related = computed(() => ARTICLES.filter((item) => item.slug !== this.article().slug));
}
