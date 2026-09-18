import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";

import { run } from "../src/main";

describe("Public IP", () => {
  beforeAll(() => {
    jest.mock("@actions/http-client");
    jest.spyOn(core, "info");
    jest.spyOn(core, "getInput").mockReturnValue("6");
    jest.spyOn(core, "setFailed");
    jest.spyOn(core, "setOutput");
    jest.spyOn(core, "warning");
  });

  afterAll(() => jest.resetAllMocks());

  test("Return public ip address", async () => {
    HttpClient.prototype.getJson = jest
      .fn()
      .mockResolvedValue({ statusCode: 200, result: { ip: "1.2.3.4" } });

    await expect(run()).resolves.toBe(undefined);

    expect(HttpClient.prototype.getJson).toHaveBeenCalled();
    expect(core.getInput).toHaveBeenCalledWith("maxRetries");
    expect(core.getInput).toHaveReturnedWith("6");
    expect(core.setOutput).toHaveBeenCalledTimes(2);
    expect(core.setOutput).toHaveBeenCalledWith("ipv4", "1.2.3.4");
    expect(core.setOutput).toHaveBeenCalledWith("ipv6", "1.2.3.4");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test("Warns but does not fail when ipv6 lookup fails", async () => {
    HttpClient.prototype.getJson = jest
      .fn()
      .mockResolvedValueOnce({ statusCode: 200, result: { ip: "1.2.3.4" } })
      .mockRejectedValueOnce(new Error("ipv6 down"));

    await expect(run()).resolves.toBe(undefined);

    expect(core.setOutput).toHaveBeenCalledWith("ipv4", "1.2.3.4");
    expect(core.warning).toHaveBeenCalledWith("Failed to get ipv6: ipv6 down");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test("Warns but does not fail when ipv4 lookup fails", async () => {
    HttpClient.prototype.getJson = jest
      .fn()
      .mockRejectedValueOnce(new Error("ipv4 down"))
      .mockResolvedValueOnce({ statusCode: 200, result: { ip: "5.6.7.8" } });

    await expect(run()).resolves.toBe(undefined);

    expect(core.warning).toHaveBeenCalledWith("Failed to get ipv4: ipv4 down");
    expect(core.setOutput).toHaveBeenCalledWith("ipv6", "5.6.7.8");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test("Warns for both and does not fail when both lookups fail", async () => {
    HttpClient.prototype.getJson = jest
      .fn()
      .mockRejectedValueOnce(new Error("ipv4 down"))
      .mockRejectedValueOnce(new Error("ipv6 down"));

    await expect(run()).resolves.toBe(undefined);

    expect(core.warning).toHaveBeenCalledWith("Failed to get ipv4: ipv4 down");
    expect(core.warning).toHaveBeenCalledWith("Failed to get ipv6: ipv6 down");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test("Handles a rejection with no error message", async () => {
    HttpClient.prototype.getJson = jest
      .fn()
      .mockRejectedValueOnce(undefined)
      .mockRejectedValueOnce(undefined);

    await expect(run()).resolves.toBe(undefined);

    expect(core.warning).toHaveBeenCalledWith("Failed to get ipv4: undefined");
    expect(core.warning).toHaveBeenCalledWith("Failed to get ipv6: undefined");
  });
});
