import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { SmartGridColumn, SmartGridPage, SmartGridPagination } from './smart-grid.types';

let nextGridId = 0;

@Component({
  selector: 'app-smart-grid',
  imports: [NgTemplateOutlet],
  templateUrl: './smart-grid.html',
  styleUrl: './smart-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartGrid<T> {
  // Internal IDs keep header references isolated across grid instances.
  readonly headerPrefix = `smart-grid-${nextGridId++}`;
  columnHeaderId(index: number): string {
    return `${this.headerPrefix}-column-${index}`;
  }
  rowHeaderId(rowIndex: number, columnIndex: number): string {
    return `${this.headerPrefix}-row-${rowIndex}-column-${columnIndex}`;
  }
  cellHeaders(rowIndex: number, columnIndex: number): string {
    return [
      this.columnHeaderId(columnIndex),
      ...this.columns().flatMap((column, index) =>
        column.rowHeader ? [this.rowHeaderId(rowIndex, index)] : [],
      ),
    ].join(' ');
  }
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly SmartGridColumn<T>[]>();
  readonly rowKey = input.required<(row: T) => string | number>();
  readonly caption = input.required<string>();
  readonly pagination = input.required<SmartGridPagination>();
  readonly pageSizes = input<readonly number[]>([10, 25, 50]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly emptyMessage = input('No results.');
  readonly pageChange = output<SmartGridPage>();

  private readonly focusRecovery = effect((onCleanup) => {
    this.visibleRows();
    this.columns();
    this.loading();
    this.error();
    const focused = this.document.activeElement;
    if (!focused || !this.element.nativeElement.contains(focused)) return;
    const callback = afterNextRender(
      () => {
        if (
          (!focused.isConnected || focused.matches(':disabled')) &&
          (this.document.activeElement === focused ||
            this.document.activeElement === this.document.body)
        ) {
          this.viewport().nativeElement.focus();
        }
      },
      { injector: this.injector },
    );
    onCleanup(() => callback.destroy());
  });

  readonly page = computed(() => {
    const page = this.pagination();
    if (
      !Number.isInteger(page.pageSize) ||
      page.pageSize < 1 ||
      !Number.isInteger(page.pageIndex) ||
      page.pageIndex < 0 ||
      (page.mode === 'external' && (!Number.isInteger(page.totalCount) || page.totalCount < 0))
    ) {
      throw new Error(
        'Smart Grid requires nonnegative integer page/count values and a positive integer page size.',
      );
    }
    return page;
  });
  readonly total = computed(() => {
    const page = this.page();
    return page.mode === 'client' ? this.rows().length : page.totalCount;
  });
  readonly pageCount = computed(() => Math.ceil(this.total() / this.page().pageSize));
  // Client data can shrink without mutating parent state or emitting during rendering.
  readonly pageIndex = computed(() =>
    this.page().mode === 'client'
      ? Math.min(this.page().pageIndex, Math.max(0, this.pageCount() - 1))
      : this.page().pageIndex,
  );
  readonly visibleRows = computed(() =>
    this.page().mode === 'external'
      ? this.rows()
      : this.rows().slice(
          this.pageIndex() * this.page().pageSize,
          (this.pageIndex() + 1) * this.page().pageSize,
        ),
  );
  readonly sizes = computed(() =>
    [...new Set([this.page().pageSize, ...this.pageSizes()])]
      .filter((size) => Number.isInteger(size) && size > 0)
      .sort((a, b) => a - b),
  );
  readonly status = computed(() => {
    if (this.loading()) return 'Loading results.';
    const error = this.error();
    if (error) return error;
    if (!this.visibleRows().length) return this.emptyMessage();
    const start = this.pageIndex() * this.page().pageSize + 1;
    return `Items ${start}–${start + this.visibleRows().length - 1} of ${this.total()}. Page ${this.pageIndex() + 1} of ${this.pageCount()}.`;
  });

  requestPage(index: number): void {
    if (
      this.loading() ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.pageCount() ||
      index === this.pageIndex()
    )
      return;
    this.pageChange.emit({ pageIndex: index, pageSize: this.page().pageSize });
  }

  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = Number(select.value);
    if (!this.loading() && this.sizes().includes(size) && size !== this.page().pageSize) {
      this.pageChange.emit({ pageIndex: 0, pageSize: size });
    }
    select.value = String(this.page().pageSize);
  }
}
