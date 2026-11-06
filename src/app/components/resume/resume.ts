import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-resume',
  imports: [RouterLink, PublicTrack],
  templateUrl: './resume.html',
  styleUrl: './resume.scss',
})
export class Resume {}
