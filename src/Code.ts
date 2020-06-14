import { Commands } from "./Commands";
import { CustomImageSearchClient } from "./CustomImageSearchClient";
import { SlackWebhooks } from "./SlackWebhooks";
import { CounterCache } from "./CounterCache";
import { NetworkAccessError } from "./NetworkAccessError";

type TextOutput = GoogleAppsScript.Content.TextOutput
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;

const properties = PropertiesService.getScriptProperties();
const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");

const OVERUSE_MESSAGE = properties.getProperty("OVERUSE_MESSAGE") || ":anger: Search too much..";

function doPost(e): TextOutput {
  const token = e.parameter.token;

  if (token !== VERIFICATION_TOKEN) {
    console.warn("Invalid verification token: %s", token);
    throw new Error("Invalid verification token.");
  }

  var commands: Commands = e.parameter;
  var response = {
    "response_type": null,
    "text": null
  };

  try {
    switch (commands.text) {
      case "":
      case "help":
        response.response_type = 'ephemeral';
        response.text = "*Usage*\n* /ps keyword\n* /ps ksk\n* /ps help";
        break;
      case "ksk":
        let kskImages = executeSearch(commands);
        const webhook = new SlackWebhooks(commands.response_url);
        response.response_type = 'in_channel';
        response.text = kskImages.pop();
        kskImages.slice(0, 5).forEach(image => {
          webhook.invoke(image);
        });
        break;
      default:
        response.response_type = 'in_channel';
        response.text = pickupImage(executeSearch(commands));
        break;
    }
  } catch (e) {
    response.response_type = 'in_channel';
    response.text = ":cold_sweat: Search failed.";
    if (e instanceof NetworkAccessError) {
      if (e.statusCode === 429) {
        response.text = OVERUSE_MESSAGE;
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON
  );
}

const GOOGLE_API_KEY = properties.getProperty("GOOGLE_API_KEY");
const CUSTOM_SEARCH_ENGINE_ID = properties.getProperty("CUSTOM_SEARCH_ENGINE_ID");

export function executeSearch(commands: Commands): string[] {
  const cient = new CustomImageSearchClient(GOOGLE_API_KEY, CUSTOM_SEARCH_ENGINE_ID);
  const counter: CounterCache = new CounterCache();

  return cient.search(commands.text, counter.increment(commands.text));
}

function pickupImage(images: string[]): string {
  const pickup: number = Math.floor(Math.random() * images.length);
  return images[pickup];
}
