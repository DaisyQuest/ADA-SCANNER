const { getLineNumber } = require("./TextUtilities");

const sensoryPattern = /\b(left|right|above|below|top|bottom|red|green|blue|yellow|color|circle|square|triangle|shape|bigger|smaller)\b/i;
const instructionPattern = /\b(click|select|choose|press|tap|see|look|follow)\b/i;
const tagStripper = /<[^>]+>/g;
const scriptStyleStripper = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi;

const extractText = (content) =>
  content.replace(scriptStyleStripper, " ").replace(tagStripper, " ");

const SensoryCharacteristicsCheck = {
  id: "sensory-characteristics",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    const text = extractText(context.content);
    const match = text.match(sensoryPattern);
    if (!match) {
      return issues;
    }

    if (!instructionPattern.test(text)) {
      return issues;
    }

    const index = context.content.toLowerCase().indexOf(match[0].toLowerCase());
    issues.push({
      ruleId: rule.id,
      checkId: SensoryCharacteristicsCheck.id,
      filePath: context.filePath,
      line: getLineNumber(context.content, Math.max(index, 0)),
      message: "Instructions may rely on sensory characteristics like color or position.",
      evidence: match[0]
    });

    return issues;
  }
};

module.exports = { SensoryCharacteristicsCheck, extractText };
