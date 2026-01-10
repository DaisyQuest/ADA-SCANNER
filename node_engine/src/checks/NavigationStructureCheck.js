const { getLineNumberForSnippet } = require("./TextUtilities");

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const collectNavSequences = (document) =>
  Array.from(document.querySelectorAll("nav, [role='navigation']")).map((nav) =>
    Array.from(nav.querySelectorAll("a"))
      .map((link) => normalizeText(link.textContent))
      .filter(Boolean)
  );

const hasSearchInput = (document) =>
  Boolean(document.querySelector("input[type='search'], input[aria-label*='search' i]"));

const hasSitemapLink = (document) =>
  Array.from(document.querySelectorAll("a")).some((link) =>
    normalizeText(link.textContent).includes("sitemap") || normalizeText(link.textContent).includes("site map")
  );

const NavigationStructureCheck = {
  id: "navigation-structure",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (!context.document?.querySelectorAll) {
      return issues;
    }

    const tabStops = Array.from(context.document.querySelectorAll("[tabindex]"))
      .filter((element) => {
        const value = parseInt(element.getAttribute("tabindex"), 10);
        return Number.isFinite(value) && value > 0;
      });

    for (const element of tabStops) {
      const evidence = element.outerHTML;
      issues.push({
        ruleId: rule.id,
        checkId: NavigationStructureCheck.id,
        filePath: context.filePath,
        line: getLineNumberForSnippet(context.content, evidence),
        message: "Positive tabindex may create an unexpected focus order.",
        evidence
      });
    }

    const navSequences = collectNavSequences(context.document);
    if (navSequences.length > 1) {
      const [first, ...rest] = navSequences;
      const mismatch = rest.some((sequence) =>
        sequence.length !== first.length || sequence.some((text, index) => text !== first[index])
      );
      if (mismatch) {
        issues.push({
          ruleId: rule.id,
          checkId: NavigationStructureCheck.id,
          filePath: context.filePath,
          line: 1,
          message: "Navigation order differs across repeated navigation regions.",
          evidence: "nav"
        });
      }
    }

    const hrefMap = new Map();
    for (const link of Array.from(context.document.querySelectorAll("a[href]"))) {
      const href = link.getAttribute("href");
      const text = normalizeText(link.textContent);
      if (!href || !text) {
        continue;
      }
      const existing = hrefMap.get(href);
      if (existing && existing !== text) {
        issues.push({
          ruleId: rule.id,
          checkId: NavigationStructureCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, link.outerHTML),
          message: "Links with the same destination use inconsistent labels.",
          evidence: link.outerHTML
        });
        break;
      }
      hrefMap.set(href, text);
    }

    const hasNavigation = navSequences.length > 0;
    if (!hasNavigation && !hasSearchInput(context.document) && !hasSitemapLink(context.document)) {
      issues.push({
        ruleId: rule.id,
        checkId: NavigationStructureCheck.id,
        filePath: context.filePath,
        line: 1,
        message: "Provide multiple ways to locate pages, such as search or site map links.",
        evidence: "navigation"
      });
    }

    return issues;
  }
};

module.exports = { NavigationStructureCheck, collectNavSequences };
