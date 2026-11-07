import { RouterLink } from '@angular/router';
import { HiddenCookie } from '../../features/cookie-hunt/hidden-cookie';
import { PublicTrack } from '../../services/public-track';
import { Component } from '@angular/core';

@Component({
  imports: [HiddenCookie, PublicTrack, RouterLink],
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {}
