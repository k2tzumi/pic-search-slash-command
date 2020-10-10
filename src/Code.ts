import { Slack } from "./slack/types/index.d";
import { SlackHandler } from "./SlackHandler";
import { SlashCommandFunctionResponse } from "./SlashCommandHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { JobBroker } from "./JobBroker";
import { CustomImageSearchClient } from "./CustomImageSearchClient";
import { SlackWebhooks } from "./SlackWebhooks";
import { CounterCache } from "./CounterCache";
import { NetworkAccessError } from "./NetworkAccessError";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type Commands = Slack.SlashCommand.Commands;

const asyncLogging = (): void => {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((parameter: {}) => {
    console.info(JSON.stringify(parameter));
  });
};

const properties = PropertiesService.getScriptProperties();
const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");
const OVERUSE_MESSAGE =
  properties.getProperty("OVERUSE_MESSAGE") || ":anger: Search too much..";
const COMMAND = "/ps";

function doPost(e): TextOutput {
  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCommandListener(COMMAND, executeSlashCommand);

  try {
    const process = slackHandler.handle(e);

    if (process.performed) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      new JobBroker().enqueue(asyncLogging, {
        message: exception.message,
        stack: exception.stack
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const executeSlashCommand = (
  commands: Commands
): SlashCommandFunctionResponse | null => {
  const response: SlashCommandFunctionResponse = {} as SlashCommandFunctionResponse;

  try {
    switch (commands.text) {
      case "":
      case "help":
        response.response_type = "ephemeral";
        response.text = "*Usage*\n* /ps keyword\n* /ps ksk\n* /ps help";
        break;
      case "ksk":
        const kskImages = executeSearch(commands);
        const webhook = new SlackWebhooks(commands.response_url);
        response.response_type = "in_channel";
        response.text = kskImages.pop();
        kskImages.slice(0, 5).forEach(image => {
          webhook.invoke({
            username: "pic-search-bot",
            icon_emoji: "frame_with_picture",
            response_type: "in_channel",
            text: image
          });
        });
        break;
      default:
        response.response_type = "in_channel";
        response.text = pickupImage(executeSearch(commands));
        break;
    }
  } catch (e) {
    response.response_type = "in_channel";
    response.text = ":cold_sweat: Search failed.";
    if (e instanceof NetworkAccessError) {
      if (e.statusCode === 429) {
        response.text = OVERUSE_MESSAGE;
      }
    }
    new JobBroker().enqueue(asyncLogging, {
      message: e.message,
      stack: e.stack
    });
  }

  return response;
};

const GOOGLE_API_KEY = properties.getProperty("GOOGLE_API_KEY");
const CUSTOM_SEARCH_ENGINE_ID = properties.getProperty(
  "CUSTOM_SEARCH_ENGINE_ID"
);

function executeSearch(commands: Commands): string[] {
  const cient = new CustomImageSearchClient(
    GOOGLE_API_KEY,
    CUSTOM_SEARCH_ENGINE_ID
  );
  const counter: CounterCache = new CounterCache();

  return cient.search(commands.text, counter.increment(commands.text));
}

function pickupImage(images: string[]): string {
  const pickup: number = Math.floor(Math.random() * images.length);
  return images[pickup];
}

export { executeSearch, executeSlashCommand };
