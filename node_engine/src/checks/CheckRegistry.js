const { AbsolutePositioningCheck } = require("./AbsolutePositioningCheck");
const { FixedWidthLayoutCheck } = require("./FixedWidthLayoutCheck");
const { MissingLabelCheck } = require("./MissingLabelCheck");
const { MissingDocumentLanguageCheck } = require("./MissingDocumentLanguageCheck");
const { UnlabeledButtonCheck } = require("./UnlabeledButtonCheck");
const { MissingPageTitleCheck } = require("./MissingPageTitleCheck");
const { MissingTableHeaderCheck } = require("./MissingTableHeaderCheck");
const { MissingAltTextCheck } = require("./MissingAltTextCheck");
const { NonWrappingContainerCheck } = require("./NonWrappingContainerCheck");
const { InvalidAriaRoleCheck } = require("./InvalidAriaRoleCheck");
const { HiddenNavigationCheck } = require("./HiddenNavigationCheck");
const { HiddenFocusableElementCheck } = require("./HiddenFocusableElementCheck");
const { InsufficientContrastCheck } = require("./InsufficientContrastCheck");
const { XamlMissingNameCheck } = require("./XamlMissingNameCheck");
const { MissingLinkTextCheck } = require("./MissingLinkTextCheck");
const { MissingIframeTitleCheck } = require("./MissingIframeTitleCheck");
const { MissingFieldsetLegendCheck } = require("./MissingFieldsetLegendCheck");
const { MissingSkipLinkCheck } = require("./MissingSkipLinkCheck");

class CheckRegistry {
  constructor(checks = []) {
    this.checks = new Map();
    checks.forEach((check) => this.register(check));
  }

  register(check) {
    if (!check || !check.id) {
      throw new Error("Check must have an id.");
    }

    this.checks.set(check.id, check);
  }

  find(id) {
    return this.checks.get(id) ?? null;
  }

  list() {
    return Array.from(this.checks.values());
  }
}

const createDefaultCheckRegistry = () =>
  new CheckRegistry([
    AbsolutePositioningCheck,
    FixedWidthLayoutCheck,
    MissingLabelCheck,
    MissingDocumentLanguageCheck,
    UnlabeledButtonCheck,
    MissingPageTitleCheck,
    MissingTableHeaderCheck,
    MissingAltTextCheck,
    NonWrappingContainerCheck,
    InvalidAriaRoleCheck,
    HiddenNavigationCheck,
    HiddenFocusableElementCheck,
    InsufficientContrastCheck,
    XamlMissingNameCheck,
    MissingLinkTextCheck,
    MissingIframeTitleCheck,
    MissingFieldsetLegendCheck,
    MissingSkipLinkCheck
  ]);

module.exports = { CheckRegistry, createDefaultCheckRegistry };
