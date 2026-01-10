const path = require("path");

const SUPPORTED_EXTENSIONS = [".html", ".htm", ".cshtml", ".razor", ".xaml", ".ftl", ".js"];

const normalizeExtension = (value) => {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  const dotted = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  const normalized = dotted.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(normalized) ? normalized : null;
};

const splitExtensions = (value) =>
  String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const resolveGoldMasterOptions = ({ argv = [], env = process.env, cwd = process.cwd() } = {}) => {
  const options = {
    rootDir: env.GOLDMASTER_ROOT_DIR ?? path.resolve(cwd, "goldmaster"),
    rulesRoot: env.GOLDMASTER_RULES_ROOT ?? env.RULES_ROOT ?? env.ADA_RULES_ROOT ?? path.resolve(cwd, "../rules"),
    outputDir: env.GOLDMASTER_OUTPUT_DIR ?? path.resolve(cwd, "goldmaster_output"),
    extensions: [],
    all: false,
    comparePath: null,
    savePath: null,
    errors: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      options.all = true;
    } else if (arg === "--ext") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        options.errors.push("--ext requires a value.");
        continue;
      }
      index += 1;
      for (const entry of splitExtensions(value)) {
        const normalized = normalizeExtension(entry);
        if (!normalized) {
          options.errors.push(`Unsupported extension: ${entry}`);
          continue;
        }
        options.extensions.push(normalized);
      }
    } else if (arg === "--outputDir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        options.errors.push("--outputDir requires a value.");
        continue;
      }
      index += 1;
      options.outputDir = value ? value.trim() : "";
      if (!options.outputDir) {
        options.errors.push("--outputDir requires a value.");
      }
    } else if (arg === "--compare") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        options.errors.push("--compare requires a value.");
        continue;
      }
      index += 1;
      options.comparePath = value ? value.trim() : "";
      if (!options.comparePath) {
        options.errors.push("--compare requires a value.");
      }
    } else if (arg === "--save") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        options.errors.push("--save requires a value.");
        continue;
      }
      index += 1;
      options.savePath = value ? value.trim() : "";
      if (!options.savePath) {
        options.errors.push("--save requires a value.");
      }
    } else if (arg?.startsWith("--")) {
      options.errors.push(`Unknown option: ${arg}`);
    }
  }

  if (options.all) {
    options.extensions = [...SUPPORTED_EXTENSIONS];
  } else {
    options.extensions = [...new Set(options.extensions)];
  }

  if (!options.extensions.length) {
    options.errors.push("No extensions selected. Use --all or --ext.");
  }

  return options;
};

module.exports = {
  SUPPORTED_EXTENSIONS,
  normalizeExtension,
  resolveGoldMasterOptions
};
