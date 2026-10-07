import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-work',
  imports: [RouterLink],
  templateUrl: './work.html',
  styleUrl: './work.scss',
})
export class Work {
  readonly heading = input<string>('Work');
  readonly caseStudy = input<boolean>(false);
  readonly projects = [
    { path: '/work/exl', name: 'EXL / LifePRO' },
    { path: '/work/ips', name: 'IPS / PowerSchool' },
    { path: '/work/tcc', name: 'TCC Software Solutions' },
    { path: '/work/dr', name: 'D&R' },
  ];
  readonly sections = [
    'Context',
    'Problem',
    'Role and responsibilities',
    'Decisions',
    'Implementation',
    'Outcomes and evidence',
  ];
}
