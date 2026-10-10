import { Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CaseStudy } from '../case-study/case-study';
import { CaseStudy as StudyContent } from '../case-study/case-study.model';
import { PerspectiveCandidate } from '../perspective-candidate/perspective-candidate';
import { PerspectiveCandidateKey } from '../perspective-candidate/perspective-candidate.config';

@Component({
  imports: [NgOptimizedImage, CaseStudy, PerspectiveCandidate],
  selector: 'app-proof-page',
  styleUrl: './proof-page.scss',
  templateUrl: './proof-page.html',
})
export class ProofPage {
  readonly heading = input.required<string>();
  readonly content = input<StudyContent>();
  readonly composition = input<PerspectiveCandidateKey>();
  readonly artwork = input<{
    src: string;
    alt: string;
    width: number;
    height: number;
    srcset?: string;
    sizes?: string;
  }>();
}
