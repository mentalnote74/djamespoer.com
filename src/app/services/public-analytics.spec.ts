import { Subject } from 'rxjs';
import { NavigationStart, NavigationEnd, Router } from '@angular/router';
﻿import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ElementRef } from '@angular/core';
import { PublicAnalytics, publicPath } from './public-analytics';
import { PublicTrack } from './public-track';
describe('Public analytics transport', () => {
  const gtag = vi.fn();
  const storage = vi.fn(() => null as string | null);
  const window = {
    location: new URL('https://djamespoer.com/'),
    localStorage: { getItem: storage },
    gtag,
  };
  beforeEach(() => {
    gtag.mockReset();
    storage.mockReset().mockReturnValue(null);
    window.location = new URL('https://djamespoer.com/');
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: window } }],
    });
  });
  it('preserves homepage attribution and legacy fields with normalized typed context', () => {
    TestBed.inject(PublicAnalytics).track('thingamajob_open', {
      location: 'home-thingamajob',
      source: 'homepage',
      destination_path: '/thingamajob',
    });
    expect(gtag).toHaveBeenCalledExactlyOnceWith('event', 'thingamajob_open', {
      location: 'home-thingamajob',
      interaction_source: 'homepage',
      destination_path: '/thingamajob',
      source_page: '/',
      page_path: '/',
      cta_location: 'home-thingamajob',
    });
  });
  it('identifies the dedicated article slide without collapsing its destination to other', () => {
    TestBed.inject(PublicAnalytics).track('carousel_cta_click', {
      location: 'carousel',
      slide: 'big-dumb-bass',
      destination: '/blognostisphere/like-a-big-dumb-bass',
    });
    expect(gtag).toHaveBeenCalledExactlyOnceWith('event', 'carousel_cta_click', {
      location: 'carousel',
      slide: 'big-dumb-bass',
      destination: '/blognostisphere/like-a-big-dumb-bass',
      source_page: '/',
      page_path: '/',
      cta_location: 'carousel',
    });
    expect(publicPath('/blognostisphere/like-a-big-dumb-bass')).toBe(
      '/blognostisphere/like-a-big-dumb-bass',
    );
  });
  it('drops arbitrary route data and strips queries/hashes from the browser path', () => {
    expect(publicPath('/private/client-record')).toBe('/other');
    window.location = new URL('https://djamespoer.com/about?email=private@example.invalid#private');
    TestBed.inject(PublicAnalytics).track('contact_click', {
      location: 'primary-navigation',
      contact_method: 'email',
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/private|@|\?|#/);
  });
  it('does not send on dev/protected/other-client hosts or internal traffic', () => {
    const service = TestBed.inject(PublicAnalytics);
    for (const host of [
      'localhost',
      'api-test.djamespoer.com',
      'api.djamespoer.com',
      'nurseericakortz.com',
    ]) {
      window.location = new URL('https://' + host);
      service.track('cookie_settings_open', { location: 'footer' });
    }
    window.location = new URL('https://djamespoer.com');
    storage.mockReturnValue('1');
    service.track('cookie_settings_open', { location: 'footer' });
    expect(gtag).not.toHaveBeenCalled();
  });
  it('swallows GA and storage failures without logging', () => {
    const service = TestBed.inject(PublicAnalytics);
    gtag.mockImplementation(() => {
      throw Error('blocked');
    });
    expect(() => service.track('cookie_settings_open', { location: 'footer' })).not.toThrow();
    storage.mockImplementation(() => {
      throw Error('storage denied');
    });
    expect(() => service.track('cookie_settings_open', { location: 'footer' })).not.toThrow();
  });
  it('joins private follow-up intent without sending correlation IDs or submitted content to GA', async () => {
    const fetch = vi.fn().mockResolvedValue({});
    const data = new Map<string, string>();
    const testWindow = {
      ...window,
      fetch,
      sessionStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
      },
    };
    TestBed.overrideProvider(DOCUMENT, { useValue: { defaultView: testWindow } });
    const service = TestBed.inject(PublicAnalytics);
    const first = service.beginEvaluation('file');
    service.track('evaluation_result_viewed', { location: 'page-content', input_method: 'file' });
    service.track('external_profile_click', { location: 'footer', profile: 'linkedin' });
    expect(fetch).toHaveBeenCalledTimes(2);
    const [, options] = fetch.mock.calls[1];
    expect(options.headers['Idempotency-Key']).toBe(first['Idempotency-Key']);
    expect(options.headers['X-TAMJ-Session']).toBe(first['X-TAMJ-Session']);
    expect(JSON.parse(options.body)).toEqual({
      event: 'external_profile_click',
      context: 'linkedin',
    });
    const next = service.beginEvaluation('text');
    expect(next['Idempotency-Key']).not.toBe(first['Idempotency-Key']);
    expect(next['X-TAMJ-Session']).toBe(first['X-TAMJ-Session']);
    expect(JSON.stringify(gtag.mock.calls)).not.toContain(first['X-TAMJ-Session']);
    expect(JSON.stringify(gtag.mock.calls)).not.toContain(first['Idempotency-Key']);
    const saved = JSON.parse(data.get('thingamajob.funnel')!);
    data.set('thingamajob.funnel', JSON.stringify({ ...saved, expires: Date.now() - 1 }));
    expect(service.beginEvaluation('url')['X-TAMJ-Session']).not.toBe(first['X-TAMJ-Session']);
  });
});
describe('Explicit public link hooks', () => {
  const track = vi.fn();
  let anchor: HTMLAnchorElement;
  let hook: PublicTrack;
  beforeEach(() => {
    track.mockReset();
    anchor = document.createElement('a');
    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: new ElementRef(anchor) },
        { provide: DOCUMENT, useValue: { location: new URL('https://djamespoer.com/') } },
        { provide: PublicAnalytics, useValue: { track } },
      ],
    });
    hook = TestBed.runInInjectionContext(() => new PublicTrack());
  });
  const activate = () => hook.activate({ isTrusted: true, type: 'click', button: 0 } as MouseEvent);
  it.each([
    ['https://djamespoer.com/assets/resume/d-james-poer-resume.pdf', 'resume_download'],
    ['mailto:private@example.invalid?body=private', 'contact_click'],
    ['https://djamespoer.com/thingamajob?private=hidden', 'thingamajob_open'],
    ['https://djamespoer.com/work/ips', 'case_study_open'],
    ['https://www.linkedin.com/in/djamespoer', 'external_profile_click'],
  ])('counts %s with safe parameters only', (href, event) => {
    anchor.href = href;
    anchor.download = '';
    activate();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0][0]).toBe(event);
    expect(JSON.stringify(track.mock.calls[0][1])).not.toMatch(/private|@|https?:|mailto:|\?/);
  });
  it('does not treat repositories, unrelated downloads or protected destinations as profile/product entries', () => {
    for (const href of [
      'https://github.com/mentalnote74/djamespoer.com',
      'https://djamespoer.com/other.pdf',
      'https://api-test.djamespoer.com/thingamajob',
    ]) {
      anchor.href = href;
      anchor.download = '';
      activate();
    }
    expect(track).not.toHaveBeenCalled();
  });
  it('ignores synthetic/right-click input and counts middle-click once', () => {
    anchor.href = 'https://djamespoer.com/thingamajob';
    hook.activate({ isTrusted: false, type: 'click', button: 0 } as MouseEvent);
    hook.activate({ isTrusted: true, type: 'click', button: 2 } as MouseEvent);
    expect(track).not.toHaveBeenCalled();
    hook.activate({ isTrusted: true, type: 'auxclick', button: 1 } as MouseEvent);
    expect(track).toHaveBeenCalledTimes(1);
  });
});

