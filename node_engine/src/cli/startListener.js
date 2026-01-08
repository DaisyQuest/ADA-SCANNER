const { startListener } = require("./ListenerCli");

startListener().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
