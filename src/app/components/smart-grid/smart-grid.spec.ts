import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SmartGrid } from './smart-grid';
import { SmartGridCell } from './smart-grid-cell';
import { SmartGridColumn, SmartGridPagination } from './smart-grid.types';

interface Book {
  isbn: string;
  title: string;
}
interface Reading {
  sensor: number;
  temperature: number;
}

@Component({
  imports: [SmartGrid, SmartGridCell],
  template: `
    <ng-template [appSmartGridCell]="books()" #action="smartGridCell" let-book>
      <button type="button" (click)="chosen.set(book.isbn)">Read {{ book.title }}</button>
    </ng-template>
    <app-smart-grid
      caption="Books"
      [rows]="books()"
      [columns]="[
        { id: 'title', header: 'Title', rowHeader: true, text: title },
        { id: 'action', header: 'Action', cell: action.template },
      ]"
      [rowKey]="bookKey"
      [pagination]="page()"
      [loading]="loading()"
      [error]="error()"
      (pageChange)="requests.push($event); page.set({ ...page(), ...$event })"
    />
    <app-smart-grid
      caption="Temperatures"
      [rows]="readings"
      [columns]="readingColumns"
      [rowKey]="sensorKey"
      [pagination]="{ mode: 'client', pageIndex: 0, pageSize: 10 }"
    />
  `,
})
class TestHost {
  readonly books = signal<readonly Book[]>([
    { isbn: 'a', title: '<b>First</b>' },
    { isbn: 'b', title: 'Second' },
    { isbn: 'c', title: 'Third' },
  ]);
  readonly readings: readonly Reading[] = [{ sensor: 42, temperature: 18 }];
  readonly readingColumns: readonly SmartGridColumn<Reading>[] = [
    { id: 'temperature', header: 'Temperature', text: (row) => row.temperature },
  ];
  readonly bookKey = (book: Book) => book.isbn;
  readonly sensorKey = (reading: Reading) => reading.sensor;
  readonly title = (book: Book) => book.title;
  readonly page = signal<SmartGridPagination>({ mode: 'client', pageIndex: 0, pageSize: 2 });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly chosen = signal('');
  readonly requests: { pageIndex: number; pageSize: number }[] = [];
}

