import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { BUILD_TIME } from '../../generated/build-info';

type ParticlesJs = {
  load: (elementId: string, configPath: string, callback?: () => void) => void;
};

type ParticlesWindow = Window & {
  particlesJS?: ParticlesJs;
};

@Component({
  imports: [],
  selector: 'app-hero',
  styleUrl: './hero.scss',
  templateUrl: './hero.html',
})
export class Hero implements AfterViewInit, OnDestroy {
  readonly lastUpdated = new Date(BUILD_TIME).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  private particleScript?: HTMLScriptElement;
  private particleTimer?: number;

  ngAfterViewInit(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    this.particleTimer = window.setTimeout(() => {
      this.loadParticles();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.particleTimer) {
      window.clearTimeout(this.particleTimer);
    }

    document.querySelector('#hero-particles')?.replaceChildren();

    this.particleScript?.remove();
  }

  private loadParticles(): void {
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
    const particleWindow = window as ParticlesWindow;

    particleWindow.particlesJS?.load('hero-particles', '/assets/particles/hero.json');
  }
}
