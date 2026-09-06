<h1 align="center">WLJS Notebook</h1>

<p align="center">
  <strong>An open-source, web-native notebook interface for Wolfram Language</strong>
</p>

<p align="center">
  Build interactive research notebooks, scientific tools, and presentations with typeset math, rich media, live controls, and JavaScript integration.
</p>

![WLJS Notebook preview](imgs/Toster.png)

<p align="center">
  <a href="https://wljs.io/blog"><strong>Explore projects</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://wljs.io/frontend/setup"><strong>Install WLJS</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://wljs.io/frontend/Overview"><strong>Documentation</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://wljs.io/frontend/Guides/Migration"><strong>Migrate from Mathematica</strong></a> &nbsp;&middot;&nbsp;
  <a href="#help-cover-wljs-project-costs"><strong>Support WLJS</strong></a>
</p>

![Wolfram Language](https://img.shields.io/badge/Wolfram%20Language-DD1100?style=for-the-badge&logo=wolfram&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![C](https://img.shields.io/badge/C-A8B9CC?style=for-the-badge&logo=c&logoColor=black)

[![DOI](https://zenodo.org/badge/588982265.svg)](https://doi.org/10.5281/zenodo.15538087)

WLJS Notebook is free and open-source software that runs with the [Wolfram Engine](https://www.wolfram.com/engine/) (freeware for personal use). You do not need Mathematica to use it.

> [!IMPORTANT]
> WLJS Notebook is not affiliated with, endorsed by, or sponsored by Wolfram Research.

## Why WLJS?

WLJS is designed for researchers, educators, and developers who value Wolfram Language but want a notebook workflow that is local, works with [freeware Wolfram Engine](https://www.wolfram.com/engine/), Git-friendly, lightweight, and easy to share.

- **Interactive by design** — Build responsive visualizations with `Manipulate`, events, graphics primitives, and targeted updates.
- **Made for research applications** — Combine computation, narrative, controls, and reusable interface components in one document.
- **Git-friendly notebooks** — Store notebooks in a minimal, human-readable format that people, version-control systems, and LLMs can inspect and diff.
- **Portable output** — Export notebooks as standalone or embeddable HTML or MDX while keeping supported plots and controls interactive.
- **Mathematica migration** — Open and convert `.nb` notebooks, with a migration guide for frontend and dynamic-interface differences.
- **JavaScript integration** — Use JavaScript cells and web libraries through a dedicated communication channel to the Wolfram kernel.
- **Desktop and web deployment** — Runs as a polished desktop application or remotely on a server through any modern web browser.
- **Local and offline** — Keep notebooks and computation on your machine without depending on a hosted service.
- **Agent-ready** — Inspect, edit, and evaluate notebook cells through the built-in CLI and Model Context Protocol server.

## Quick start

1. Install the recommended [Wolfram Engine 15.0](https://www.wolfram.com/engine/).
2. Download WLJS Notebook for your platform from the [installation page](https://wljs.io/frontend/setup) or [GitHub Releases](https://github.com/WLJSTeam/wljs-notebook/releases).
3. Open a notebook and evaluate your first expression:

```wl
Manipulate[
  Plot3D[Sin[n x] Cos[n y], {x, -1, 1}, {y, -1, 1}],
  {n, 1, 5, 0.3},
  ContinuousAction -> True
]
```

You can also deploy WLJS with Docker or run it on a remote server. See the complete [installation and server guide](https://wljs.io/frontend/setup).

## Interactive and expressive

WLJS combines a Mathematica-like editing experience with a flat notebook structure and browser-based rendering. It supports editable mathematical input, rich output, interactive 2D and 3D graphics, sound, images, Markdown, Mermaid diagrams, presentations, and custom web interfaces.

![Dynamic plots in WLJS](imgs/DynamicsFast-ezgif.com-optimize.gif)

WLJS and Mathematica use different frontend architectures. WLJS emphasizes explicit events, targeted updates, browser rendering, and control over how interactive interfaces behave.

| Aspect | Mathematica | WLJS |
| --- | --- | --- |
| Rendering model | Immediate mode | Retained mode with immediate-mode emulation |
| Reactive updates | Automatic dependency tracking and reevaluation | Explicit, targeted updates |
| Data binding | Two-way symbol binding | One-way symbol binding with input events |
| Reactive model | Pull | Push |

## Platforms

- **Windows:** x86-64 installer
- **GNU/Linux:** x86-64 and ARM64 packages in AppImage, DEB, and RPM formats where available
- **macOS:** Apple Silicon and Intel disk images
- **Server:** Docker container or direct launch with WolframScript

![WLJS across supported platforms](imgs/4OS.png)

Official desktop releases are digitally signed. See [Code signing](#code-signing) for details.

## Learn and build

- [Project showcases and tutorials](https://wljs.io/blog)
- [Documentation and tutorials](https://wljs.io/)
- [WLJS blog](https://wljs.io/blog)
- [Wolfram Language introduction](https://wljs.io/frontend/Wolfram-Language)
- [Migration guide from Mathematica](https://wljs.io/frontend/Guides/Migration)
- [Reference documentation](https://wljs.io/frontend/Reference/)

## Community

[GitHub Discussions](https://github.com/WLJSTeam/wljs-notebook/discussions) is the main place to ask questions, propose ideas, and show what you have built with WLJS.

- **Ask, propose, or showcase:** [GitHub Discussions](https://github.com/WLJSTeam/wljs-notebook/discussions)
- **Follow and share projects:** [r/wljs](https://www.reddit.com/r/wljs/)
- **Get real-time help:** [Telegram support chat](https://t.me/wljs_support)

If WLJS helped with your research, teaching, visualization, or application, please share a screenshot, notebook, repository, or short write-up. Community examples are one of the best ways to help new users understand what is possible.

## Contributing

Contributions do not need to start with a large code change. You can help by:

- Reporting a reproducible bug or suggesting an improvement in [Issues](https://github.com/WLJSTeam/wljs-notebook/issues)
- Answering a question or reviewing an idea in [Discussions](https://github.com/WLJSTeam/wljs-notebook/discussions)
- Improving documentation, examples, tests, or platform instructions
- Sharing a notebook, integration, research workflow, or application built with WLJS
- Submitting a focused pull request




## Help cover WLJS project costs

WLJS is an independent open-source project. Our first funding goal is **€300 per year** to help cover these approximate annual costs:

- **€100** — Apple Developer membership
- **€100** — Domain name
- A small budget for occasional CDN edge requests, cloud credits for testing, and coffee

**Five supporters giving €5 per month** would reach that goal before fees.

If WLJS helps with your research, teaching, or side projects, please consider supporting it.

**[Support monthly or give once](https://opencollective.com/wljs-notebook)** · [Other ways to donate](https://wljs.io/frontend/Support)

You can also help by:

- Starring this repository
- Sharing WLJS with a colleague, research group, or class
- Say a word on a conference
- Contributing an example, documentation improvement, bug report, or pull request

## Privacy and security

WLJS does not transfer information to networked systems unless requested by the person installing or operating it. See the [privacy and security policy](SECURITY.md) for details.



## Code signing

Official desktop releases published through GitHub Releases are signed where supported.

- **Windows:** Installers and executable binaries are signed by [SignPath.io](https://signpath.io/) with a certificate issued to SignPath Foundation.
- **macOS:** Application bundles and disk images are signed with the team's Apple Developer ID certificate (`com.coffeeliqueur.*`). Gatekeeper should display that Developer ID when opening the application.

Community and third-party builds are not covered by this signing policy.

## Project team

See the WLJS organization team for current [committers and reviewers](https://github.com/orgs/WLJSTeam/teams/committers-and-reviewers/).

## Inspired by

- [Mathics](https://github.com/Mathics3) — an open-source Wolfram Language ecosystem implemented in Python
- [Wolfram Language Notebook for VS Code](https://github.com/njpipeorgan/wolfram-language-notebook)

## License

WLJS Notebook, including its extensions, graphics and sound libraries, frontend, and backend, is licensed under the GNU Affero General Public License. See [LICENSE.md](LICENSE.md).

The algorithms, functions, and other components of Wolfram Language provided by the Wolfram Engine are the intellectual property of Wolfram Research, Inc. The Wolfram Engine is distributed separately under its own license.
