const { resolveListenerOptions, startListener } = require("../src/cli/ListenerCli");

describe("Listener CLI", () => {
  test("resolves options from env and args", () => {
    const options = resolveListenerOptions({
      argv: ["--rules-root", "/tmp/rules", "--port", "5050"],
      env: {}
    });

    expect(options).toEqual({
      rulesRoot: "/tmp/rules",
      port: 5050,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const envOptions = resolveListenerOptions({
      argv: [],
      env: { RULES_ROOT: "/env/rules", PORT: "4040" }
    });
    expect(envOptions).toEqual({
      rulesRoot: "/env/rules",
      port: 4040,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const fallbackOptions = resolveListenerOptions({
      argv: ["--rulesRoot", "/alternate"],
      env: { ADA_RULES_ROOT: "/env/rules", PORT: "not-a-number" }
    });
    expect(fallbackOptions).toEqual({
      rulesRoot: "/alternate",
      port: null,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const missingPort = resolveListenerOptions({
      argv: ["--rules-root", "/tmp/rules", "--port"],
      env: {}
    });
    expect(missingPort).toEqual({
      rulesRoot: "/tmp/rules",
      port: null,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const invalidPort = resolveListenerOptions({
      argv: ["--rules-root", "/tmp/rules", "--port", "nope"],
      env: {}
    });
    expect(invalidPort).toEqual({
      rulesRoot: "/tmp/rules",
      port: null,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const missingRulesRoot = resolveListenerOptions({
      argv: ["--rules-root"],
      env: {}
    });
    expect(missingRulesRoot).toEqual({
      rulesRoot: "",
      port: null,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const emptyEnvRoot = resolveListenerOptions({
      argv: ["--unknown"],
      env: { RULES_ROOT: "", ADA_RULES_ROOT: "/fallback", PORT: "" }
    });
    expect(emptyEnvRoot).toEqual({
      rulesRoot: "",
      port: null,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const adaFallback = resolveListenerOptions({
      argv: [],
      env: { ADA_RULES_ROOT: "/fallback", PORT: "0" }
    });
    expect(adaFallback).toEqual({
      rulesRoot: "/fallback",
      port: 0,
      allowedOrigins: null,
      ignoreSelfCapture: true
    });

    const corsOptions = resolveListenerOptions({
      argv: ["--allowed-origins", "http://one,http://two"],
      env: { RULES_ROOT: "/env/rules", IGNORE_SELF_CAPTURE: "false" }
    });
    expect(corsOptions).toEqual({
      rulesRoot: "/env/rules",
      port: null,
      allowedOrigins: "http://one,http://two",
      ignoreSelfCapture: false
    });
  });

  test("returns a non-started result when rules root missing", async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const result = await startListener({ argv: [], env: {}, logger, ListenerServerClass: jest.fn() });
    expect(result).toEqual({ started: false });
    expect(logger.error).toHaveBeenCalledWith("Rules root is required.");
  });

  test("starts the listener server when rules root is provided", async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const start = jest.fn().mockResolvedValue(1234);
    const ListenerServerClass = jest.fn().mockImplementation(() => ({ start }));

    const result = await startListener({
      argv: ["--rules-root", "/tmp/rules", "--port", "9000", "--allowed-origins", "http://app", "--allow-self-capture"],
      env: {},
      logger,
      ListenerServerClass
    });

    expect(ListenerServerClass).toHaveBeenCalledWith({
      rulesRoot: "/tmp/rules",
      port: 9000,
      ignoreSelfCapture: false,
      allowedOrigins: "http://app"
    });
    expect(result.started).toBe(true);
    expect(result.port).toBe(1234);
    expect(logger.log).toHaveBeenCalledWith("Listener server running on port 1234.");
  });

  test("defaults port to zero when not provided", async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const start = jest.fn().mockResolvedValue(4567);
    const ListenerServerClass = jest.fn().mockImplementation(() => ({ start }));

    const result = await startListener({
      argv: ["--rules-root", "/tmp/rules"],
      env: {},
      logger,
      ListenerServerClass
    });

    expect(ListenerServerClass).toHaveBeenCalledWith({ rulesRoot: "/tmp/rules", port: 0, ignoreSelfCapture: true });
    expect(result.port).toBe(4567);
  });

  test("uses process defaults when args are omitted", async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const start = jest.fn().mockResolvedValue(7890);
    const ListenerServerClass = jest.fn().mockImplementation(() => ({ start }));
    const originalRulesRoot = process.env.RULES_ROOT;
    process.env.RULES_ROOT = "/env/rules";

    const result = await startListener({ logger, ListenerServerClass });

    expect(result.started).toBe(true);
    expect(ListenerServerClass).toHaveBeenCalledWith({ rulesRoot: "/env/rules", port: 0, ignoreSelfCapture: true });

    process.env.RULES_ROOT = originalRulesRoot;
  });

  test("uses default logger and server class when no args provided", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const originalRulesRoot = process.env.RULES_ROOT;
    process.env.RULES_ROOT = "";

    const result = await startListener();

    expect(result).toEqual({ started: false });
    expect(errorSpy).toHaveBeenCalledWith("Rules root is required.");

    process.env.RULES_ROOT = originalRulesRoot;
    errorSpy.mockRestore();
  });
});
