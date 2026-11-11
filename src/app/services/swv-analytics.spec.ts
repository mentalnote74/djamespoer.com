import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PublicAnalytics } from './public-analytics';
import { publicEventParameters } from './public-event-parameters';

describe('SWV bounded parent analytics', () => {
  let cookie: string;
  let internal: string | null;
  const gtag = vi.fn();
  const activity = vi.fn();
  const view = {
    location: new URL('https://djamespoer.com/'),
    localStorage: { getItem: () => internal },
    gtag: gtag as typeof gtag | undefined,
    dispatchEvent: activity,
    'ga-disable-G-WQBYGF4Z8F': false,
  };
  beforeEach(() => {
    cookie = '';
    internal = null;
    gtag.mockReset();
    activity.mockReset();
    view.gtag = gtag;
    view.location = new URL('https://djamespoer.com/');
    view['ga-disable-G-WQBYGF4Z8F'] = false;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            get cookie() {
              return cookie;
            },
            location: view.location,
            defaultView: view,
          },
        },
      ],
    });
  });
  it('emits once per parent service lifetime without a page view/session or passive activity event', () => {
    const service = TestBed.inject(PublicAnalytics);
    service.carouselExposure('shady-white-van');
    service.carouselExposure('shady-white-van');
    expect(gtag).toHaveBeenCalledExactlyOnceWith('event', 'carousel_exposure', {
      location: 'carousel',
      slide: 'shady-white-van',
      source_page: '/',
      page_path: '/',
      cta_location: 'carousel',
    });
    expect(activity).not.toHaveBeenCalled();
  });
  it.each(['denial', 'internal', 'disabled', 'missing-tag'] as const)(
    'does not consume exposure under %s; allows a later eligible exposure',
    (reason) => {
      const service = TestBed.inject(PublicAnalytics);
      if (reason === 'denial') cookie = 'portfolio_analytics_consent=denied';
      if (reason === 'internal') internal = '1';
      if (reason === 'disabled') view['ga-disable-G-WQBYGF4Z8F'] = true;
      if (reason === 'missing-tag') view.gtag = undefined;
      service.carouselExposure('shady-white-van');
      expect(gtag).not.toHaveBeenCalled();
      cookie = '';
      internal = null;
      view['ga-disable-G-WQBYGF4Z8F'] = false;
      view.gtag = gtag;
      service.carouselExposure('shady-white-van');
      service.carouselExposure('shady-white-van');
      expect(gtag).toHaveBeenCalledTimes(1);
    },
  );
  it('does not consume a failed transport attempt or leak caller-supplied fields', () => {
    const service = TestBed.inject(PublicAnalytics);
    gtag.mockImplementationOnce(() => {
      throw Error('blocked');
    });
    service.carouselExposure('shady-white-van');
    service.carouselExposure('shady-white-van');
    expect(gtag).toHaveBeenCalledTimes(2);
    expect(
      publicEventParameters(
        'carousel_exposure',
        { location: 'carousel', slide: 'shady-white-van', url: 'private', utm_source: 'hidden' },
        () => '/',
      ),
    ).toEqual({ location: 'carousel', slide: 'shady-white-van' });
    expect(
      publicEventParameters(
        'carousel_exposure',
        { location: 'carousel', slide: 'invented' },
        () => '/',
      ),
    ).toBeNull();
    expect(
      publicEventParameters(
        'external_project_click',
        { location: 'page-content', project: 'unknown' },
        () => '/',
      ),
    ).toBeNull();
  });
});
