import { Component } from '@angular/core';
import { CaseStudy } from './case-study';
import { CaseStudy as CaseStudyContent } from './case-study.model';
import { SwvSlide } from '../swv-slide/swv-slide';
import { SWV_BODY } from './shady-white-van.content';

@Component({
  selector: 'app-shady-white-van-case-study',
  imports: [CaseStudy, SwvSlide],
  templateUrl: './shady-white-van.html',
  styleUrl: './shady-white-van.scss',
})
export class ShadyWhiteVanCaseStudy {
  readonly study: CaseStudyContent = {
    title: 'Shady White Van',
    facts: [
      { label: "Project", value: "A website for a fake band: “Fake Band. Real Music.”" },
      { label: "Built with", value: "React 19, TypeScript, Vite 8, Three.js and Blender" },
      { label: "Van treatments", value: "26, from liquid chrome to a live arcade game" },
      { label: "Baseline", value: "Desktop Lighthouse 100 / 100 / 100 / 100 on the early build" },
    ],
    summary: [
      {
        label: "Problem",
        heading: "Can a still image live?",
        text: "An AI concept of a psychedelic custom van raised the question that changed the project: could the van become the living centerpiece?",
      },
      {
        label: "Approach",
        heading: "Cheap graphics, expensive choreography",
        text: "One persistent Blender-built van in Three.js, with small graphics and code-driven layers, motion and materials instead of heavy video.",
      },
      {
        label: "Result",
        heading: "Twenty-six vans. One van.",
        text: "A live rotating van cycling through 26 treatments, embedded in this Angular site at 3:1.",
      },
    ],
    sections: [],
  };
  readonly body = SWV_BODY;
}
