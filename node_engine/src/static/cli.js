#!/usr/bin/env node

const path = require("path");
const { StaticAnalyzer } = require("./StaticAnalyzer");
const { StaticAnalysisServer } = require("./StaticAnalysisServer");
const { StaticReportBuilder } = require("./StaticReportBuilder");

const resolveStaticOptions = ({ argv, env }) => {
  const options = {
    rootDir: env.ROOT_DIR ?? env.ADA_ROOT_DIR ?? "",
    rulesRoot: env.RULES_ROOT ?? env.ADA_RULES_ROOT ?? "",
    port: env.PORT ? Number(env.PORT) : null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root-dir" || arg === "--rootDir") {
      options.rootDir = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--rules-root" || arg === "--rulesRoot") {
      options.rulesRoot = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--port") {
      const value = argv[index + 1];
      options.port = value ? Number(value) : null;
      index += 1;
    } else if (!arg.startsWith("--") && !options.rootDir) {
      options.rootDir = arg;
    }
  }

  if (!Number.isFinite(options.port)) {
    options.port = null;
  }

  if (!options.rulesRoot) {
    options.rulesRoot = path.resolve(process.cwd(), "../rules");
  }

  return options;
};

const startStaticAnalysis = async ({
  argv = process.argv.slice(2),
  env = process.env,
  logger = console,
  analyzer = new StaticAnalyzer(),
  ServerClass = StaticAnalysisServer
} = {}) => {
  const { rootDir, rulesRoot, port } = resolveStaticOptions({ argv, env });
  if (!rootDir || !rootDir.trim()) {
    logger.error("Root directory is required.");
    return { started: false };
  }

  const result = analyzer.scanRoot({ rootDir, rulesRoot });
  const server = new ServerClass({
    documents: result.documents,
    issues: result.issues,
    reportBuilder: new StaticReportBuilder(),
    port: port ?? 0
  });
  const actualPort = await server.start();
  logger.log(`Static analysis server running on port ${actualPort}.`);
  logger.log(`Scanned ${result.documents.length} files with ${result.issues.length} issues.`);

  return { started: true, port: actualPort, server, result };
};

const runCli = (options) =>
  startStaticAnalysis(options).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

/* istanbul ignore next */
if (require.main === module) {
  runCli();
}

module.exports = {
  resolveStaticOptions,
  startStaticAnalysis,
  runCli
};
