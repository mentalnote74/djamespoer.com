import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Aside } from '../../layout/aside/aside';
import { Thingamajob } from './thingamajob';
@Component({
  imports: [Aside, Thingamajob],
  template: '<app-aside label="Thingamajob"><app-thingamajob /></app-aside>',
})
class Host {}
describe('Thingamajob visual placeholder', () => {
  it('projects into a named native aside with honest construction status and disabled preview controls', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('aside')?.getAttribute('aria-label')).toBe('Thingamajob');
    expect(root.querySelector('h2')?.textContent).toBe('THINGAMAJOB');
    expect(root.textContent).toContain('Thingamajob is under construction.');
    expect(root.textContent).toContain('No job has been evaluated.');
    expect(root.querySelector('input')?.matches(':disabled')).toBe(true);
    expect(root.querySelector('label input[type="file"]')).not.toBeNull();
    root
      .querySelectorAll('button')
      .forEach((button) => expect(button.matches(':disabled')).toBe(true));
    expect(root.querySelector('.thingamajob__tape')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('main, form')).toBeNull();
  });
});
