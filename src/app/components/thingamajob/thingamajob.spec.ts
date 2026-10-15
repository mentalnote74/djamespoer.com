import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Aside } from '../../layout/aside/aside';
import { Thingamajob } from './thingamajob';
import { provideRouter } from '@angular/router';
@Component({
  imports: [Aside, Thingamajob],
  template: '<app-aside label="Thingamajob"><app-thingamajob /></app-aside>',
})
class Host {}
describe('Thingamajob public entry', () => {
  it('projects a real product link into the named aside without fake workflow controls', () => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('aside')?.getAttribute('aria-label')).toBe('Thingamajob');
    expect(root.querySelector('h2')?.textContent).toBe('Thingamajob');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/thingamajob');
    expect(root.querySelector('a')?.textContent).toBe('Explore Thingamajob');
    expect(root.querySelector('main, form, input, button')).toBeNull();
  });
});
