import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaseStudy as CaseStudyContent } from './case-study.model';

@Component({
  selector: 'app-case-study',
  imports: [RouterLink],
  templateUrl: './case-study.html',
  styleUrl: './case-study.scss',
})
export class CaseStudy {
  readonly study = input.required<CaseStudyContent>();
}
