import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';
import { COOKIE_TRAIL, COOKIE_FLAVORS, CookieStop } from './cookie-trail';

const KEY = 'rigby.cookie-jar.v1';
export function decodeJar(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? 'null');
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('collected' in parsed) ||
      !Array.isArray(parsed.collected)
    )
      return [];
    const ids = parsed.collected;
    return COOKIE_TRAIL.filter((stop) => ids.includes(stop.id)).map((stop) => stop.id);
  } catch {
    return [];
  }
}
@Injectable({ providedIn: 'root' })
export class CookieHuntService {
  private readonly document = inject(DOCUMENT);
  readonly stops = COOKIE_TRAIL;
  readonly flavors = COOKIE_FLAVORS;
  readonly collected = signal<readonly string[]>([]);
  readonly total = COOKIE_TRAIL.length;
  readonly count = computed(() => this.collected().length);
  readonly next = computed(() => COOKIE_TRAIL.find((stop) => !this.has(stop.id)));
  readonly announcement = signal('');
  readonly saved = signal(true);
  readonly resetVersion = signal(0);
  constructor() {
    afterNextRender(() => {
      try {
        this.collected.set(decodeJar(this.document.defaultView?.localStorage.getItem(KEY) ?? null));
      } catch {
        this.saved.set(false);
      }
    });
  }
  has(id: string): boolean {
    return this.collected().includes(id);
  }
  collect(id: string): boolean {
    const stop = COOKIE_TRAIL.find((item) => item.id === id);
    if (!stop || this.has(id)) return false;
    this.collected.update((items) => [...items, id]);
    this.persist();
    this.announcement.set(
      `${COOKIE_FLAVORS[stop.flavor]} collected. ${this.count()} of ${this.total} cookies in your jar.${this.next() ? '' : ' You found them all! Rigby is delighted.'}`,
    );
    return true;
  }
  restart(): void {
    this.collected.set([]);
    this.persist();
    this.resetVersion.update((value) => value + 1);
    this.announcement.set(
      'Cookie hunt restarted. Your jar is empty and all hidden cookies are back.',
    );
  }
  private persist(): void {
    try {
      const storage = this.document.defaultView?.localStorage;
      const value = JSON.stringify({ version: 1, collected: this.collected() });
      storage?.setItem(KEY, value);
      this.saved.set(storage?.getItem(KEY) === value);
    } catch {
      this.saved.set(false);
    }
  }
  href(stop: CookieStop): string {
    return stop.path + '#hidden-cookie-' + stop.id;
  }
}
