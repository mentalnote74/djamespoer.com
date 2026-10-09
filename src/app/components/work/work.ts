import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-work',
  imports: [RouterLink],
  templateUrl: './work.html',
  styleUrl: './work.scss',
})
export class Work {
  readonly projects = [
    {
      path: '/work/djamespoer',
      name: 'djamespoer.com',
      description:
        'Current professional project: product ownership, UX engineering and front-end architecture.',
    },
    { path: '/work/exl', name: 'EXL / LifePRO' },
    { path: '/work/ips', name: 'IPS / PowerSchool' },
    { path: '/work/tcc', name: 'TCC Software Solutions' },
    { path: '/work/dr', name: 'Dreyer & Reinbold' },
  ];
}
