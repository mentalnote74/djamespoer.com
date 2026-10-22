import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ARTICLES, ARTICLE_AUTHOR_NOTE, ARTICLE_BYLINE, articleDateLabel } from '../../content/articles';
import type { Article as ArticleContent } from './article.model';

@Component({
  selector: 'app-article',
  imports: [RouterLink],
  templateUrl: './article.html',
  styleUrl: './article.scss',
  // Authored innerHTML needs descendant styles; every selector is article-prefixed.
  encapsulation: ViewEncapsulation.None,
})
export class Article {
  readonly article = input.required<ArticleContent>();
  readonly byline = ARTICLE_BYLINE;
  readonly authorNote = ARTICLE_AUTHOR_NOTE;
  readonly publishedLabel = computed(() => articleDateLabel(this.article().publishedDate));
  readonly related = computed(() => ARTICLES.filter((item) => item.slug !== this.article().slug));
}
