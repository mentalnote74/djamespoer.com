// Generated snapshot. Do not edit dates independently.
import type { ScrumBrief } from './brief.model';
export const DAILY_SCRUM_BRIEF: ScrumBrief = {
  "date": "2026-11-09",
  "sections": [
    {
      "heading": "Recently shipped",
      "paragraphs": [
        "The homepage’s Shady White Van slide now preloads and retains one live exhibit instead of recreating it as carousel position, scrolling or tab visibility changes. The targeted release keeps the van’s scene and pause state intact across repeated visits to the slide, fills the actual 3:1 exhibit frame, and allows the carousel to pause independently of the van. The rejected broader homepage rework was excluded from this release."
      ]
    },
    {
      "heading": "Validated / learned",
      "paragraphs": [
        "Production reproduction showed that the previous conditional rendering removed the iframe when it was inactive, creating a new child document on return. The fix mounts it once and uses an inert transparent inactive slot; a hidden-slot alternative was rejected because actual preload testing showed it prevented initialization.",
        "Live desktop and mobile checks confirmed that the van initialized before reveal and retained the same frame, window and canvas through carousel cycles, scrolling away and back, and tab visibility changes. Parent scroll stayed stable during the tested reveal, theme changes arrived without resetting the scene, and a separate reduced-motion check covered both parent and child. The build and 28 focused carousel tests passed, with zero scoped automated accessibility violations or page errors in the inspected flow.",
        "A separate child-side limitation remains: the live exhibit still uses an anchor scrollIntoView call during pinning or resize. The tested parent preload and reveal path is stable, but this release does not establish that every later child-resize scroll interaction is resolved. Buildometer also reports pending reconciliation for the newer release; its totals were not changed."
      ]
    },
    {
      "heading": "Current focus",
      "paragraphs": [
        "The broader homepage remains an owner-led visual and editorial review. Every slide and card must communicate a distinctive benefit to the visitor or hiring team within roughly 2.5 seconds, while the craft demonstrates senior engineering through speed, efficiency, elegance, beauty, accessibility and usability. Recording that direction is not acceptance of the earlier local redesign."
      ]
    },
    {
      "heading": "Next",
      "paragraphs": [
        "Review the persistent exhibit in normal browsing and coordinate the remaining child-anchor resize behavior without losing its intentional internal framing. Continue the homepage’s audience-focused hooks and visual composition through owner review before further implementation or release. Reconcile the targeted production change through the existing Buildometer evidence workflow rather than inferring whole-story completion from a single fix."
      ]
    }
  ],
  "provenance": {
    "sourceCommit": "4418add28e12bbcf975420de434c3d023b399b9d",
    "generatorCommit": "4418add28e12bbcf975420de434c3d023b399b9d",
    "evidenceSha256": "853d6f5d7f05ed7c16441d9cb4e100134be8d5c71c66efdecd3a3b9cfbe99a32",
    "method": "ChatGPT-authored Jira publication payload; section text copied without rewriting or regeneration.",
    "reportingWindow": {
      "after": "2026-11-08T08:59:00.085-0500",
      "cutoff": "2026-11-09T09:00:26.679-0500"
    },
    "sources": [
      "https://djamespoer.atlassian.net/browse/SCRUM-57?focusedCommentId=10409"
    ]
  }
};
