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

describe('SCRUM-47 coffee challenge analytics boundary', () => {
  const result = {
    location: 'coffee-drawer',
    site_host: 'acme-widgets.com',
    verdict: 'visitor_buys',
    visitor_score: 87,
    james_score: 98,
    visitor_performance: 72,
    visitor_accessibility: 88,
    visitor_best_practices: 96,
    visitor_seo: 91,
  };
  it('sends the hostname and integer scores only', () => {
    expect(publicEventParameters('coffee_result', { ...result, url: 'https://x.com/a?b' }, publicPath))
      .toEqual(result);
  });
  it('refuses a full URL, a path or an out-of-range score', () => {
    for (const site_host of ['https://acme.com', 'acme.com/pricing', 'acme.com?q=1', 'acme'])
      expect(publicEventParameters('coffee_submitted', { location: 'coffee-drawer', site_host }, publicPath))
        .toBeNull();
    expect(publicEventParameters('coffee_result', { ...result, visitor_seo: 101 }, publicPath)).toBeNull();
  });
  it('allows an invalid-URL error without a host', () => {
    expect(
      publicEventParameters('coffee_error', { location: 'coffee-drawer', error_type: 'invalid_url' }, publicPath),
    ).toEqual({ location: 'coffee-drawer', error_type: 'invalid_url' });
  });
});
