const { getLineNumber, containsAttribute } = require("./TextUtilities");

const elementRegex = /<(?<tag>[a-z0-9]+)(?<attrs>[^>]*)>/gi;
const mouseClickEvents = ["onclick", "onmousedown", "onmouseup", "ondblclick"];
const mouseHoverEvents = ["onmouseover", "onmouseout", "onmouseenter", "onmouseleave"];
const keyboardEvents = ["onkeydown", "onkeypress", "onkeyup"];
const focusEvents = ["onfocus", "onblur"];

const containsAny = (attributes, names) => names.some((name) => containsAttribute(attributes, name));

const DeviceDependentEventHandlerCheck = {
  id: "device-dependent-event-handler",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(elementRegex)) {
      const attrs = match.groups?.attrs ?? "";
      const hasMouseClick = containsAny(attrs, mouseClickEvents);
      const hasMouseHover = containsAny(attrs, mouseHoverEvents);
      if (!hasMouseClick && !hasMouseHover) {
        continue;
      }

      const hasKeyboard = containsAny(attrs, keyboardEvents);
      const hasFocus = containsAny(attrs, focusEvents);
      if ((hasMouseClick && !hasKeyboard) || (hasMouseHover && !hasFocus)) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: DeviceDependentEventHandlerCheck.id,
          filePath: context.filePath,
          line,
          message: "Mouse-specific event handler lacks keyboard equivalent.",
          evidence: match[0]
        });
      }
    }

    return issues;
  }
};

module.exports = { DeviceDependentEventHandlerCheck, containsAny };
