const { resolveListenerOptions, startListener } = require("../src/cli/ListenerCli");

describe("Listener CLI", () => {
  test("resolves options from env and args", () => {
    const options = resolveListenerOptions({
      argv: ["--rules-root", "/tmp/rules", "--port", "5050"],
      env: {}
    });

    expect(options).toEqual({ rulesRoot: "/tmp/rules", port: 5050 });

    const envOptions = resolveListenerOptions({
      argv: [],
      env: { RULES_ROOT: "/env/rules", PORT: "4040" }
    });
    expect(envOptions).toEqual({ rulesRoot: "/env/rules", port: 4040 });

    const fallbackOptions = resolveListenerOptions({
      argv: ["--rulesRoot", "/alternate"],
      env: { ADA_RULES_ROOT: "/env/rules", PORT: "not-a-number" }
    });
    expect(fallbackOptions).toEqual({ rulesRoot: "/alternate", port: null });
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
      argv: ["--rules-root", "/tmp/rules", "--port", "9000"],
      env: {},
      logger,
      ListenerServerClass
    });

    expect(ListenerServerClass).toHaveBeenCalledWith({ rulesRoot: "/tmp/rules", port: 9000 });
    expect(result.started).toBe(true);
    expect(result.port).toBe(1234);
    expect(logger.log).toHaveBeenCalledWith("Listener server running on port 1234.");
  });
});
