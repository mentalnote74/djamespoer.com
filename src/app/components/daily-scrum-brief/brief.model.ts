export interface ScrumBrief {
  readonly date: string;
  readonly sections: readonly {
    readonly heading: string;
    readonly paragraph?: string;
    readonly items?: readonly string[];
  }[];
  readonly provenance: {
    readonly sourceCommit: string;
    readonly method: string;
    readonly generatorCommit?: string;
    readonly statusSha256?: string;
  };
}
