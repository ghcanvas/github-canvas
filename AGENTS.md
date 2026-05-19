# Repository Instructions

- Do not add or modify test files unless the user explicitly asks for tests.
- Do not run the test suite unless the user explicitly asks for tests or test verification.
- Do not run local builds unless the user explicitly asks for build verification. The user runs builds during deployment and will debug build-only issues then.
- Do not start or deploy to local test servers unless the user explicitly asks for it. The user runs the app manually.
- The user reviews code changes in VS Code, commits there, and uses a CI/CD pipeline to run `ng build` and deploy the Angular `dist` output to GitHub Pages.
- Localhost screenshots usually come from the user's manually running app and are part of their review workflow, not a request for Codex to start a server.
- For small UI or application changes, prefer targeted code inspection over unit test work.
