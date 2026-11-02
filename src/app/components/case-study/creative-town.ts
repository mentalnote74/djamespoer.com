import { Component } from '@angular/core';
import { CaseStudy } from './case-study';
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
  readonly study = { title: 'Creative Town', sections: [] };
  readonly beforeClip = CREATIVE_TOWN_BODY.slice(0, clipPosition);
  readonly afterClip = CREATIVE_TOWN_BODY.slice(clipPosition);
  readonly videoParagraph = CREATIVE_TOWN_VIDEO_PARAGRAPH;
  readonly transcript = CREATIVE_TOWN_VIDEO_TRANSCRIPT;
}
