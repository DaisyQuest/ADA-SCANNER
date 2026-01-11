const fs = require("fs");
const path = require("path");

const inventoryPath = path.join(__dirname, "..", "GoldMasterTestCaseInventory_actually_made.MD");
const goldmasterRoot = path.join(__dirname, "..", "goldmaster");
const supportedExtensions = ["html", "htm", "cshtml", "razor", "xaml"];

const parseInventory = (contents) => {
  const inventory = new Map();
  let currentExtension = null;

  contents.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^##\s+.+?\(\.(?<ext>\w+)\)/);
    if (headingMatch?.groups?.ext) {
      currentExtension = headingMatch.groups.ext;
      inventory.set(currentExtension, []);
      return;
    }

    if (!currentExtension || !line.startsWith("|")) {
      return;
    }

    if (line.includes("---")) {
      return;
    }

    const columns = line.split("|").map((entry) => entry.trim()).filter(Boolean);
    if (columns.length < 2) {
      return;
    }

    const fileName = columns[1];
    if (fileName.startsWith("gm-")) {
      inventory.get(currentExtension).push(fileName);
    }
  });

  return inventory;
};

const listFiles = (extension) => {
  const extRoot = path.join(goldmasterRoot, extension);
  return fs
    .readdirSync(extRoot)
    .filter((name) => !name.startsWith("."))
    .filter((name) => !name.endsWith(".expectations.json"))
    .sort();
};

const buildExpectationsFileName = (fileName) => {
  const parsed = path.parse(fileName);
  return `${parsed.name}.expectations.json`;
};

describe("GoldMaster inventory coverage", () => {
  test("inventory entries match goldmaster files per extension", () => {
    const inventory = parseInventory(fs.readFileSync(inventoryPath, "utf8"));

    supportedExtensions.forEach((extension) => {
      const inventoryFiles = (inventory.get(extension) ?? []).slice().sort();
      const diskFiles = listFiles(extension);

      expect(inventoryFiles).toEqual(diskFiles);
    });
  });

  test("goldmaster files include expectations alongside documents", () => {
    supportedExtensions.forEach((extension) => {
      const diskFiles = listFiles(extension);
      const extRoot = path.join(goldmasterRoot, extension);
      diskFiles.forEach((fileName) => {
        const expectationsFile = buildExpectationsFileName(fileName);
        const expectationsPath = path.join(extRoot, expectationsFile);
        expect(fs.existsSync(expectationsPath)).toBe(true);
        const payload = JSON.parse(fs.readFileSync(expectationsPath, "utf8"));
        expect(Array.isArray(payload.rules)).toBe(true);
      });
    });
  });

  test("inventory lists new deep nesting and iframe scenarios", () => {
    const inventory = parseInventory(fs.readFileSync(inventoryPath, "utf8"));
    const expectedFiles = [
      "gm-html-101-iframe-labyrinth-with-deep-nesting.html",
      "gm-htm-101-iframe-stack-with-deep-nesting.htm",
      "gm-cshtml-101-iframe-labyrinth-with-deep-nesting.cshtml",
      "gm-razor-101-iframe-labyrinth-with-deep-nesting.razor",
      "gm-xaml-101-deep-nesting-frame-webbrowser.xaml"
    ];

    expectedFiles.forEach((fileName) => {
      const extension = fileName.split(".").pop();
      const inventoryFiles = inventory.get(extension) ?? [];
      expect(inventoryFiles).toContain(fileName);
    });
  });
});
