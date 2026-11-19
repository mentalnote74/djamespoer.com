import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTrack } from '../../services/public-track';
import { ARTICLES } from '../../content/public-pages';
import { LucideArrowUpRight } from '@lucide/angular';
@Component({
  selector: 'app-project-gallery',
  imports: [RouterLink, PublicTrack, LucideArrowUpRight],
  templateUrl: './project-gallery.html',
  styleUrl: './project-gallery.scss',
})
export class ProjectGallery {
  readonly articles = ARTICLES.slice(0, 3);
}
