import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PUBLIC_PAGES, publicPageForPath, SITE_ORIGIN } from '../content/public-pages';
import { JOURNAL_DATES } from '../generated/journal-routes';
import { PORTFOLIO_SLIDES } from '../content/portfolio-slides';
export type Location =
  'primary-navigation' | 'hero' | 'home-thingamajob' | 'page-content' | 'footer' | 'carousel' | 'rigby';
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
export const PUBLIC_ROUTES = PUBLIC_PAGES.map(page => '/' + page.path);
type PublicPath = `/${string}`;
type NavigationMethod = 'initial' | 'header' | 'carousel' | 'in-page' | 'rigby' | 'hero' | 'footer' | 'history' | 'route';
interface LinkContext {
  source_page: string;
  destination_path?: string;
  navigation_method: NavigationMethod;
  slide_id?: string;
  location: Location;
}

type Employer = 'djamespoer' | 'exl' | 'ips' | 'tcc' | 'dr';
type Common = { location: Location };
export interface EventParameters {
  rigby_encounter: Common & { action: 'shown' | 'fed' | 'dismissed' };
  resume_download: Common & { asset_name: 'public-current'; resume_id: 'public-current' };
  contact_click: Common & { contact_method: 'email' };
  thingamajob_open: Common & { source: Source; destination_path: '/thingamajob' };
  case_study_open: Common & { employer: Employer; source: Source };
  work_open: Common & { employer: Employer; source: Source };
  carousel_cta_click: Common & { slide: string; destination: PublicPath };
  navigation_click: Common & { destination_path: PublicPath };
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
  const page = publicPageForPath(path);
  if (!page || (page.path.startsWith('product-journal/') &&
    !JOURNAL_DATES.includes(page.path.slice('product-journal/'.length)))) return '/other';
  return ('/' + page.path) as PublicPath;
}
// External campaign values only; never forward arbitrary queries, fragments or entered URLs.
export function campaignQuery(search: string): string {
  const input = new URLSearchParams(search), output = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = input.get(key);
    if (value && /^[a-zA-Z0-9_.-]{1,80}$/.test(value)) output.set(key, value);
  }
  return output.size ? '?' + output.toString() : '';
}
@Injectable({ providedIn: 'root' })
export class PublicAnalytics {
  private readonly document = inject(DOCUMENT);
  private previousPage: string | null = null;
  private pageMethod: NavigationMethod = 'initial';
  private pendingLink: LinkContext | null = null;
  private activeLink: LinkContext | null = null;
  constructor() {
    const click = (event: Event) => this.navigationClick(event as MouseEvent);
    // Route links only, including authored HTML: no blanket button/pointer tracking.
    this.document.addEventListener?.('click', click, true);
    this.document.addEventListener?.('auxclick', click, true);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener?.('click', click, true);
      this.document.removeEventListener?.('auxclick', click, true);
    });
    // Reuse Angular navigation completion: a clicked link alone is not a page view.
    inject(Router, { optional: true })
      ?.events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.pageMethod = this.previousPage === null ? 'initial' :
            event.navigationTrigger === 'popstate' ? 'history' :
            this.pendingLink?.destination_path === publicPath(event.url) ? this.pendingLink.navigation_method : 'route';
          this.pendingLink = null;
        }
        if (!(event instanceof NavigationEnd)) return;
        if (!this.pageView(event.urlAfterRedirects)) return;
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
  private navigationClick(event: MouseEvent): void {
    if (!event.isTrusted || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
    try {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const target = new URL(anchor.href, this.document.location.href);
      const method: NavigationMethod = anchor.closest('header.site-header') ? 'header' :
        anchor.closest('app-carousel') ? 'carousel' : anchor.closest('app-rigby-guide') ? 'rigby' :
        anchor.closest('footer') ? 'footer' : anchor.closest('app-slide-hero') ? 'hero' : 'in-page';
      const location: Location = method === 'header' ? 'primary-navigation' :
        method === 'in-page' ? 'page-content' : method;
      const slide = anchor.closest('[data-slide-id]')?.getAttribute('data-slide-id');
      const slideId = PORTFOLIO_SLIDES.find(s => s.id === slide)?.id;
      const destination = target.origin === this.document.location.origin && !anchor.hasAttribute('download')
        ? publicPath(target.pathname) : '/other';
      const context: LinkContext = { source_page: publicPath(this.document.location.pathname),
        navigation_method: method, location,
        ...(destination !== '/other' ? { destination_path: destination } : {}),
        ...(slideId ? { slide_id: slideId } : {}) };
      this.activeLink = context;
      queueMicrotask(() => { this.activeLink = null; });
      if (destination === '/other' || destination === context.source_page ||
        !anchor.closest('header, main, footer, app-rigby-guide')) return;
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0 && anchor.target !== '_blank')
        this.pendingLink = context;
      if (method === 'carousel' && slideId)
        this.track('carousel_cta_click', { location, slide: slideId, destination });
      else this.track('navigation_click', { location, destination_path: destination });
    } catch { /* Optional telemetry must not affect native links. */ }
  }
  private pageView(url: string): boolean {
    const path = publicPath(url), window = this.document.defaultView;
    if (!window) return false;
    if (path === '/other') { this.previousPage = '/other'; return false; }
    if (path === this.previousPage) return false;
    const source = this.previousPage;
    this.previousPage = path;
    const title = publicPageForPath(path)!.title;
    const pageLocation = SITE_ORIGIN + path;
    // Angular owns page views. Keep the GA stream history option off; verify live collection.
    try {
      if (!this.enabled()) return true;
      const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      const referrer = source ? SITE_ORIGIN + source : this.safeReferrer();
      gtag?.('set', { page_location: pageLocation, page_title: title, page_referrer: referrer });
      gtag?.('event', 'page_view', { page_path: path, page_location: pageLocation +
        (source === null ? campaignQuery(window.location.search) : ''), page_title: title,
        page_referrer: referrer, source_page: source ?? '/entry', navigation_method: this.pageMethod });
    } catch { /* Best effort; never log page data or retry duplicate views. */ }
    return true;
  }
  private safeReferrer(): string {
    try {
      const referrer = new URL(this.document.referrer);
      if (!['http:', 'https:'].includes(referrer.protocol)) return '';
      return referrer.origin === SITE_ORIGIN ? SITE_ORIGIN + publicPath(referrer.pathname) : referrer.origin + '/';
    } catch { return ''; }
  }
  private enabled(): boolean {
    const window = this.document.defaultView;
    return !!window && ['djamespoer.com', 'www.djamespoer.com'].includes(window.location.hostname) &&
      window.localStorage.getItem('portfolio.analytics.internal') !== '1';
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
      if (!window || !this.enabled()) return;
      // Server records submit/complete/fail authoritatively. Browser records result visibility
      // and later intent; do not race the first submit before its D1 attempt exists.
      if (!['evaluation_submitted', 'evaluation_completed', 'evaluation_failed'].includes(event))
        this.conversion(event, parameters);
      const { source, ...safe } = parameters as EventParameters[E] & { source?: Source };
      const context = this.activeLink;
      window.gtag?.('event', event, {
        ...safe,
        source_page: publicPath(page ?? window.location.pathname),
        ...(source ? { interaction_source: source } : {}),
        ...(context ? { source_page: context.source_page, destination_path: context.destination_path,
          navigation_method: context.navigation_method, slide_id: context.slide_id } : {}),
        page_path: publicPath(page ?? window.location.pathname),
        cta_location: parameters.location,
      });
    } catch {
      /* Non-critical; do not log URLs, values or provider errors. */
    }
  }
}
