const { getLineNumberForSnippet } = require("./TextUtilities");

const mediaSelector = "audio, video";
const transcriptTokens = ["transcript", "captions", "subtitles"];
const descriptionTokens = ["audio description", "description", "described"];

const normalizeText = (value) => String(value ?? "").toLowerCase();

const elementHasTrack = (element, kinds) => {
  for (const track of Array.from(element.querySelectorAll("track"))) {
    const kind = normalizeText(track.getAttribute("kind"));
    if (kinds.includes(kind)) {
      return true;
    }
  }
  return false;
};

const hasNearbyLinkText = (element, tokens) => {
  const parent = element.parentElement;
  if (!parent) {
    return false;
  }

  for (const link of Array.from(parent.querySelectorAll("a, button"))) {
    const text = normalizeText(link.textContent);
    if (tokens.some((token) => text.includes(token))) {
      return true;
    }
  }

  return false;
};

const MediaAlternativeCheck = {
  id: "media-alternative",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (!context.document?.querySelectorAll) {
      return issues;
    }

    for (const media of Array.from(context.document.querySelectorAll(mediaSelector))) {
      if (media.getAttribute("aria-hidden") === "true") {
        continue;
      }

      const hasCaptions = elementHasTrack(media, ["captions", "subtitles"]);
      const hasTranscript = hasNearbyLinkText(media, transcriptTokens);
      if (!hasCaptions && !hasTranscript) {
        const evidence = media.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: MediaAlternativeCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: "Media element is missing captions or a transcript link.",
          evidence
        });
      }

      if (media.tagName.toLowerCase() === "video") {
        const hasDescription = elementHasTrack(media, ["descriptions", "description"]) ||
          hasNearbyLinkText(media, descriptionTokens);
        if (!hasDescription) {
          const evidence = media.outerHTML;
          issues.push({
            ruleId: rule.id,
            checkId: MediaAlternativeCheck.id,
            filePath: context.filePath,
            line: getLineNumberForSnippet(context.content, evidence),
            message: "Video element is missing an audio description alternative.",
            evidence
          });
        }
      }
    }

    return issues;
  }
};

module.exports = { MediaAlternativeCheck };
