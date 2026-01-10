const { getLineNumberForSnippet } = require("./TextUtilities");

const AudioControlCheck = {
  id: "audio-control",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (!context.document?.querySelectorAll) {
      return issues;
    }

    for (const media of Array.from(context.document.querySelectorAll("audio, video"))) {
      if (!media.hasAttribute("autoplay")) {
        continue;
      }
      if (media.hasAttribute("controls") || media.hasAttribute("muted")) {
        continue;
      }

      const evidence = media.outerHTML;
      issues.push({
        ruleId: rule.id,
        checkId: AudioControlCheck.id,
        filePath: context.filePath,
        line: getLineNumberForSnippet(context.content, evidence),
        message: "Autoplay media should provide controls to pause or stop audio.",
        evidence
      });
    }

    return issues;
  }
};

module.exports = { AudioControlCheck };
