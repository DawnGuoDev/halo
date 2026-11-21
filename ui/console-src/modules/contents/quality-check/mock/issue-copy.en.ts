import type { IssueCopy } from "../types";

/**
 * English copy for the 20 local demo issues.
 * Intentionally not in src/locales: product copy stays in locale files, demo
 * issue content is reproducible mock data and is loaded with the mock source.
 */
export const issueCopyEn: Record<string, IssueCopy> = {
  "q-01": {
    description: "External link in paragraph 3 returns 404",
    articleTitle:
      "A complete guide to building a personal knowledge base with Halo",
    snippet:
      "Reference: https://example.com/halo-docs-v1 (unavailable, HTTP 404)",
    suggestion:
      "Update the link to the current documentation or remove the stale reference.",
  },
  "q-02": {
    description: "Cover image is missing and the article shows a placeholder",
    articleTitle: "My 2026 writing plan",
    snippet: "Cover image: /upload/2026/plan-cover.png (HTTP 404)",
    suggestion:
      "Upload a new cover image or select an existing attachment in the editor.",
  },
  "q-03": {
    description: "Article has no excerpt; the list falls back to body text",
    articleTitle: "How to build a custom template for a Halo theme",
    snippet:
      "The excerpt field is empty, so lists fall back to the first 160 characters of the body.",
    suggestion:
      "Add a one or two sentence excerpt in the article settings that explains what the article solves.",
  },
  "q-04": {
    description:
      "The domain of the blogroll item “Old blog archive” has expired",
    articleTitle: "Friends links and useful resources",
    snippet: "Old blog archive → http://old-blog.example.org/",
    suggestion: "Remove the entry or replace it with a reachable URL.",
  },
  "q-05": {
    description:
      "A screenshot in the body has spaces in its filename and fails to load",
    articleTitle: "Migration notes for the comment widget",
    snippet: "Image: /upload/comment migration 01.png",
    suggestion: "Rename the file without spaces and insert it again.",
  },
  "q-06": {
    description:
      "Excerpt exceeds the recommended length and is truncated on cards",
    articleTitle: "Site performance optimization practices",
    snippet: "Current excerpt is 286 characters; 120 is recommended.",
    suggestion:
      "Shorten the excerpt to the conclusion and the applicable scenario.",
  },
  "q-07": {
    description: "Reference link at the end of the article is unreachable",
    articleTitle: "Getting started with R2DBC and reactive data access",
    snippet:
      "Reference: https://example.org/reactive-guide (connection timed out)",
    suggestion:
      "Replace it with the official Spring reactive documentation URL.",
  },
  "q-08": {
    description: "Body image points to a draft attachment and is not public",
    articleTitle: "Plugin development quick start",
    snippet: "Image: /upload/draft/plugin-flow.png (draft attachment)",
    suggestion: "Select the image again from the public attachment library.",
  },
  "q-09": {
    description: "Article has no excerpt",
    articleTitle: "Markdown layout tips for beginners",
    snippet: "The excerpt field is empty.",
    suggestion: "Add an excerpt to improve list readability.",
  },
  "q-10": {
    description: "An external link was flagged and kept as ignored",
    articleTitle: "A curated list of design resources",
    snippet: "https://example.net/icons (the target site refuses access)",
    suggestion: "Update the link if it becomes reachable, otherwise remove it.",
    ignoreReason:
      "The resource site is under maintenance; the link is temporarily unavailable but will recover.",
  },
  "q-11": {
    description: "The old cover image was deleted; the title is used instead",
    articleTitle: "2025 year in review",
    snippet: "Cover image: /upload/2025/annual-cover.jpg",
    suggestion: "It is fine to keep the archived article as it is.",
    ignoreReason: "Archived article; images will not be maintained.",
  },
  "q-12": {
    description: "Excerpt is empty but the article is still a draft",
    articleTitle: "Untitled draft: caching",
    snippet: "The excerpt is empty.",
    suggestion: "Add an excerpt before publishing.",
    ignoreReason:
      "The draft is still being edited; it will be completed before publishing.",
  },
  "q-13": {
    description: "External image host returns 403",
    articleTitle: "Hands-on with the Halo plugin marketplace",
    snippet: "Image: https://img.example.io/market-01.png (HTTP 403)",
    suggestion:
      "Download the image and upload it to the local attachment library.",
  },
  "q-14": {
    description: "In-page anchor points to a section that was merged",
    articleTitle: "Theme development FAQ",
    snippet: "Link: #install-theme (the section is now part of “Quick start”)",
    suggestion: "Update the anchor to #quick-start.",
  },
  "q-15": {
    description: "Excerpt is highly duplicated with the opening paragraph",
    articleTitle: "Deploying Halo from scratch",
    snippet: "The excerpt repeats the first 80 characters of the body.",
    suggestion:
      "Rewrite the excerpt to highlight the result and prerequisites of deployment.",
  },
  "q-16": {
    description: "Two images use http links and are blocked as mixed content",
    articleTitle: "HTTPS migration checklist",
    snippet:
      "Image URLs still start with http:// and are blocked by the browser.",
    suggestion:
      "Change image URLs to https or migrate them to the attachment library.",
  },
  "q-17": {
    description: "Typo in a navigation link",
    articleTitle: "About this site",
    snippet: "github.com/dawnguodev/hlalo → repository not found",
    suggestion: "Fix the typo to /halo.",
  },
  "q-18": {
    description: "Thumbnail is missing from the article list",
    articleTitle: "10 small habits for better blog writing",
    snippet: "Thumbnail: /upload/habits.png (HTTP 404)",
    suggestion: "Upload the thumbnail again.",
  },
  "q-19": {
    description: "No excerpt, but a custom SEO description is set",
    articleTitle: "SEO settings for a Halo site",
    snippet: "Excerpt is empty; a custom SEO description is present.",
    suggestion: "Add an excerpt if the site generates cards from it.",
  },
  "q-20": {
    description: "Attachment download link uses an intranet address",
    articleTitle: "Sharing an intranet deployment experience",
    snippet: "Attachment: http://192.168.1.20/files/guide.pdf",
    suggestion: "Replace it with a publicly reachable attachment URL.",
  },
};

export default issueCopyEn;
