const { ListenerServer } = require("../listener/ListenerServer");

const resolveListenerOptions = ({ argv, env }) => {
  const options = {
    rulesRoot: env.RULES_ROOT ?? env.ADA_RULES_ROOT ?? "",
    port: env.PORT ? Number(env.PORT) : null,
    allowedOrigins: env.ALLOWED_ORIGINS ?? env.ADA_ALLOWED_ORIGINS ?? null,
    ignoreSelfCapture: env.IGNORE_SELF_CAPTURE !== "false"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--rules-root" || arg === "--rulesRoot") {
      options.rulesRoot = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--port") {
      const value = argv[index + 1];
      options.port = value ? Number(value) : null;
      index += 1;
    } else if (arg === "--allowed-origins" || arg === "--allowedOrigins") {
      options.allowedOrigins = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--allow-self-capture") {
      options.ignoreSelfCapture = false;
    }
  }

  if (!Number.isFinite(options.port)) {
    options.port = null;
  }

  if (options.allowedOrigins && !String(options.allowedOrigins).trim()) {
    options.allowedOrigins = null;
  }

  return options;
};

const startListener = async ({
  argv = process.argv.slice(2),
  env = process.env,
  logger = console,
  ListenerServerClass = ListenerServer
} = {}) => {
  const { rulesRoot, port, allowedOrigins, ignoreSelfCapture } = resolveListenerOptions({ argv, env });
  if (!rulesRoot || !rulesRoot.trim()) {
    logger.error("Rules root is required.");
    return { started: false };
  }

  const serverOptions = {
    rulesRoot,
    port: port ?? 0,
    ignoreSelfCapture
  };
  if (allowedOrigins) {
    serverOptions.allowedOrigins = allowedOrigins;
  }

  const server = new ListenerServerClass(serverOptions);
  const actualPort = await server.start();
  logger.log(`Listener server running on port ${actualPort}.`);

  return { started: true, port: actualPort, server };
};

module.exports = { resolveListenerOptions, startListener };
