import { publicEventParameters } from './public-event-parameters';
import { publicPath } from './public-analytics';
import { COOKIE_TRAIL } from '../features/cookie-hunt/cookie-trail';

describe('SCRUM-141/169 runtime analytics privacy boundary', () => {
  it('drops all undeclared private fields even when a runtime caller bypasses TypeScript', () => {
    expect(
      publicEventParameters(
        'evaluation_submitted',
        {
          location: 'page-content',
          input_method: 'file',
          filename: 'private.docx',
          jobDescription: 'private text',
          url: 'https://secret.invalid',
          email: 'private@example.invalid',
        },
        publicPath,
      ),
    ).toEqual({ location: 'page-content', input_method: 'file' });
  });
  it.each([
    'evaluation_input_selected',
    'evaluation_input_prepared',
    'evaluation_submitted',
    'evaluation_completed',
    'evaluation_failed',
    'evaluation_result_viewed',
  ] as const)('only allows finite methods for %s', (event) => {
    expect(
      publicEventParameters(
        event,
        { location: 'page-content', input_method: 'private text' },
        publicPath,
      ),
    ).toBeNull();
    expect(
      publicEventParameters(event, { location: 'page-content', input_method: 'url' }, publicPath),
    ).toEqual({ location: 'page-content', input_method: 'url' });
  });
  it('allows only registry cookie IDs with the matching finite flavor', () => {
    for (const stop of COOKIE_TRAIL)
      expect(
        publicEventParameters(
          'rigby_cookie',
          { location: 'rigby', action: 'fed', cookie_id: stop.id, cookie_flavor: stop.flavor },
          publicPath,
        ),
      ).not.toBeNull();
    expect(
      publicEventParameters(
        'rigby_cookie',
        { location: 'rigby', action: 'fed', cookie_id: 'private', cookie_flavor: 0 },
        publicPath,
      ),
    ).toBeNull();
    expect(
      publicEventParameters(
        'rigby_cookie',
        { location: 'rigby', action: 'fed', cookie_id: 'home', cookie_flavor: 99 },
        publicPath,
      ),
    ).toBeNull();
  });
  it('rejects arbitrary failure stages, surface names, routes and event names', () => {
    expect(
      publicEventParameters(
        'evaluation_failed',
        { location: 'page-content', input_method: 'text', failure_stage: 'private message' },
        publicPath,
      ),
    ).toBeNull();
    expect(
      publicEventParameters(
        'rigby_encounter',
        { location: 'rigby', action: 'shown', surface: 'private' },
        publicPath,
      ),
    ).toBeNull();
    expect(
      publicEventParameters(
        'navigation_click',
        { location: 'page-content', destination_path: '/private?secret=1' },
        publicPath,
      ),
    ).toBeNull();
  });
});

describe('SCRUM-47/216 coffee challenge analytics boundary', () => {
  const result = {
    location: 'coffee-drawer',
    site_host: 'acme-widgets.com',
    verdict: 'visitor_buys',
    matchups_won_visitor: 0,
    matchups_won_james: 7,
    matchups_tied: 1,
    visitor_mobile_performance: 58,
    visitor_desktop_performance: 81,
    james_mobile_performance: 87,
    james_desktop_seo: 100,
  };
  it('sends the hostname, the matchup tally and integer scores per test only', () => {
    expect(
      publicEventParameters('coffee_result', { ...result, url: 'https://x.com/a?b', overall: 90 }, publicPath),
    ).toEqual(result);
  });
  it('refuses a full URL, a path, an out-of-range score or tally', () => {
    for (const site_host of ['https://acme.com', 'acme.com/pricing', 'acme.com?q=1', 'acme'])
      expect(
        publicEventParameters('coffee_submitted', { location: 'coffee-drawer', site_host }, publicPath),
      ).toBeNull();
    expect(publicEventParameters('coffee_result', { ...result, james_desktop_seo: 101 }, publicPath)).toBeNull();
    expect(publicEventParameters('coffee_result', { ...result, matchups_tied: 9 }, publicPath)).toBeNull();
  });
  it('a solo result carries scores but no host and no tally', () => {
    const solo = { location: 'coffee-drawer', verdict: 'solo', james_mobile_performance: 87 };
    expect(publicEventParameters('coffee_result', solo, publicPath)).toEqual(solo);
    expect(publicEventParameters('coffee_result', { ...solo, matchups_tied: 0 }, publicPath)).toBeNull();
    expect(publicEventParameters('coffee_result', { ...solo, site_host: 'acme.com' }, publicPath)).toBeNull();
    expect(
      publicEventParameters('coffee_solo_scan', { location: 'coffee-drawer', trigger: 'own_url' }, publicPath),
    ).toEqual({ location: 'coffee-drawer', trigger: 'own_url' });
  });
  it('allows an invalid-URL error without a host', () => {
    expect(
      publicEventParameters('coffee_error', { location: 'coffee-drawer', error_type: 'invalid_url' }, publicPath),
    ).toEqual({ location: 'coffee-drawer', error_type: 'invalid_url' });
  });
});
