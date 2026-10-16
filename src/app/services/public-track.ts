import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, inject, input } from '@angular/core';
import { Location, PublicAnalytics, Source, Slide, publicPath } from './public-analytics';
@Directive({
  selector: 'a[publicTrack]',
  host: { '(click)': 'activate($event)', '(auxclick)': 'activate($event)' },
})
export class PublicTrack {
  readonly trackLocation = input<Location>('page-content');
  readonly trackSource = input<Source>('page-content');
  readonly trackSlide = input<Slide>();
  private readonly anchor = inject<ElementRef<HTMLAnchorElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(PublicAnalytics);
  activate(event: MouseEvent): void {
    if (!event.isTrusted || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0))
      return;
    try {
      const anchor = this.anchor.nativeElement;
      const target = new URL(anchor.href, this.document.location.href);
      const location = this.trackLocation(),
        source = this.trackSource();
      const page = this.document.location.pathname;
      if (target.protocol === 'mailto:')
        this.analytics.track('contact_click', { location, contact_method: 'email' }, page);
      else if (target.origin === this.document.location.origin) {
        if (
          anchor.hasAttribute('download') &&
          target.pathname === '/assets/resume/d-james-poer-resume.pdf'
        )
          this.analytics.track(
            'resume_download',
            { location, asset_name: 'public-current', resume_id: 'public-current' },
            page,
          );
        const route = publicPath(target.pathname);
        if (route === '/thingamajob')
          this.analytics.track(
            'thingamajob_open',
            { location, source, destination_path: '/thingamajob' },
            page,
          );
        const employers = {
          '/work/djamespoer': 'djamespoer',
          '/work/exl': 'exl',
          '/case-studies/exl': 'exl',
          '/work/ips': 'ips',
          '/work/tcc': 'tcc',
          '/work/dr': 'dr',
        } as const;
        if (route in employers) {
          const employer = employers[route as keyof typeof employers];
          this.analytics.track(
            source === 'work' ? 'work_open' : 'case_study_open',
            { location, employer, source },
            page,
          );
        }
        const slide = this.trackSlide();
        if (slide && route !== '/other')
          this.analytics.track('carousel_cta_click', { location, slide, destination: route }, page);
      } else {
        // Profile types only, never send handles, full URLs or queries. Repositories are not profiles.
        if (target.hostname === 'www.linkedin.com' && /^\/in\/[^/]+\/?$/.test(target.pathname))
          this.analytics.track('external_profile_click', { location, profile: 'linkedin' }, page);
        if (target.hostname === 'github.com' && /^\/[^/]+\/?$/.test(target.pathname))
          this.analytics.track('external_profile_click', { location, profile: 'github' }, page);
      }
    } catch {
      /* Preserve native activation/navigation when telemetry is unavailable. */
    }
  }
}
