import { Directive, inject, input, TemplateRef } from '@angular/core';
import { SmartGridCellContext } from './smart-grid.types';

@Directive({ selector: 'ng-template[appSmartGridCell]', exportAs: 'smartGridCell' })
export class SmartGridCell<T> {
  // Supplies the row type to Angular's template checker; no data is processed here.
  readonly appSmartGridCell = input.required<readonly T[]>();
  readonly template = inject<TemplateRef<SmartGridCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _directive: SmartGridCell<T>,
    context: unknown,
  ): context is SmartGridCellContext<T> {
    return true;
  }
}
