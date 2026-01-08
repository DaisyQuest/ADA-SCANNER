const path = require("path");

describe("startListener entrypoint", () => {
  test("logs error and sets exit code on failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const originalExitCode = process.exitCode;
    process.exitCode = 0;

    jest.isolateModules(() => {
      jest.doMock("../src/cli/ListenerCli", () => ({
        startListener: jest.fn(() => Promise.reject(new Error("boom")))
      }));
      require(path.join("..", "src", "cli", "startListener"));
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(errorSpy).toHaveBeenCalledWith("boom");
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });
});
