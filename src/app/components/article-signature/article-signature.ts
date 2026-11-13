import { Component, input } from '@angular/core';
import { ARTICLE_AUTHOR_NOTE } from '../../content/articles';

/**
 * Blognosticator sign-off with its asterisk note. The article component closes
 * every pen-name article with it; any page can drop it in. `noteId` is the
 * fragment the byline's asterisk links to, so it must stay unique per page.
 */
@Component({
  selector: 'app-article-signature',
  templateUrl: './article-signature.html',
  styleUrl: './article-signature.scss',
})
export class ArticleSignature {
  readonly noteId = input('article-author-note');
  readonly note = ARTICLE_AUTHOR_NOTE;
}
