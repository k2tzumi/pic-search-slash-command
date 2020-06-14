import { NetworkAccessError } from "./NetworkAccessError";

class CustomImageSearchClient {
    /**
     * Restricts the search to documents written in a particular language
     */
    static readonly LANG: string = 'lang_ja';
    /**
     * Number of search results to return
     */
    static readonly NUM: number = 10;

    public constructor(private apiKey: string, private searchEngineId: string) {
    }

    /**
     * @param keyword Search word
     * @param repeate Number of invocations
     * @throws NetworkAccessError
     */
    public search(keyword: string, repeate: number = 1): string[] {
        const start: number = CustomImageSearchClient.NUM * (repeate - 1) + 1;
        const options = {
            muteHttpExceptions: true
        };

        var response;

        try {
            response = UrlFetchApp.fetch(this.getEndpoint(keyword, start), options);
        } catch (e) {
            console.warn(`DNS error, etc. ${e.message}`);
            throw new NetworkAccessError(500, e.message);
        }

        switch (response.getResponseCode()) {
            case 200:
                const items = JSON.parse(response.getContentText()).items;
                return items.map(function (item) {
                    return item.link;
                });
            default:
                console.warn(`Custom Search API error. status: ${response.getResponseCode()}, content: ${response.getContentText()}`);
                throw new NetworkAccessError(response.getResponseCode(), response.getContentText());
        }
    }

    private getEndpoint(keyword: string, start: number): string {
        return `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchEngineId}&searchType=image&q=${encodeURIComponent(keyword)}&safe=active&lr=${CustomImageSearchClient.LANG}&num=${CustomImageSearchClient.NUM}&start=${start}`;
    }
}
export { CustomImageSearchClient }