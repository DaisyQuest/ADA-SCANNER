module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.js", "extension/**/*.js"],
  coveragePathIgnorePatterns: ["/node_modules/"],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
