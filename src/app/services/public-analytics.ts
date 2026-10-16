import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
export type Location =
  'primary-navigation' | 'hero' | 'home-thingamajob' | 'page-content' | 'footer' | 'carousel';
export type Source =
  | 'navigation'
  | 'homepage'
  | 'work'
  | 'case-study'
  | 'carousel'
  | 'hero'
  | 'page-content'
  | 'footer';
export type Slide = 'engineering' | 'ux' | 'accessibility' | 'ai' | 'impact';
export const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/thingamajob',
  '/engineering',
  '/ux-product',
  '/accessibility',
  '/ai',
  '/creative',
  '/impact',
  '/cookie-policy',
  '/work/djamespoer',
  '/work/exl',
  '/case-studies/exl',
  '/work/ips',
  '/case-studies/ips',
  '/work/tcc',
  '/case-studies/tcc',
  '/work/dr',
] as const;
type PublicPath = (typeof PUBLIC_ROUTES)[number];
type Employer = 'djamespoer' | 'exl' | 'ips' | 'tcc' | 'dr';
type Common = { location: Location };
export interface EventParameters {
  resume_download: Common & { asset_name: 'public-current'; resume_id: 'public-current' };
  contact_click: Common & { contact_method: 'email' };
  thingamajob_open: Common & { source: Source; destination_path: '/thingamajob' };
  case_study_open: Common & { employer: Employer; source: Source };
  work_open: Common & { employer: Employer; source: Source };
  carousel_cta_click: Common & { slide: Slide; destination: PublicPath };
  cookie_settings_open: Common;
  external_profile_click: Common & { profile: 'linkedin' | 'github' };
}
export function publicPath(path: string): PublicPath | '/other' {
  const clean = path.replace(/\/$/, '') || '/';
  return PUBLIC_ROUTES.includes(clean as PublicPath) ? (clean as PublicPath) : '/other';
}
@Injectable({ providedIn: 'root' })
export class PublicAnalytics {
  private readonly document = inject(DOCUMENT);
  track<E extends keyof EventParameters>(
    event: E,
    parameters: EventParameters[E],
    page?: string,
  ): void {
    // Optional telemetry never blocks a user action, even when browser storage/GA throws.
    try {
      const window = this.document.defaultView as
        (Window & { gtag?: (command: string, name: string, parameters: object) => void }) | null;
      if (
        !window ||
        !['djamespoer.com', 'www.djamespoer.com'].includes(window.location.hostname) ||
        window.localStorage.getItem('portfolio.analytics.internal') === '1' ||
        typeof window.gtag !== 'function'
      )
        return;
      window.gtag('event', event, {
        ...parameters,
        page_path: publicPath(page ?? window.location.pathname),
        cta_location: parameters.location,
      });
    } catch {
      /* Non-critical; do not log URLs, values or provider errors. */
    }
  }
}
