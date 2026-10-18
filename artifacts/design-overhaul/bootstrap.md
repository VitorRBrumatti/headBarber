# Bootstrap — 2026-10-17

Find Skills was the first installation. Installed project-local with the official `npx skills add vercel-labs/skills --skill find-skills --agent codex --yes` command; read back SKILL.md and verified lock entry. Ponytail was already installed as the official Codex plugin, version 5.3.2, active at full level; read and reused, not reinstalled. New skills are available to subsequent turns; their files were read directly where applied in this turn.

Full metadata inventory: `installed-skills.json` records 253 discovered local/global/plugin SKILL.md files, physical paths, declared versions where present and SHA-256. This is an inventory, not a claim that all 253 were applied or audited for security. Project installation provenance and content hashes are in `/skills-lock.json`.

## Selected capabilities

| Name | Origin | Category | Version | State / purpose |
|---|---|---|---|---|
| find-skills | vercel-labs/skills | discovery | hash in lock | installed first; source discovery |
| ponytail | DietrichGebert/ponytail | implementation | 5.3.2 | existing official plugin; scope and reuse |
| frontend-design | anthropics/skills | design | hash in lock | installed; reference-driven composition |
| impeccable | pbakaus/impeccable | design/audit | 4.3.1 | existing global; context, craft, detector run |
| make-interfaces-feel-better | jakubkrehel/make-interfaces-feel-better | refinement | hash in lock | installed; available, not applied yet |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | UI | hash in lock | installed; available, not applied yet |
| copywriting | coreyhaines31/marketingskills | content | hash in lock | installed; existing truthful copy takes priority |
| gsap-core, frameworks, performance, plugins, react, scrolltrigger, timeline, utils | greensock/gsap-skills | motion | hashes in lock | eight official skills installed; core/performance consulted |
| motion-design | LottieFiles/motion-design-skill | motion | 1.0.0 | installed; timing/choreography used in visual spec |
| fixing-accessibility | ibelick/ui-skills | accessibility | hash in lock | installed; labels, focus and motion review |
| web-perf | cloudflare/skills | performance | hash in lock | installed; no Lighthouse score claimed |
| web-design-guidelines | vercel-labs/agent-skills | UI audit | 1.0.0 | installed; current upstream guidelines consulted |
| vercel-react-best-practices | vercel-labs/agent-skills | React | 1.0.0 | installed; actual official skill name, minimal client state |
| playwright-cli | microsoft/playwright-cli | browser QA | runtime-managed | official CLI verified through npx; installed with `install --skills=agents`; no global installation |
| playwright-skill | local global skill, community | browser QA | undeclared | existing; browser/server detection guidance |
| imagegen | OpenAI bundled | image generation | runtime-managed | tool callable; not invoked; no generation needed |
| product-design:image-to-code | OpenAI curated plugin | design-to-code | package 0.1.56 | existing; visual reference/QA guidance consulted |
| supabase | supabase/agent-skills | local test infrastructure | 0.1.2 | existing; consulted for local CLI only; no backend edits |

## Requests covered by equivalents or deferred

| Request | Verified source / disposition |
|---|---|
| design-tokens | Search surfaced Impeccable extract and Tailwind design systems. Use existing Impeccable + scoped CSS; no extra generic design-system package. |
| interfaces-that-feel | Search found owl-listener/designer-skills. Equivalent coverage from installed make-interfaces-feel-better; no redundant installation. |
| animate, css-animation | Existing Impeccable animate + official GSAP/LottieFiles guidance; CSS used for this limited motion sequence. |
| Motion for React | Official motion.dev confirms `npm install motion` and `npx motion-ai`; verified, not installed because no runtime need. |
| Anime.js, React Spring | Official docs consulted; libraries are not skills. Not added to production. |
| claude-design-auditor | Search found ashutos1997/claude-design-auditor-skill, approximately 304 installs at lookup. Replaced by existing Impeccable + official Vercel guidelines and actual screenshots. |
| browser-testing | Official Playwright CLI and existing Playwright test dependency. |
| SVG Design | Existing lucide-react and official PNG brand marks. Do not redraw logos. No specific trustworthy exact-name SVG skill established by search. |
| Image Optimization | Existing Next Image and installed Sharp; real screenshots exported to WebP. |
| Asset Generation | OpenAI image tool exists; no new generated assets required. Costs, quota and external provider credentials were not queried or assumed. |
| Screenshot-to-Code / Design-to-Code | Existing curated image-to-code skill; source rebuilt as React and CSS, never a full reference image background. |
| Visual Regression Testing | Existing Playwright plus saved screenshots; no invented fidelity percentage. |
| image-generation-enhanced | Referenced skillatlas source inspected through browser. Native imagegen is the compatible alternative; installing instructions would not grant generator access. |

Impeccable official installation documentation was checked; existing working 4.3.1 runtime was retained rather than running `npx impeccable install` again. Playwright official README lists global installation as an option, but local npx and installed @playwright/test were sufficient. Its actual CLI help confirmed `--skills` accepts `agents`.

## Sources

- https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md
- https://github.com/DietrichGebert/ponytail
- https://github.com/greensock/gsap-skills
- https://github.com/LottieFiles/motion-design-skill
- https://github.com/vercel-labs/agent-skills
- https://github.com/microsoft/playwright-cli
- https://github.com/pbakaus/impeccable
- https://motion.dev/docs/quick-start
- https://animejs.com/documentation/getting-started/installation/
- https://react-spring.dev/docs/getting-started
- https://github.com/skillatlas/skills/blob/main/skills/image-generation-enhanced/SKILL.md

No package.json or dependency lockfile changes. No production libraries added. `.gitignore` gained `.playwright-cli/` through official CLI setup. Next dev automatically appended its installed-version instructions to AGENTS.md; this is tooling-generated, not a change to the user's scope rules.
