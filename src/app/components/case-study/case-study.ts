import { PublicTrack } from '../../services/public-track';
import { Component, input } from '@angular/core';
import { validateCaseStudy } from './case-study.validation';
import { CaseStudy as CaseStudyContent } from './case-study.model';

@Component({
  imports: [PublicTrack],
  selector: 'app-case-study',
  templateUrl: './case-study.html',
  styleUrl: './case-study.scss',
})
export class CaseStudy {
  readonly study = input.required<CaseStudyContent, CaseStudyContent>({
    transform: validateCaseStudy,
  });
}
