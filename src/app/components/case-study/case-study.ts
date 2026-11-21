import { HiddenCookie } from '../../features/cookie-hunt/hidden-cookie';
import { PublicTrack } from '../../services/public-track';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { validateCaseStudy } from './case-study.validation';
import { CaseStudy as CaseStudyContent } from './case-study.model';
import { SlideHero } from '../slide-hero/slide-hero';

/** Lines authored as a quoted question or statement read as pull quotes. */
const QUOTED_LINE = /^["“].*["”]$/;

/** Short, number-led lines ("~150 lines of Sass") read as stat figures. */
const STAT_LINE = /^~?\d[\d,.]*\s+\S/;
const STAT_MAX_LENGTH = 48;

/** Long studies get a skimmable chapter list; short ones don't need one. */
const CONTENTS_THRESHOLD = 4;

@Component({
  imports: [PublicTrack, SlideHero, HiddenCookie],
  selector: 'app-case-study',
  templateUrl: './case-study.html',
  styleUrl: './case-study.scss',
})
export class CaseStudy {
  readonly heroDestination = input<string>();
  readonly showTitle = input(true, {
    transform: (value: boolean | undefined) => value !== false,
  });
  readonly titleVisuallyHidden = input(false);
  readonly study = input.required<CaseStudyContent, CaseStudyContent>({
    transform: validateCaseStudy,
  });

  readonly introductionParagraphs = computed(() => {
    const introduction = this.study().introduction;
    return typeof introduction === 'string' ? [introduction] : (introduction ?? []);
  });

  /** The related page's kind names this page's genre from the other side. */
  readonly kicker = computed(() => {
    const kind = this.study().relatedPage?.kind;
    return kind === 'work' ? 'Case study' : kind === 'case-study' ? 'Work history' : null;
  });

  /** A visible title block only when no artwork hero or composition already carries the title. */
  readonly titleBand = computed(
    () => !this.heroDestination() && this.showTitle() && !this.titleVisuallyHidden(),
  );

  readonly chapters = computed(() =>
    this.study().sections.map((section, index) => ({
      section,
      id: `chapter-${index + 1}`,
      paragraphs: (section.paragraphs ?? []).map((text) => ({
        text,
        quote: QUOTED_LINE.test(text.trim()),
        stat: text.length <= STAT_MAX_LENGTH && STAT_LINE.test(text.trim()),
      })),
    })),
  );

  /** Same-document anchors need the page path: the app's base href is "/". */
  protected readonly path = inject(Router).url.split(/[?#]/)[0];

  readonly showContents = computed(() => this.chapters().length >= CONTENTS_THRESHOLD);
}
