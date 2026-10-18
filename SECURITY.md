# Security Policy

OneCLIQ helps users find and download files from public GitHub releases. The website recommends files by operating system and CPU, while the `oqgit` CLI also supports downloads and integrity checks. A recommended match or trust score is not a guarantee that a release file is safe.

We welcome responsible reports about weaknesses in the website, API, CLI, dependency handling, or release verification logic.

## Report a vulnerability privately

1. Open this repository's **Security** tab on GitHub.
2. If **Report a vulnerability** is available, use it to submit a private security advisory.
3. If private advisories are unavailable, use a private contact method explicitly published by a repository maintainer on their GitHub profile or an official project page.
4. If you cannot find a private reporting path, you may open a public issue asking maintainers to provide one. Do not include vulnerability details, exploit steps, or sensitive data in that issue.

Please do not open public bug reports or pull requests that reveal an unpatched vulnerability. Avoid testing against other people's systems or data without permission.

In a private report, include what is affected, how to reproduce it safely, the possible impact, and any relevant version or commit. Redact access tokens, personal information, and other secrets. A minimal proof of concept is useful when it can be shared safely.

## What happens next

Maintainers will review reports as capacity allows. They may ask for clarification, investigate whether the issue can be reproduced, and coordinate a fix and disclosure. There is no guaranteed response or remediation timeline. Please give maintainers a reasonable opportunity to investigate before sharing technical details publicly.

The actively developed code is the primary focus for fixes. This project does not currently promise long-term support or security backports for older versions. Review the repository's releases and commits for the status of a particular fix.

## Security-related areas

Reports are particularly useful for problems involving URL validation, server-side GitHub API requests, rate limiting, token exposure, release file matching, downloaded-file integrity, redirect handling, lockfiles, or the CLI's optional file-opening behavior.

For ordinary bugs that do not pose a security risk, use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) instead.
