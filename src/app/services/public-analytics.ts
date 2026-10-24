import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export type Slide = 'engineering' | 'ux' | 'accessibility' | 'ai' | 'impact' | 'big-dumb-bass';
export const PUBLIC_ROUTES = [
  '/',
  '/blognostisphere/like-a-big-dumb-bass',
  '/about',
  '/thingamajob',
  '/buildometer',
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
  '/case-studies/dr',
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
  evaluation_submitted: Common & { input_method: 'text' | 'url' | 'file' };
  evaluation_completed: Common & { input_method: 'text' | 'url' | 'file' };
  evaluation_failed: Common & { input_method: 'text' | 'url' | 'file' };
  evaluation_result_viewed: Common & { input_method: 'text' | 'url' | 'file' };
  evidence_view: Common & {
    evidence: 'engineering' | 'ux-product' | 'accessibility' | 'ai' | 'impact' | 'buildometer';
  };
  case_study_view: Common & { employer: Employer };
}
export function publicPath(path: string): PublicPath | '/other' {
  const clean = path.replace(/\/$/, '') || '/';
  return PUBLIC_ROUTES.includes(clean as PublicPath) ? (clean as PublicPath) : '/other';
}
@Injectable({ providedIn: 'root' })
export class PublicAnalytics {
  private readonly document = inject(DOCUMENT);
  constructor() {
    // Reuse Angular navigation completion: a clicked link alone is not a page view.
    inject(Router, { optional: true })
      ?.events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (!(event instanceof NavigationEnd)) return;
        const path = event.urlAfterRedirects.split(/[?#]/)[0].replace(/\/$/, '');
        const evidence = [
          'engineering',
          'ux-product',
          'accessibility',
          'ai',
          'impact',
          'buildometer',
        ] as const;
        const page = evidence.find((item) => path === '/' + item);
        if (page) this.track('evidence_view', { location: 'page-content', evidence: page });
        const employer = /^\/(?:work|case-studies)\/(djamespoer|exl|ips|tcc|dr)$/.exec(
          path,
        )?.[1] as Employer | undefined;
        if (employer) this.track('case_study_view', { location: 'page-content', employer });
      });
  }
  private correlation: {
    session: string;
    attempt: string;
    method: 'text' | 'url' | 'file';
    expires: number;
  } | null = null;
  private currentCorrelation() {
    try {
      const stored = this.document.defaultView?.sessionStorage.getItem('thingamajob.funnel');
      if (stored) this.correlation = JSON.parse(stored);
    } catch {
      /* Session-only in-memory fallback; no fingerprinting. */
    }
    if (
      !this.correlation ||
      !Number.isFinite(this.correlation.expires) ||
      !/^[a-f0-9-]{36}$/i.test(this.correlation.session ?? '') ||
      !/^[a-f0-9-]{36}$/i.test(this.correlation.attempt ?? '') ||
      this.correlation.expires <= Date.now()
    ) {
      this.correlation = null;
      try {
        this.document.defaultView?.sessionStorage.removeItem('thingamajob.funnel');
      } catch {
        /* optional */
      }
    }
    return this.correlation;
  }
  beginEvaluation(method: 'text' | 'url' | 'file'): Record<string, string> {
    const previous = this.currentCorrelation();
    const current = (this.correlation = {
      session: previous?.session ?? crypto.randomUUID(),
      attempt: crypto.randomUUID(),
      method,
      expires: previous?.expires ?? Date.now() + 30 * 60 * 1000,
    });
    try {
      this.document.defaultView?.sessionStorage.setItem(
        'thingamajob.funnel',
        JSON.stringify(current),
      );
    } catch {
      /* optional */
    }
    this.track('evaluation_submitted', { location: 'page-content', input_method: method });
    return {
      'Idempotency-Key': current.attempt,
      'X-TAMJ-Session': current.session,
      'X-TAMJ-Method': method,
    };
  }
  private conversion(
    event: keyof EventParameters,
    parameters: EventParameters[keyof EventParameters],
  ) {
    const current = this.currentCorrelation();
    const window = this.document.defaultView;
    if (!current || !window?.fetch) return;
    const p = parameters as unknown as Record<string, string>;
    const context = event.startsWith('evaluation_')
      ? p['input_method']
      : event === 'external_profile_click'
        ? p['profile']
        : event === 'case_study_open' || event === 'case_study_view' || event === 'work_open'
          ? p['employer']
          : event === 'resume_download'
            ? 'public-current'
            : event === 'contact_click'
              ? 'email'
              : event === 'evidence_view'
                ? p['evidence']
                : null;
    if (!context) return;
    // Only finite event/context enums go to the Worker, never the original link, JD or filename.
    void window
      .fetch('/test/thingamajob/events', {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': current.attempt,
          'X-TAMJ-Session': current.session,
        },
        body: JSON.stringify({ event, context }),
      })
      .catch(() => {});
  }
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
        window.localStorage.getItem('portfolio.analytics.internal') === '1'
      )
        return;
      // Server records submit/complete/fail authoritatively. Browser records result visibility
      // and later intent; do not race the first submit before its D1 attempt exists.
      if (!['evaluation_submitted', 'evaluation_completed', 'evaluation_failed'].includes(event))
        this.conversion(event, parameters);
      window.gtag?.('event', event, {
        ...parameters,
        page_path: publicPath(page ?? window.location.pathname),
        cta_location: parameters.location,
      });
    } catch {
      /* Non-critical; do not log URLs, values or provider errors. */
    }
  }
}
