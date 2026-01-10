const { getLineNumber } = require("./TextUtilities");

const patterns = [
  {
    id: "accesskey",
    regex: /\baccesskey\s*=/i,
    message: "Character key shortcut detected; allow remapping or disable shortcuts."
  },
  {
    id: "meta-refresh",
    regex: /<meta[^>]*http-equiv=["']refresh["'][^>]*>/i,
    message: "Meta refresh detected; provide timing controls."
  },
  {
    id: "timeout",
    regex: /set(Time|Interval)out\s*\(/i,
    message: "Scripted timeouts detected; ensure time limits are adjustable."
  },
  {
    id: "marquee",
    regex: /<marquee\b/i,
    message: "Marquee content detected; provide pause, stop, or hide controls."
  },
  {
    id: "animation-infinite",
    regex: /animation[^;]*infinite/i,
    message: "Infinite animation detected; ensure pause or stop controls exist."
  },
  {
    id: "flashing",
    regex: /animation[^;]*(flash|blink|strobe|flicker)/i,
    message: "Flashing animation detected; confirm it stays below flash thresholds."
  },
  {
    id: "pointer-gesture",
    regex: /on(touchstart|touchmove|pointermove|pointerdown)\s*=/i,
    message: "Pointer gesture handler detected; ensure single-pointer alternatives."
  },
  {
    id: "motion-actuation",
    regex: /(devicemotion|deviceorientation|DeviceMotionEvent)/i,
    message: "Motion-based interaction detected; provide UI alternatives and disable options."
  },
  {
    id: "keyboard-trap",
    regex: /onkeydown\s*=\s*"[^"]*(key|keyCode|which)[^\n"]*9[^\n"]*preventDefault/i,
    message: "Potential keyboard trap detected; ensure focus can escape."
  },
  {
    id: "onfocus-change",
    regex: /onfocus\s*=\s*"[^"]*(location|submit|window\.open)/i,
    message: "Focus handler changes context; avoid unexpected navigation on focus."
  },
  {
    id: "oninput-change",
    regex: /on(change|input)\s*=\s*"[^"]*(location|submit|window\.open)/i,
    message: "Input handler changes context; warn users before navigation."
  }
];

const InteractionLimitsCheck = {
  id: "interaction-limits",
  applicableKinds: ["html", "htm", "cshtml", "razor", "css", "js"],
  run(context, rule) {
    const issues = [];
    for (const entry of patterns) {
      const match = context.content.match(entry.regex);
      if (!match) {
        continue;
      }
      const index = context.content.search(entry.regex);
      issues.push({
        ruleId: rule.id,
        checkId: InteractionLimitsCheck.id,
        filePath: context.filePath,
        line: getLineNumber(context.content, Math.max(index, 0)),
        message: entry.message,
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { InteractionLimitsCheck };
