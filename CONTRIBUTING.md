# Contributing to OneCLIQ

Thanks for helping improve OneCLIQ. You can contribute a bug fix, a test, documentation, accessibility improvements, or an idea for a new feature. Small, focused changes are welcome.

OneCLIQ has two main parts: the website that finds a suitable file in a public GitHub release, and `oqgit`, a command-line tool that resolves, downloads, and checks release files. A recommended file is a platform match, not a promise that the software is safe.

## Before you start

- Look for an existing issue or pull request before starting work.
- For a bug, open a [bug report](.github/ISSUE_TEMPLATE/bug_report.yml) with steps someone else can repeat.
- For a new feature or a change in behavior, open a [feature request](.github/ISSUE_TEMPLATE/feature_request.yml) to explain the problem you want to solve.
- If you discover a vulnerability, follow [SECURITY.md](SECURITY.md). Do not post the details in a public issue.
- Please read the [Code of Conduct](CODE_OF_CONDUCT.md).

You do not need permission to fix a clear bug or improve documentation. For a large change, discussing the approach in an issue first can save time.

## Set up your copy

You need Node.js 20.9 or newer and npm. Start with a fork or a local copy of the repository.

```bash
npm ci
npm run dev
```

The development website starts at `http://localhost:3000` by default. Configuration is optional. If you need environment settings, copy `.env.example` to `.env.local`. Never commit tokens, local environment files, or private data.

The CLI is in `cli/`. You can run it from source without installing it globally:

```bash
npm run cli:dev -- get sharkdp/bat --dry-run
```

The example uses a public GitHub repository. Some live GitHub operations are subject to API rate limits.

## Find the right place to work

| Area | Files |
| --- | --- |
| Shared release parsing, matching, trust checks, and lockfiles | `src/core/` |
| GitHub client and server-side behavior | `src/server/` |
| HTTP endpoints | `src/app/api/` |
| Website and interface | `src/app/`, `src/components/` |
| CLI commands, downloads, and MCP support | `cli/src/` |
| Unit tests and fixtures | `tests/unit/`, `tests/fixtures/` |
| Browser tests and mock GitHub API | `e2e/` |

The web app and CLI share code in `src/core/`. When you change how a release or asset is selected, check both interfaces. The files in `src/components/designpass/` are vendored from DesignPass.dev. Preserve their upstream notices and avoid unrelated changes there.

## Make a change

1. Create a branch for your work, such as `fix/macos-asset-match` or `docs/clarify-setup`.
2. Keep the change focused. Match the TypeScript and formatting conventions in nearby files.
3. Add or update tests when you change behavior. Use the existing fixtures and mocked GitHub responses where possible, so tests do not depend on live API calls.
4. If a command, API response, feature, or setup step changes, update its documentation.
5. Review the diff for secrets, generated files, and unrelated edits before opening a pull request.

In particular, changes to downloads or trust checks should preserve the project's safety boundaries: validate GitHub URLs, handle ambiguous asset matches clearly, and never run downloaded software automatically. Make error messages understandable without exposing tokens or internal details.

## Run the checks

These are the commands defined in the root `package.json`:

```bash
npm run lint           # ESLint
npm run typecheck      # Next.js type generation and TypeScript
npm test               # Vitest unit tests
npm run build          # Production web build
npm run cli:build      # Bundle the oqgit CLI
npm run check          # All five commands above
```

For changes to the website's user flow, also run the browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright tests build the app, start a local mock GitHub API, and check desktop and mobile flows. The Chromium installation is needed on a machine that has not used Playwright before. If a check cannot run, describe why in your pull request instead of marking it as passed.

## Open a pull request

Submit your branch as a pull request against the project's main development branch. In your description, explain the problem, what changed, and how you checked it. Include screenshots or a short recording when the interface changes. Link the related issue if there is one.

Use the [pull request template](.github/pull_request_template.md) to share test results and any known limitations. A maintainer may ask for changes or more information. Keep discussions respectful and be willing to adjust the approach after review.

By contributing, you agree that your contribution can be distributed under the project's [MIT License](LICENSE). Only submit code and other work you have permission to share, and keep required third-party attribution intact.
