import { Component } from '@angular/core';
import { CaseStudy } from './case-study';
import { CaseStudy as CaseStudyContent } from './case-study.model';
import { CREATIVE_TOWN_BODY } from './creative-town.content';
import {
  CREATIVE_TOWN_VIDEO_PARAGRAPH,
  CREATIVE_TOWN_VIDEO_TRANSCRIPT,
} from './creative-town-video.content';

const clipPosition = CREATIVE_TOWN_BODY.indexOf('<h2>The Stupid Awards</h2>');

@Component({
  selector: 'app-creative-town-case-study',
  imports: [CaseStudy],
  templateUrl: './creative-town.html',
  styleUrl: './creative-town.scss',
})
export class CreativeTownCaseStudy {
  readonly study: CaseStudyContent = {
    title: 'Creative Town',
    facts: [
      { label: "Project", value: "A snowflake-scene Easter-egg town for the Creative side of the portfolio" },
      { label: "Cast", value: "89 registered cast entries, 47 selected per scene" },
      { label: "Tested", value: "1,000 simulated scenes with 0 tested rule violations" },
      { label: "AI comparison", value: "Three AI approaches given one frozen brief" },
    ],
    summary: [
      {
        label: "Problem",
        heading: "Same town, different day",
        text: "Make a town recognizably the same on every visit, yet different enough to make you look twice.",
      },
      {
        label: "Approach",
        heading: "Dull tools",
        text: "Give AI bounded jobs, preserve what works, and move selection, placement and timing into deterministic code.",
      },
      {
        label: "Result",
        heading: "All 89 in circulation",
        text: "Across 1,000 simulated scenes every cast entry appeared, with 0 tested rule violations.",
      },
    ],
    sections: [],
  };
  readonly beforeClip = CREATIVE_TOWN_BODY.slice(0, clipPosition);
  readonly afterClip = CREATIVE_TOWN_BODY.slice(clipPosition);
  readonly videoParagraph = CREATIVE_TOWN_VIDEO_PARAGRAPH;
  readonly transcript = CREATIVE_TOWN_VIDEO_TRANSCRIPT;
}
