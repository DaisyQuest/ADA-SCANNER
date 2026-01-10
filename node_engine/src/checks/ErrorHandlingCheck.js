const { getLineNumberForSnippet } = require("./TextUtilities");

const confirmationTokens = ["confirm", "acknowledge", "agree"];
const statusTokens = ["status", "toast", "notification", "alert"];

const normalizeText = (value) => String(value ?? "").toLowerCase();

const hasConfirmationControl = (form) =>
  Array.from(form.querySelectorAll("input[type='checkbox'], input[type='text'], input[type='password']")).some(
    (input) => confirmationTokens.some((token) => normalizeText(input.getAttribute("name")).includes(token))
  );

const ErrorHandlingCheck = {
  id: "error-handling",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (!context.document?.querySelectorAll) {
      return issues;
    }

    for (const element of Array.from(context.document.querySelectorAll("[aria-invalid='true']"))) {
      if (element.hasAttribute("aria-errormessage") || element.hasAttribute("aria-describedby")) {
        continue;
      }
      const evidence = element.outerHTML;
      issues.push({
        ruleId: rule.id,
        checkId: ErrorHandlingCheck.id,
        filePath: context.filePath,
        line: getLineNumberForSnippet(context.content, evidence),
        message: "Invalid field is missing programmatic error identification.",
        evidence
      });
    }

    for (const element of Array.from(context.document.querySelectorAll("input[pattern], textarea[pattern]"))) {
      if (element.hasAttribute("title") || element.hasAttribute("aria-describedby")) {
        continue;
      }
      const evidence = element.outerHTML;
      issues.push({
        ruleId: rule.id,
        checkId: ErrorHandlingCheck.id,
        filePath: context.filePath,
        line: getLineNumberForSnippet(context.content, evidence),
        message: "Pattern validation lacks guidance for correcting errors.",
        evidence
      });
    }

    for (const form of Array.from(context.document.querySelectorAll("form[data-destructive='true'], form[data-requires-confirmation='true']"))) {
      if (hasConfirmationControl(form)) {
        continue;
      }
      const evidence = form.outerHTML;
      issues.push({
        ruleId: rule.id,
        checkId: ErrorHandlingCheck.id,
        filePath: context.filePath,
        line: getLineNumberForSnippet(context.content, evidence),
        message: "Potentially destructive form lacks a confirmation step.",
        evidence
      });
    }

    for (const element of Array.from(context.document.querySelectorAll("[class]"))) {
      const className = normalizeText(element.getAttribute("class"));
      if (!statusTokens.some((token) => className.includes(token))) {
        continue;
      }
      if (element.hasAttribute("role") || element.hasAttribute("aria-live")) {
        continue;
      }
      const evidence = element.outerHTML;
      issues.push({
        ruleId: rule.id,
        checkId: ErrorHandlingCheck.id,
        filePath: context.filePath,
        line: getLineNumberForSnippet(context.content, evidence),
        message: "Status message lacks role or aria-live notification.",
        evidence
      });
      break;
    }

    return issues;
  }
};

module.exports = { ErrorHandlingCheck, hasConfirmationControl };
