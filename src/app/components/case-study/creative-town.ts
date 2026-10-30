import { Component } from '@angular/core';
import { CaseStudy } from './case-study';
import { CREATIVE_TOWN_BODY } from './creative-town.content';

@Component({
  selector: 'app-creative-town-case-study',
  imports: [CaseStudy],
  templateUrl: './creative-town.html',
  styleUrl: './creative-town.scss',
})
export class CreativeTownCaseStudy {
  readonly study = { title: 'Creative Town', sections: [] };
  readonly body = CREATIVE_TOWN_BODY;
}
