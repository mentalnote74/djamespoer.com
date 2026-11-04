import { LucideMail, LucideDownload } from '@lucide/angular';
import { PublicTrack } from '../../services/public-track';
import { AfterViewInit, Component, input, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUILD_TIME } from '../../generated/build-info';

type ParticlesJs = {
  load: (elementId: string, configPath: string, callback?: () => void) => void;
};

type ParticlesWindow = Window & {
  particlesJS?: ParticlesJs;
  pJSDom?: { pJS: {
    canvas: { el: HTMLCanvasElement };
    fn: { drawAnimFrame?: number; checkAnimFrame?: number; vendors: { draw(): void } };
  } }[];
};

@Component({
  imports: [LucideMail, LucideDownload, PublicTrack, RouterLink],
  selector: 'app-hero',
  styleUrl: './hero.scss',
  templateUrl: './hero.html',
})
export class Hero implements AfterViewInit, OnDestroy {
  readonly carouselPresentation = input(false);
  readonly lastUpdated = new Date(BUILD_TIME).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  private particleScript?: HTMLScriptElement;
  private particleTimer?: number;
  private motion?: MediaQueryList;
  private destroyed = false;
  private readonly motionChanged = (): void => {
    window.clearTimeout(this.particleTimer);
    const instance = (window as ParticlesWindow).pJSDom?.find(
      item => item.pJS.canvas.el.parentElement?.id === 'hero-particles',
    );
    if (this.motion?.matches || this.destroyed) {
      for (const frame of [instance?.pJS.fn.drawAnimFrame, instance?.pJS.fn.checkAnimFrame])
        if (frame !== undefined) window.cancelAnimationFrame(frame);
    } else if (instance) instance.pJS.fn.vendors.draw();
    else this.particleTimer = window.setTimeout(() => this.loadParticles(), 500);
  };

  ngAfterViewInit(): void {
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motion.addEventListener('change', this.motionChanged);
    this.motionChanged();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.motionChanged();
    this.motion?.removeEventListener('change', this.motionChanged);
    if (this.particleTimer) {
      window.clearTimeout(this.particleTimer);
    }

    document.querySelector('#hero-particles')?.replaceChildren();

    this.particleScript?.remove();
  }

  private loadParticles(): void {
    if (this.destroyed || this.motion?.matches) return;
    const particleWindow = window as ParticlesWindow;

    if (particleWindow.particlesJS) {
      this.initializeParticles();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-particles-js]');

    if (existingScript) {
      existingScript.addEventListener('load', () => this.initializeParticles(), { once: true });

      return;
    }

    const script = document.createElement('script');

    script.src = '/js/particles.min.js';
    script.async = true;
    script.dataset['particlesJs'] = 'true';

    script.addEventListener('load', () => this.initializeParticles(), { once: true });

    document.body.appendChild(script);

    this.particleScript = script;
  }

  private initializeParticles(): void {
    if (this.destroyed || this.motion?.matches) return;
    const particleWindow = window as ParticlesWindow;

    particleWindow.particlesJS?.load('hero-particles', '/assets/particles/hero.json', () => {
      // Preference may change while the library's configuration request is pending.
      if (this.motion?.matches || this.destroyed) this.motionChanged();
    });
  }
}
