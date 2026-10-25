import { HiddenCookie } from '../../features/cookie-hunt/hidden-cookie';
import { Component } from '@angular/core';

@Component({
  imports: [HiddenCookie],
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {}
