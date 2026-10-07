import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
  host: { '(keydown.escape)': 'closeFromEscape($event)' },
})
export class Header {
  readonly mobileOpen = signal(false);
  readonly openSection = signal<'work' | 'perspectives' | null>(null);
  readonly perspectives = [
    { path: '/engineering', label: 'Engineering' },
    { path: '/ux-product', label: 'UX & Product' },
    { path: '/accessibility', label: 'Accessibility' },
    { path: '/ai', label: 'AI & Innovation' },
    { path: '/creative', label: 'Creative' },
    { path: '/impact', label: 'Impact' },
  ];
  readonly work = [
    { path: '/work', label: 'All Work' },
    { path: '/work/exl', label: 'EXL / LifePRO' },
    { path: '/work/ips', label: 'IPS / PowerSchool' },
    { path: '/work/tcc', label: 'TCC Software Solutions' },
    { path: '/work/dr', label: 'D&R' },
  ];
  private sectionButton: HTMLButtonElement | null = null;
  private menuButton: HTMLButtonElement | null = null;

  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.mobileOpen.set(false);
          this.openSection.set(null);
        }
      });
  }

  closeOnFocusLeave(event: FocusEvent): void {
    const navigation = event.currentTarget as HTMLElement;
    if (!(event.relatedTarget instanceof Node) || !navigation.contains(event.relatedTarget)) {
      this.openSection.set(null);
    }
  }

  toggleMenu(button: HTMLButtonElement): void {
    this.menuButton = button;
    this.mobileOpen.update((open) => !open);
    this.openSection.set(null);
  }

  toggleSection(section: 'work' | 'perspectives', button: HTMLButtonElement): void {
    this.sectionButton = button;
    this.openSection.update((open) => (open === section ? null : section));
  }

  closeFromEscape(event: Event): void {
    if (this.openSection()) {
      this.openSection.set(null);
      this.sectionButton?.focus();
    } else if (this.mobileOpen()) {
      this.mobileOpen.set(false);
      this.menuButton?.focus();
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }
}
