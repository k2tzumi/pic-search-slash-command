import { OAuth2Handler } from "./OAuth2Handler";
import { Commands } from "./Commands";
import { CustomImageSearchClient } from "./CustomImageSearchClient";
import { SlackWebhooks } from "./SlackWebhooks";
import { CounterCache } from "./CounterCache";
import { NetworkAccessError } from "./NetworkAccessError";

type TextOutput = GoogleAppsScript.Content.TextOutput
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;

const properties = PropertiesService.getScriptProperties();
const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");

const CLIENT_ID: string = properties.getProperty("CLIENT_ID");
const CLIENT_SECRET: string = properties.getProperty("CLIENT_SECRET");
const handler = new OAuth2Handler(CLIENT_ID, CLIENT_SECRET, PropertiesService.getUserProperties(), 'handleCallback')

/**
 * Authorizes and makes a request to the Slack API.
 */
function doGet(request): GoogleAppsScript.HTML.HtmlOutput {
  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.logout) {
    handler.clearService();
    const template = HtmlService.createTemplate('Logout<br /><a href="<?= requestUrl ?>" target="_blank">refresh</a>.');
    template.requestUrl = getRequestURL();
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  if (handler.verifyAccessToken()) {
    return HtmlService.createHtmlOutput('OK');
  } else {
    const template = HtmlService.createTemplate('RedirectUri:<?= redirectUrl ?> <br /><a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>.');
    template.authorizationUrl = handler.authorizationUrl;
    template.redirectUrl = handler.redirectUri;
    return HtmlService.createHtmlOutput(template.evaluate());
  }
}

function getRequestURL() {
  const serviceURL = ScriptApp.getService().getUrl();
  return serviceURL.replace('/dev', '/exec');
}

function handleCallback(request): HtmlOutput {
  return handler.authCallback(request);
}

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
