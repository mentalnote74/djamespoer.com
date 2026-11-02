import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CreativeTownCaseStudy } from './creative-town';
import { CREATIVE_TOWN_BODY } from './creative-town.content';
import {
  CREATIVE_TOWN_VIDEO_PARAGRAPH,
  CREATIVE_TOWN_VIDEO_TRANSCRIPT,
} from './creative-town-video.content';

describe('Creative Town approved video addition', () => {
  it('inserts the clip without changing the approved article or hero', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CreativeTownCaseStudy);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const component = fixture.componentInstance;
    expect(component.beforeClip + component.afterClip).toBe(CREATIVE_TOWN_BODY);
    expect(component.afterClip.startsWith('<h2>The Stupid Awards</h2>')).toBe(true);
    expect(root.querySelector('.town-hero iframe')?.getAttribute('src')).toBe(
      '/creative-town-hero/index.html',
    );
    const video = root.querySelector<HTMLIFrameElement>('.town-video iframe')!;
    expect(new URL(video.src).pathname).toBe('/embed/2f5MvVx8RM8');
    expect(new URL(video.src).searchParams.get('autoplay')).toBeNull();
    expect(video.getAttribute('allow')).not.toContain('autoplay');
    expect(video.hasAttribute('allowfullscreen')).toBe(true);
    expect(video.getAttribute('loading')).toBe('lazy');
    expect(video.getAttribute('tabindex')).toBeNull();
    expect(video.title).toContain('guards misunderstand instructions');
    expect(root.querySelector('figcaption')?.textContent).toBe(CREATIVE_TOWN_VIDEO_PARAGRAPH);
    const alternative = root.querySelector('.town-video .visually-hidden')!;
    expect(alternative.hasAttribute('hidden')).toBe(false);
    expect(alternative.getAttribute('aria-hidden')).toBeNull();
    const lines = [...alternative.querySelectorAll('p')].map((p) => p.textContent?.trim());
    expect(lines).toEqual(CREATIVE_TOWN_VIDEO_TRANSCRIPT.map((cue) => `${cue.time}: ${cue.text}`));
    expect(lines).toHaveLength(33);
    expect(root.querySelectorAll('.town-video')).toHaveLength(1);
    expect(video.hasAttribute('aria-describedby')).toBe(false);
  });
});