// A router-shaped subject isolates completed routes without bootstrapping unrelated features.
describe('public route journeys', () => {
  const gtag=vi.fn();
  let events: Subject<NavigationStart | NavigationEnd>;
  let handlers: Map<string, (event: MouseEvent) => void>;
  let location: URL;
  const route=(id:number,path:string,trigger:'imperative'|'popstate'='imperative')=>{
    events.next(new NavigationStart(id,path,trigger));
    events.next(new NavigationEnd(id,path,path));
  };
  beforeEach(()=>{
    gtag.mockReset();events=new Subject();handlers=new Map();
    location=new URL('https://djamespoer.com/blognostisphere?utm_source=linkedin&utm_medium=social&secret=hidden#private');
    TestBed.configureTestingModule({providers:[
      {provide:Router,useValue:{events}},
      {provide:DOCUMENT,useValue:{location,referrer:'https://www.linkedin.com/feed/?private=hidden',
        addEventListener:(name:string,fn:(event:MouseEvent)=>void)=>handlers.set(name,fn),removeEventListener:vi.fn(),
        defaultView:{location,localStorage:{getItem:()=>null},gtag}}},
    ]});TestBed.inject(PublicAnalytics);
  });
  it('covers public articles/journal, counts initial/completed/history once, and excludes query-only or unknown routes',()=>{
    route(1,'/blognostisphere');route(2,'/about');route(3,'/about?email=hidden#private');
    route(4,'/blognostisphere','popstate');route(5,'/private/person');route(6,'/about','popstate');
    const views=gtag.mock.calls.filter(c=>c[0]==='event'&&c[1]==='page_view');
    expect(views).toHaveLength(4);
    expect(views[0][2].page_title).toBe('Blognostisphere | D. James Poer');
    expect(views[0][2].page_location).toBe('https://djamespoer.com/blognostisphere?utm_source=linkedin&utm_medium=social');
    expect(views[0][2].page_referrer).toBe('https://www.linkedin.com/');
    expect(views[2][2].navigation_method).toBe('history');
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/hidden|secret|person|#private/);
    expect(publicPath('/blognostisphere/the-difference-between-good-and-good-enough')).not.toBe('/other');
    expect(publicPath('/product-journal/2026-10-22')).not.toBe('/other');
    expect(publicPath('/product-journal/2099-01-01')).toBe('/other');
  });
  it('distinguishes a header link from a carousel CTA and bounds its slide/context',()=>{
    route(1,'/blognostisphere');
    const header=document.createElement('header');header.className='site-header';header.innerHTML='<a href="https://djamespoer.com/about?private=hidden">About</a>';
    const click=(anchor:HTMLAnchorElement)=>handlers.get('click')!({isTrusted:true,type:'click',button:0,target:anchor} as unknown as MouseEvent);
    click(header.querySelector('a')!);route(2,'/about');
    const carousel=document.createElement('main');carousel.innerHTML='<app-carousel><section data-slide-id="djp-conservatory"><a href="https://djamespoer.com/work/djamespoer">Explore</a></section></app-carousel>';
    click(carousel.querySelector('a')!);route(3,'/work/djamespoer');
    const clicks=gtag.mock.calls.filter(c=>['navigation_click','carousel_cta_click'].includes(c[1]));
    expect(clicks).toHaveLength(2);
    expect(clicks[0][2]).toMatchObject({navigation_method:'header',destination_path:'/about',cta_location:'primary-navigation'});
    expect(clicks[1][2]).toMatchObject({navigation_method:'carousel',destination_path:'/work/djamespoer',slide_id:'djp-conservatory'});
    expect(JSON.stringify(clicks)).not.toContain('private');
  });
});
