import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ARTICLES, ARTICLE_AUTHOR_NOTE, ARTICLE_BYLINE, articleDateLabel } from '../../content/articles';

@Component({
  selector: 'app-article-index',
  imports: [RouterLink],
  templateUrl: './article-index.html',
  styleUrl: './article-index.scss',
})
export class ArticleIndex {
  readonly articles = ARTICLES;
  readonly byline = ARTICLE_BYLINE;
  readonly authorNote = ARTICLE_AUTHOR_NOTE;
  readonly dateLabel = articleDateLabel;
}
