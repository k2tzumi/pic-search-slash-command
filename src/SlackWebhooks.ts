type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

class SlackWebhooks {

    public constructor(private incomingWebhookUrl: string) {
    }

    public invoke(message: string) {
        const headers = {
            "content-type": "application/json"
        }

        const jsonData = {
            "username": "pic-search-bot",
            "icon_emoji": "frame_with_picture",
            "response_type": "in_channel",
            "text": message,
        }

        const options: URLFetchRequestOptions = {
            method: "post",
            headers: headers,
            payload: JSON.stringify(jsonData),
        };

        UrlFetchApp.fetch(this.incomingWebhookUrl, options).getContentText();
    }
}

export { SlackWebhooks }