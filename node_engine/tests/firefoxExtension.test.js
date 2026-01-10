const fs = require("fs");
const path = require("path");

const loadManifest = (root) => {
  const manifestPath = path.join(root, "manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
};

describe("Firefox extension packaging", () => {
  const firefoxRoot = path.join(__dirname, "..", "firefox_extension");
  const chromeRoot = path.join(__dirname, "..", "extension");

  test("manifest mirrors chrome extension settings", () => {
    const firefoxManifest = loadManifest(firefoxRoot);
    const chromeManifest = loadManifest(chromeRoot);

    expect(firefoxManifest.manifest_version).toBe(3);
    expect(firefoxManifest.name).toBe(chromeManifest.name);
    expect(firefoxManifest.version).toBe(chromeManifest.version);
    expect(firefoxManifest.description).toBe(chromeManifest.description);
    expect(firefoxManifest.permissions).toEqual(chromeManifest.permissions);
    expect(firefoxManifest.host_permissions).toEqual(chromeManifest.host_permissions);
    expect(firefoxManifest.action).toEqual(chromeManifest.action);
    expect(firefoxManifest.background).toEqual(chromeManifest.background);
    expect(firefoxManifest.content_scripts).toEqual(chromeManifest.content_scripts);
  });

  test("manifest declares firefox browser settings", () => {
    const firefoxManifest = loadManifest(firefoxRoot);

    expect(firefoxManifest.browser_specific_settings).toBeDefined();
    expect(firefoxManifest.browser_specific_settings.gecko).toEqual({
      id: expect.any(String),
      strict_min_version: expect.any(String)
    });
    expect(firefoxManifest.browser_specific_settings.gecko.id).toContain("@");
  });

  test("extension assets are reused via symlinks", () => {
    const sharedFiles = [
      "background.js",
      "contentScript.js",
      "forwarder.js",
      "highlighter.js",
      "popup.css",
      "popup.html",
      "popup.js",
      "reportSidebar.js",
      "tabOrderOverlay.js"
    ];

    for (const file of sharedFiles) {
      const firefoxPath = path.join(firefoxRoot, file);
      const chromePath = path.join(chromeRoot, file);

      const stat = fs.lstatSync(firefoxPath);
      expect(stat.isSymbolicLink()).toBe(true);

      const linkTarget = fs.readlinkSync(firefoxPath);
      expect(path.normalize(linkTarget)).toBe(path.normalize(path.join("..", "extension", file)));

      const resolvedTarget = path.resolve(firefoxRoot, linkTarget);
      expect(resolvedTarget).toBe(path.resolve(chromePath));
    }
  });
});
