import { TemplateRef } from '@angular/core';

export interface SmartGridCellContext<T> {
  $implicit: T;
  column: SmartGridColumn<T>;
}

export type SmartGridColumn<T> = {
  readonly id: string;
  readonly header: string;
  readonly rowHeader?: boolean;
} & (
  | { readonly text: (row: T) => string | number; readonly cell?: never }
  | { readonly cell: TemplateRef<SmartGridCellContext<T>>; readonly text?: never }
);

export interface SmartGridPage {
  readonly pageIndex: number;
  readonly pageSize: number;
}

export type SmartGridPagination = SmartGridPage &
  ({ readonly mode: 'client' } | { readonly mode: 'external'; readonly totalCount: number });
