/** Public, explicitly approved content only. Never import the private Career Truth Archive. */
export interface CaseStudy {
  readonly title: string;
  readonly introduction?: string;
  readonly sections: readonly CaseStudySection[];
}

/** Section headings/order belong to the content, not an imposed employer narrative. */
export interface CaseStudySection {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
  readonly evidence?: readonly CaseStudyEvidence[];
}

/** Links point to authorized public artifacts; images include meaningful alt text and reserved dimensions. */
export type CaseStudyEvidence =
  | { readonly kind: 'link'; readonly label: string; readonly href: string }
  | {
      readonly kind: 'image';
      readonly src: string;
      readonly alt: string;
      readonly width: number;
      readonly height: number;
      readonly caption?: string;
    };
