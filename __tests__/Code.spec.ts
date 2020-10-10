import { Slack } from "../src/slack/types/index.d";
type Commands = Slack.SlashCommand.Commands;
type UrlFetchApp = GoogleAppsScript.URL_Fetch.UrlFetchApp;

const properites = {
  getProperty: jest.fn(() => {
    return "dummy";
  }),
  deleteAllProperties: jest.fn(),
  deleteProperty: jest.fn(),
  getKeys: jest.fn(),
  getProperties: jest.fn(),
  setProperties: jest.fn(),
  setProperty: jest.fn()
};

PropertiesService.getScriptProperties = jest.fn(() => properites);
PropertiesService.getUserProperties = jest.fn(() => properites);

let apiResponse;
const response = {
  getResponseCode: jest.fn(() => {
    return 200;
  }),
  getContentText: jest.fn(() => {
    return JSON.stringify(apiResponse);
  }),
  getBlob: jest.fn(() => {
    return "";
  })
};
// UrlFetchApp.fetch = jest.fn(() => response);

const fileIteraater = {
  hasNext: jest.fn(() => {
    return false;
  })
};

import { executeSlashCommand } from "../src/Code";
describe("Code", () => {
  describe("executeSlashCommand", () => {
    it("success", () => {
      apiResponse = {};
      const commands: Commands = {
        token: "gIkuvaNzQIHg97ATvDxqgjtO",
        team_id: "T0001",
        team_domain: "example",
        enterprise_id: "E0001",
        enterprise_name: "Globular%20Construct%20Inc",
        channel_id: "C2147483705",
        channel_name: "test",
        user_id: "U2147483697",
        user_name: "Steve",
        command: "/weather",
        text: "94070",
        response_url: "https://hooks.slack.com/commands/1234/5678",
        trigger_id: "13345224609.738474920.8088930838d88f008e0"
      };

      const expected = {
        response_type: "in_channel",
        text: ":cold_sweat: Search failed."
      };

      const actual = executeSlashCommand(commands);
      console.log(JSON.stringify(actual));

      expect(actual).toEqual(expected);
    });
  });
});
