# ADA Scanner Project Checklist

All checklist items mirror `PROJECT_SPEC.md` identifiers. Items are checked **only when complete with tests**.

- [ ] SPEC-001 C#-ecosystem static analysis CLI for Visual Studio projects is implemented with tests.
- [ ] SPEC-002 CLI entrypoints (`scan`, `rules list`, `rules validate`, `report`) run headless/offline with tests.
- [ ] SPEC-003 Per-team rule directories load correctly with tests.
- [ ] SPEC-004 Static analysis covers XAML/Razor/HTML/resources with tests.
- [ ] SPEC-005 Offline/no-internet constraints enforced in code and tests.
- [ ] SPEC-006 Future automation interfaces exist without Playwright integration, with tests.
- [ ] SPEC-007 Headless execution requirements documented for each CLI command.
- [ ] SPEC-008 WCAG 2.0 AA rule schema supports static checks (ARIA, contrast, hidden navigation, error placement, responsive size) with tests.
- [ ] SPEC-009 Rule validation pipeline implemented and tested.
- [ ] SPEC-010 Reporting aggregates by rule, file, and team with tests.
- [ ] SPEC-011 Spec/checklist synchronization check implemented and tested.
- [ ] SPEC-012 Team work summaries appended before commit (process enforced).
- [ ] SPEC-013 Unit tests cover all logic with full branch coverage targets.
- [ ] SPEC-014 CLI execution paths are testable in headless offline mode.
- [ ] SPEC-015 No tests or production code depend on network access.
- [ ] SPEC-016 Directory layout documented with all team rule folders listed.
- [ ] SPEC-017 Team selection rules documented and followed.
- [ ] SPEC-018 Safe commit workflow documented and followed.
- [ ] SPEC-019 Runtime scanning accepts browser-captured HTML via localhost listener without automation.
- [ ] SPEC-020 Cross-platform CLI launchers route to listener/static analysis helpers with console output.
