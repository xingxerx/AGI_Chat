import { search, SafeSearchType } from 'duck-duck-scrape';

export async function searchWeb(query: string): Promise<string> {
    try {
        const results = await search(query, {
            safeSearch: SafeSearchType.MODERATE
        });

        if (!results.results || results.results.length === 0) {
            return "No relevant search results found.";
        }

        // Take top 3 results
        const topResults = results.results.slice(0, 3);

        const summary = topResults.map((r, index) => {
            return `[Result ${index + 1}] Title: ${r.title}\nSnippet: ${r.description}\nSource: ${r.url}`;
        }).join('\n\n');

        return summary;
    } catch (error) {
        console.error("Search failed:", error);
        return "Unable to perform web search at this time.";
    }
}
