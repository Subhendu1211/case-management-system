type PageQuery = { slug?: string };

// Minimal CMS fetch shim. Replace with real CMS integration when available.
export async function fetchPage(query: PageQuery) {
  const { slug } = query || {};

  // Simple in-memory stub data for success-stories
  const pages: Record<string, { summary?: string }> = {
    "success-stories": {
      summary: "Empowering persons with disabilities through inclusive governance.",
    },
  };

  if (slug && pages[slug]) {
    return pages[slug];
  }

  // Default: return null to indicate not found
  return null;
}
