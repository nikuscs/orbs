## Security Policy

- Please do not open public issues for security vulnerabilities.
- Report vulnerabilities privately through GitHub Security Advisories: this repository's **Security** tab, then **Report a vulnerability**.
- Alternatively, you can contact the maintainer via GitHub.

### Supported Versions

The latest commit on `main` receives security updates.

### Scope

Orbs is a self-hosted chat app: a web app on Cloudflare Workers or Bun, and a daemon that runs bot turns as your OS user. Issues with authentication, sessions, organization isolation, daemon API keys, socket authorization, file uploads, secret handling, or supply chain (dependencies/workflows) are in scope.

Bots running Pi's tools (read, bash, edit, write) unsandboxed in `ORBS_WORKDIR` is by design and documented in the README; a way for someone outside your organization to trigger them is in scope.
