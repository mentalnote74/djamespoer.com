export interface ScrumBrief {
  readonly date: string;
  readonly sections: readonly {
    readonly heading: string;
    readonly paragraph?: string;
    readonly paragraphs?: readonly string[];
    readonly items?: readonly string[];
  }[];
  readonly provenance: {
    readonly sourceCommit: string;
    readonly method: string;
    readonly generatorCommit?: string;
    readonly statusSha256?: string;
    readonly evidenceSha256?: string;
    readonly reportingWindow?: { readonly after: string; readonly cutoff: string };
    readonly evidence?: readonly { readonly commit: string; readonly occurredAt: string }[];
    readonly sources?: readonly string[];
  };
}
