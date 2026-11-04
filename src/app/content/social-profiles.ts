export interface SocialProfile {
  readonly id: 'linkedin' | 'x' | 'facebook' | 'bluesky';
  readonly label: string;
  /** Missing URL means unconfirmed: render nothing. */
  readonly url?: string;
}

// Owner confirmations: SCRUM-165 comments 10299, 10302 and 10304.
export const SOCIAL_PROFILES: readonly SocialProfile[] = [
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/djamespoer' },
  { id: 'x', label: 'X', url: 'https://x.com/djamespoer' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/djamespoer.com' },
];
