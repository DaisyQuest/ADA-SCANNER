const { getLineNumber } = require("./TextUtilities");

const normalizeText = (value) => (value || "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const getReferencedText = (document, ids) =>
  ids
    .map((id) => document.getElementById(id))
    .filter(Boolean)
    .map((element) => element.textContent || "")
    .join(" ");

const getVisibleLabel = (element) => {
  const tag = element.tagName?.toLowerCase();
  const role = element.getAttribute("role")?.toLowerCase();
  if (tag === "button" || role === "button") {
    return element.textContent || "";
  }

  if (tag === "a" || role === "link") {
    return element.textContent || "";
  }

  if (tag === "input") {
    const type = (element.getAttribute("type") || "").toLowerCase();
    if (["button", "submit", "reset"].includes(type)) {
      return element.getAttribute("value") || "";
    }
    if (type === "image") {
      return element.getAttribute("alt") || "";
    }
  }

  return "";
};

const getAccessibleNameCandidate = (element, document) => {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel;
  }

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy && labelledBy.trim()) {
    const ids = labelledBy.split(/\s+/).map((id) => id.trim()).filter(Boolean);
    const text = getReferencedText(document, ids);
    if (text.trim()) {
      return text;
    }
  }

  const title = element.getAttribute("title");
  if (title && title.trim()) {
    return title;
  }

  return "";
};

const isInteractiveCandidate = (element) => {
  const tag = element.tagName?.toLowerCase();
  const role = element.getAttribute("role")?.toLowerCase();
  if (tag === "button" || role === "button") {
    return true;
  }

  if (tag === "a") {
    return element.hasAttribute("href") || role === "link";
  }

  if (role === "link") {
    return true;
  }

  if (tag === "input") {
    const type = (element.getAttribute("type") || "").toLowerCase();
    return ["button", "submit", "reset", "image"].includes(type);
  }

  return false;
};

const LabelInNameCheck = {
  id: "label-in-name",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    if (!context.document?.querySelectorAll) {
      return [];
    }

    const issues = [];
    const candidates = Array.from(context.document.querySelectorAll("button, a, input, [role=\"button\"], [role=\"link\"]"));
    let searchStart = 0;

    for (const element of candidates) {
      if (!isInteractiveCandidate(element)) {
        continue;
      }

      const visibleLabel = normalizeText(getVisibleLabel(element));
      if (!visibleLabel) {
        continue;
      }

      const accessibleName = normalizeText(getAccessibleNameCandidate(element, context.document));
      if (!accessibleName) {
        continue;
      }

      if (!accessibleName.includes(visibleLabel)) {
        const evidence = element.outerHTML;
        const matchIndex = context.content.indexOf(evidence, searchStart);
        issues.push({
          ruleId: rule.id,
          checkId: LabelInNameCheck.id,
          filePath: context.filePath,
          line: getLineNumber(context.content, matchIndex >= 0 ? matchIndex : searchStart),
          message: "Accessible name does not include the visible label.",
          evidence
        });
        if (matchIndex >= 0) {
          searchStart = matchIndex + evidence.length;
        }
      }
    }

    return issues;
  }
};

module.exports = {
  LabelInNameCheck,
  normalizeText,
  getVisibleLabel,
  getAccessibleNameCandidate,
  isInteractiveCandidate
};
