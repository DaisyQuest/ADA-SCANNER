const fs = require("fs");
const path = require("path");
const { RuleSchemaValidator } = require("./RuleSchemaValidator");

const AllowedProperties = new Set([
  "id",
  "description",
  "severity",
  "checkId",
  "appliesTo",
  "recommendation",
  "wcagCriteria",
  "problemTags"
]);

const RequiredProperties = ["id", "description", "severity", "checkId"];

class RuleValidationResult {
  constructor(teams, errors) {
    this.teams = teams;
    this.errors = errors;
  }

  get isValid() {
    return this.errors.length === 0;
  }
}

class RuleLoader {
  constructor() {
    this.validator = new RuleSchemaValidator();
  }

  loadRules(rulesRoot) {
    if (!rulesRoot || !rulesRoot.trim()) {
      throw new Error("Rules root is required.");
    }

    if (!fs.existsSync(rulesRoot)) {
      throw new Error(`Rules directory not found: ${rulesRoot}`);
    }

    const teamRules = [];
    for (const teamDirectory of fs.readdirSync(rulesRoot, { withFileTypes: true })) {
      if (!teamDirectory.isDirectory()) {
        continue;
      }

      const teamName = teamDirectory.name;
      const rules = [];
      const teamPath = path.join(rulesRoot, teamName);
      for (const file of fs.readdirSync(teamPath)) {
        const extension = path.extname(file).toLowerCase();
        if (![".json", ".yml", ".yaml"].includes(extension)) {
          continue;
        }

        const result = this.loadRuleFile(path.join(teamPath, file), false);
        rules.push(result.rule);
      }

      teamRules.push({ teamName, rules });
    }

    return teamRules;
  }

  validateRules(rulesRoot) {
    if (!rulesRoot || !rulesRoot.trim()) {
      throw new Error("Rules root is required.");
    }

    if (!fs.existsSync(rulesRoot)) {
      throw new Error(`Rules directory not found: ${rulesRoot}`);
    }

    const teamRules = [];
    const errors = [];

    for (const teamDirectory of fs.readdirSync(rulesRoot, { withFileTypes: true })) {
      if (!teamDirectory.isDirectory()) {
        continue;
      }

      const teamName = teamDirectory.name;
      const rules = [];
      const teamPath = path.join(rulesRoot, teamName);
      for (const file of fs.readdirSync(teamPath)) {
        const extension = path.extname(file).toLowerCase();
        if (![".json", ".yml", ".yaml"].includes(extension)) {
          continue;
        }

        const result = this.loadRuleFile(path.join(teamPath, file), true);
        rules.push(result.rule);
        for (const error of result.errors) {
          errors.push({ team: teamName, ruleId: result.ruleIdForError, message: error });
        }

        const ruleErrors = this.validator.validate(result.rule);
        for (const error of ruleErrors) {
          errors.push({ team: teamName, ruleId: result.ruleIdForError, message: error });
        }
      }

      teamRules.push({ teamName, rules });
    }

    return new RuleValidationResult(teamRules, errors);
  }

  loadRule(pathToRule) {
    return this.loadRuleFile(pathToRule, false, true).rule;
  }

  loadRuleFile(pathToRule, captureErrors, allowJsonExceptions = false) {
    try {
      const extension = path.extname(pathToRule).toLowerCase();
      if (extension === ".json") {
        const json = fs.readFileSync(pathToRule, "utf-8");
        if (captureErrors) {
          try {
            return parseJsonRule(json, pathToRule);
          } catch (error) {
            if (error instanceof SyntaxError) {
              return {
                rule: emptyRule(),
                errors: [`Rule file ${pathToRule} contains empty or invalid JSON.`],
                ruleIdForError: path.basename(pathToRule, extension),
                hasParseError: true
              };
            }
          }
        }

        const result = parseJsonRule(json, pathToRule);
        if (result.hasParseError) {
          throw new Error(result.errors.join(" "));
        }

        return result;
      }

      if (extension === ".yml" || extension === ".yaml") {
        const lines = fs.readFileSync(pathToRule, "utf-8").split(/\r?\n/);
        const result = parseSimpleYamlRule(lines, pathToRule);
        if (!captureErrors && result.hasParseError) {
          throw new Error(result.errors.join(" "));
        }

        return result;
      }

      throw new Error(`Unsupported rule file format: ${pathToRule}`);
    } catch (error) {
      if (error instanceof SyntaxError && !allowJsonExceptions) {
        throw new Error(`Rule file ${pathToRule} contains empty or invalid JSON.`);
      }

      if (captureErrors) {
        return {
          rule: emptyRule(),
          errors: [error.message],
          ruleIdForError: path.basename(pathToRule, path.extname(pathToRule)),
          hasParseError: true
        };
      }

      throw error;
    }
  }
}

const emptyRule = () => ({
  id: "",
  description: "",
  severity: "",
  checkId: "",
  appliesTo: null,
  recommendation: null,
  wcagCriteria: null,
  problemTags: null
});

const parseJsonRule = (json, pathToRule) => {
  const errors = [];
  const document = JSON.parse(json);

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push("Rule definition must be a JSON object.");
    return {
      rule: emptyRule(),
      errors,
      ruleIdForError: path.basename(pathToRule, path.extname(pathToRule)),
      hasParseError: true
    };
  }

  const values = {};
  for (const [name, value] of Object.entries(document)) {
    if (!AllowedProperties.has(name)) {
      errors.push(`Unknown property '${name}'.`);
      continue;
    }

    if (typeof value === "string") {
      values[name] = value;
    } else {
      errors.push(`Property '${name}' must be a string.`);
      values[name] = null;
    }
  }

  for (const required of RequiredProperties) {
    if (!(required in values)) {
      errors.push(`Missing required property '${required}'.`);
    }
  }

  const rule = {
    id: values.id ?? "",
    description: values.description ?? "",
    severity: values.severity ?? "",
    checkId: values.checkId ?? "",
    appliesTo: normalizeOptional(values.appliesTo),
    recommendation: normalizeOptional(values.recommendation),
    wcagCriteria: normalizeOptional(values.wcagCriteria),
    problemTags: normalizeOptional(values.problemTags)
  };

  const ruleId = rule.id || path.basename(pathToRule, path.extname(pathToRule));
  return {
    rule,
    errors,
    ruleIdForError: ruleId,
    hasParseError: errors.length > 0
  };
};

const parseSimpleYamlRule = (lines, pathToRule) => {
  const values = {};
  const errors = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf(":");
    if (index <= 0) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!AllowedProperties.has(key)) {
      errors.push(`Unknown property '${key}'.`);
      continue;
    }

    values[key] = value;
  }

  for (const required of RequiredProperties) {
    if (!(required in values)) {
      errors.push(`Missing required property '${required}'.`);
    }
  }

  const rule = {
    id: values.id ?? "",
    description: values.description ?? "",
    severity: values.severity ?? "",
    checkId: values.checkId ?? "",
    appliesTo: normalizeOptional(values.appliesTo),
    recommendation: normalizeOptional(values.recommendation),
    wcagCriteria: normalizeOptional(values.wcagCriteria),
    problemTags: normalizeOptional(values.problemTags)
  };

  const ruleId = rule.id || path.basename(pathToRule, path.extname(pathToRule));
  return {
    rule,
    errors,
    ruleIdForError: ruleId,
    hasParseError: errors.length > 0
  };
};

const normalizeOptional = (value) => {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

module.exports = { RuleLoader, RuleValidationResult, parseJsonRule, parseSimpleYamlRule };
