const fs = require("fs");
const path = require("path");

describe("UI stylesheet assets", () => {
  test("listener UI stylesheet exposes polished theme tokens", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "../src/listener/ui/assets/app.css"),
      "utf8"
    );

    expect(css).toContain("--gradient-header");
    expect(css).toContain("radial-gradient");
    expect(css).toContain(".summary-card");
  });

  test("static UI stylesheet aligns with the shared palette", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "../src/static/ui/assets/app.css"),
      "utf8"
    );

    expect(css).toContain("--header-bg");
    expect(css).toContain("--primary");
    expect(css).toContain(".panel");
  });
});
