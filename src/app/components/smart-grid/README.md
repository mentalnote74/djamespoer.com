# Smart Grid

`SmartGrid<T>` (`app-smart-grid`) renders a native HTML table and controlled pagination. It has no domain, network, router, persistence, or business-action dependencies. Import it directly into a standalone consumer; it is not registered globally or added to a route.

## Contract

- Supply immutable `rows`, `columns`, a nonempty `caption`, and `rowKey`. Column IDs and row keys must be unique and stable. Columns must be nonempty.
- Each column supplies either a `text(row)` accessor (escaped text) or a typed cell `TemplateRef`. Mark an identifying column `rowHeader: true` when appropriate. Column order is consumer-owned.
- `pagination` is `{ mode: 'client', pageIndex, pageSize }` for a complete collection, or `{ mode: 'external', pageIndex, pageSize, totalCount }` for an already processed page. Indices are zero-based; page size is a positive integer; count is a nonnegative integer.
- `pageChange` emits a requested `{ pageIndex, pageSize }`. The consumer commits state through inputs. Page-size changes request index zero. No initial or render-time request is emitted.
- Client data shrinkage clamps the displayed page without changing consumer state. Later requests use that effective page. External rows are never sliced; the consumer supplies coherent rows/count/page metadata and owns invalid-page recovery, pending requests, cancellation, and retries. Do not update committed metadata ahead of its corresponding response.
- `pageSizes` defaults to `[10, 25, 50]`; the current size is always included. Invalid options are omitted.
- `loading` takes precedence over `error`, then empty results. `error` and `emptyMessage` are consumer-supplied plain text. Do not pass private server error details into public UI.

## Consumer cell templates

Import `SmartGridCell` alongside `SmartGrid`. Bind the consumer's typed row collection to the directive so Angular can infer the cell context:

```html
<ng-template [appSmartGridCell]="books()" #action="smartGridCell" let-book let-column="column">
  <button type="button" (click)="readBook(book)">Read {{ book.title }}</button>
</ng-template>
```

Pass `action.template` as a column's `cell` value. The template receives the row as `$implicit` and the column as `column`. Smart Grid owns the surrounding `td`/`th`; the consumer supplies cell contents and owns their accessible names and behavior. See the host in `smart-grid.spec.ts` for a complete example with two unrelated row types.

## Accessibility and scope

Native table navigation and ordinary Tab order are preserved. The caption names the table; headers use native scopes. The overflow region is keyboard-focusable, and the pager uses a labelled group and a wrapping native select label, without shared IDs. A persistent polite status announces loading, errors, empty results, and item/page ranges. The table area exposes `aria-busy` while loading.

At the shared `content-stack` transition (40rem), each row becomes a full-width card. Labels come only from column metadata and are `aria-hidden`; screen readers use the actual headers instead. Unique per-instance header IDs and native `headers` references associate each value with its column and optional row headers. The column-header group is visually clipped, not removed from the accessibility tree. Only `table` has an explicit native-equivalent role: [MDN documents that changing its display can affect its accessibility mapping](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/display#tables). Descendant row groups, rows and cells use native semantics and scopes, without redundant roles. This targeted safeguard is not proof of current browser/assistive-technology compatibility; real-device VoiceOver/table-navigation verification is still required, particularly on iOS browsers. The native table, caption, scopes, content order and single set of interactive controls remain. Desktop presentation and typography are unchanged.

The intentional MVP decision is to keep the horizontal-scroll viewport at `tabindex="0"` even when it does not currently overflow. This guarantees predictable keyboard access to horizontal scrolling, at the cost of one additional Tab stop per grid. Dynamically detecting overflow would add measurement and `ResizeObserver` complexity. Browser, keyboard, and reflow testing may justify conditional focusability later. Focus recovery itself does not require `tabindex="0"`: programmatic focus could use `tabindex="-1"`.

Boundary/loading pager buttons use `aria-disabled` and guarded handlers to retain focus after transitions. If input changes remove a focused cell action or disable the focused select, focus recovers to the table scroll area unless the user has moved elsewhere. Cell content is suppressed during loading/errors. Consumer templates remain responsible for their own semantics and focus behavior.

The consumer owns page containment. Component SCSS provides wrapping, horizontal table overflow, reflowing pagination, and select/viewport focus indicators; button focus inherits the site's baseline. No animation is introduced.

Sorting, filtering, selection, editing, export, virtualization, cursor/unknown-total pagination, and custom empty/error templates are outside this MVP. No `role="grid"` or cell-navigation keyboard model is implemented.
