#!/usr/bin/env node

const { resolveGoldMasterOptions } = require("./options");
const { runGoldMaster } = require("./GoldMasterRunner");

const startGoldMaster = async ({ argv = process.argv.slice(2), env = process.env, logger = console } = {}) => {
  const options = resolveGoldMasterOptions({ argv, env });
  if (options.errors.length) {
    options.errors.forEach((error) => logger.error(error));
    return { started: false, errors: options.errors };
  }

  const result = await runGoldMaster({
    rootDir: options.rootDir,
    rulesRoot: options.rulesRoot,
    outputDir: options.outputDir,
    extensions: options.extensions,
    logger
  });

  logger.log(`GoldMaster reports written to ${result.summaryPath}`);

  return { started: true, summaryPath: result.summaryPath, summary: result.summary };
};

const runCli = (options) =>
  startGoldMaster(options).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

/* istanbul ignore next */
if (require.main === module) {
  runCli();
}

module.exports = {
  startGoldMaster,
  runCli
};
