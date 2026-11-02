import { Component } from '@angular/core';
import { CaseStudy } from './case-study';
import { SwvSlide } from '../swv-slide/swv-slide';
import { SWV_BODY } from './shady-white-van.content';

@Component({
  selector: 'app-shady-white-van-case-study',
  imports: [CaseStudy, SwvSlide],
  templateUrl: './shady-white-van.html',
  styleUrl: './shady-white-van.scss',
})
export class ShadyWhiteVanCaseStudy {
  readonly study = { title: 'Shady White Van', sections: [] };
  readonly body = SWV_BODY;
}