describe('SmartGrid', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const grid = root.querySelector<HTMLElement>('app-smart-grid')!;
    const buttons = grid.querySelectorAll<HTMLButtonElement>('.smart-grid__pager button');
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      grid,
      previous: buttons[0]!,
      next: buttons[1]!,
    };
  }

  it('renders unrelated row types, native semantics, consumer actions, and escaped text', async () => {
    const { root, grid, host, fixture } = await setup();
    expect(root.querySelectorAll('table')).toHaveLength(2);
    expect(grid.querySelector('caption')?.textContent?.trim()).toBe('Books');
    expect(grid.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);
    expect(grid.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2);
    expect(grid.querySelector('tbody b')).toBeNull();
    expect(grid.querySelector('tbody')?.textContent).toContain('<b>First</b>');
    expect(root.querySelectorAll('table')[1]?.textContent).toContain('18');
    expect(root.querySelector('main, [role="grid"]')).toBeNull();
    grid.querySelector<HTMLButtonElement>('tbody button')!.click();
    fixture.detectChanges();
    expect(host.chosen()).toBe('a');
  });

  it('requests controlled pages, preserves focus at boundaries, and ignores unavailable navigation', async () => {
    const { fixture, grid, host, next, previous } = await setup();
    previous.click();
    expect(host.requests).toHaveLength(0);
    next.focus();
    next.click();
    fixture.detectChanges();
    expect(host.requests).toEqual([{ pageIndex: 1, pageSize: 2 }]);
    expect(grid.querySelector('tbody')?.textContent).toContain('Third');
    expect(grid.querySelector('[role="status"]')?.textContent).toContain(
      'Items 3–3 of 3. Page 2 of 2.',
    );
    expect(document.activeElement).toBe(next);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    next.click();
    expect(host.requests).toHaveLength(1);
    previous.click();
    fixture.detectChanges();
    expect(host.page().pageIndex).toBe(0);
  });

  it('associates card values with column and optional row headers without announcing visual labels twice', async () => {
    const { root } = await setup();
    const allIds = Array.from(root.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const table of root.querySelectorAll('table')) {
      expect(table.getAttribute('role')).toBe('table');
      expect(
        table.querySelector('thead[role], tbody[role], tr[role], th[role], td[role]'),
      ).toBeNull();
      const columns = table.querySelectorAll('thead th');
      for (const column of columns) expect(column.getAttribute('scope')).toBe('col');
      for (const row of table.querySelectorAll('tbody tr')) {
        const rowHeader = row.querySelector('th[scope="row"]');
        Array.from(row.children).forEach((cell, index) => {
          const label = cell.querySelector('.smart-grid__cell-label');
          expect(label?.textContent?.trim()).toBe(columns[index]!.textContent?.trim());
          expect(label?.getAttribute('aria-hidden')).toBe('true');
          expect(cell.closest('[aria-hidden="true"]')).toBeNull();
          expect(cell.querySelector('button')?.closest('[aria-hidden="true"]')).toBeFalsy();
          const headers = cell.getAttribute('headers')!.split(' ');
          expect(headers[0]).toBe(columns[index]!.id);
          for (const id of headers) expect(table.querySelector(`[id="${id}"]`)).not.toBeNull();
          if (cell.tagName === 'TD') {
            if (rowHeader) expect(headers).toContain(rowHeader.id);
            else expect(headers).toHaveLength(1);
          } else {
            expect(cell.getAttribute('scope')).toBe('row');
          }
        });
      }
    }
  });

  it('keeps header references valid after pagination and retains focusable consumer actions', async () => {
    const { fixture, grid, next, host } = await setup();
    const columnId = grid.querySelector('thead th')!.id;
    next.click();
    fixture.detectChanges();
    expect(grid.querySelector('thead th')!.id).toBe(columnId);
    const rowHeader = grid.querySelector('tbody th')!;
    expect(rowHeader.textContent).toContain('Third');
    expect(grid.querySelector('tbody td')!.getAttribute('headers')!.split(' ')).toContain(
      rowHeader.id,
    );
    const action = grid.querySelector<HTMLButtonElement>('tbody button')!;
    action.focus();
    expect(document.activeElement).toBe(action);
    action.click();
    expect(host.chosen()).toBe('c');
  });

  it('resets the requested page when page size changes and includes the current size', async () => {
    const { fixture, grid, host, next } = await setup();
    next.click();
    fixture.detectChanges();
    const select = grid.querySelector<HTMLSelectElement>('select')!;
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      '2',
      '10',
      '25',
      '50',
    ]);
    select.value = '10';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(host.requests.at(-1)).toEqual({ pageIndex: 0, pageSize: 10 });
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('clamps shrinking client data without mutating parent state or emitting during rendering', async () => {
    const { fixture, grid, host, next } = await setup();
    next.click();
    fixture.detectChanges();
    host.books.set([{ isbn: 'a', title: 'Remaining' }]);
    fixture.detectChanges();
    expect(grid.querySelector('tbody')?.textContent).toContain('Remaining');
    expect(host.page().pageIndex).toBe(1);
    expect(host.requests).toHaveLength(1);
    host.books.set([]);
    fixture.detectChanges();
    expect(grid.querySelector('[role="status"]')?.textContent).toBe('No results.');
    expect(grid.textContent).not.toContain('1–0');
    expect(next.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders an external page without slicing it or acquiring data', async () => {
    const { fixture, grid, host } = await setup();
    host.page.set({ mode: 'external', pageIndex: 3, pageSize: 2, totalCount: 20 });
    host.books.set([{ isbn: 'x', title: 'External row' }]);
    fixture.detectChanges();
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(grid.querySelector('[role="status"]')?.textContent).toContain(
      'Items 7–7 of 20. Page 4 of 10.',
    );
    expect(host.requests).toHaveLength(0);
  });

  it('prioritizes loading and errors over empty results and blocks loading requests', async () => {
    const { fixture, grid, host, next } = await setup();
    host.loading.set(true);
    host.error.set('Could not load results.');
    fixture.detectChanges();
    expect(grid.querySelector('[aria-busy]')?.getAttribute('aria-busy')).toBe('true');
    expect(grid.querySelector('[role="status"]')?.textContent).toBe('Loading results.');
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(0);
    next.click();
    expect(host.requests).toHaveLength(0);
    host.loading.set(false);
    fixture.detectChanges();
    expect(grid.querySelector('[role="status"]')?.textContent).toBe('Could not load results.');
  });

  it('retains keyed DOM rows after immutable updates and keeps instances independent', async () => {
    const { fixture, root, grid, host } = await setup();
    const row = grid.querySelector('tbody tr');
    host.books.set(host.books().map((book) => ({ ...book, title: book.title + ' updated' })));
    fixture.detectChanges();
    expect(grid.querySelector('tbody tr')).toBe(row);
    expect(root.querySelectorAll('[role="group"]')[1]?.getAttribute('aria-label')).toBe(
      'Temperatures pagination',
    );
    expect(root.querySelectorAll('label select')).toHaveLength(2);
  });

  it('rejects invalid pagination values', async () => {
    const { fixture, host } = await setup();
    host.page.set({ mode: 'client', pageIndex: 0, pageSize: 0 });
    expect(() => fixture.detectChanges()).toThrow(/positive integer page size/);
  });

  it('recovers focus when a focused consumer action is removed', async () => {
    const { fixture, grid, host } = await setup();
    grid.querySelector<HTMLButtonElement>('tbody button')!.focus();
    host.books.set([]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(grid.querySelector('.smart-grid__viewport'));
  });
});
