import { PublicTrack } from '../../services/public-track';
import { Component, computed, input } from '@angular/core';
import { validateCaseStudy } from './case-study.validation';
import { CaseStudy as CaseStudyContent } from './case-study.model';
import { SlideHero } from '../slide-hero/slide-hero';

@Component({
  imports: [PublicTrack, SlideHero],
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
  readonly introductionParagraphs = computed(() => {
    const introduction = this.study().introduction;
    return typeof introduction === 'string' ? [introduction] : (introduction ?? []);
  });
  readonly study = input.required<CaseStudyContent, CaseStudyContent>({
    transform: validateCaseStudy,
  });
}
