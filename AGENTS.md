   # AGENTS.md — Universal Agent Operating Manual

   > Shared operating manual for **all** AI coding agents in this repository.
   > Read this file in full before touching any file. If sections are marked
   > `[TODO: populated by agent]`, complete them first via deep codebase research.

   ---

   ## 1. Core Philosophy

   Three non-negotiable principles govern every action you take:

   | # | Principle | What it means in practice |
   |---|-----------|---------------------------|
   | 1 | **Respect Architecture** | Follow existing patterns, layers, and module boundaries. No new paradigms without asking. |
   | 2 | **Explore Before Acting** | Read, trace, and map before you edit or create. Never blind-edit. |
   | 3 | **Stay DRY** | Reuse before you write. Extract before you duplicate. |

   You are a guest in an existing codebase. Your job is to make changes that look like they were made by the project's own authors — not to impose your own taste or rewrite what already works.

   ---

   ## 2. Hard Rules (Violation = Failure)

   - **Do not** create a new file if an existing one can absorb the change.
   - **Do not** add a dependency without explicit user approval.
   - **Do not** rename, move, or restructure files without confirming the impact radius.
   - **Do not** leave dead code, commented-out blocks, or TODO stubs.
   - **Do not** bypass existing abstractions to "just get it working."
   - **Do not** introduce new architectural patterns, state management solutions, or styling approaches without approval.
   - **Always** run the relevant lint/test/typecheck command after every change.
   - **Always** prefer editing in place over rewriting a file from scratch.
   - **Always** match the code style of the immediate surrounding lines — indentation, quotes, import order, naming conventions.

   ---

   ## 3. Explore-First Workflow

   ### 3.1 Before editing any file

   1. Read the **entire** file — not just the lines near your target.
   2. Trace every caller of the function/symbol you intend to change (use `grep`/`rg`/`ast-grep`).
   3. Trace what the changed code calls (callees) and what contracts they expect.
   4. Read at least 3–5 adjacent or related files to understand surrounding context.
   5. Check for existing tests that cover the area you're touching.
   6. Estimate the **impact radius**: more callers + fewer tests = more caution required.

   ### 3.2 Before creating any file

   1. Search the repo for a file/module that already does (or nearly does) this job.
   2. If something exists but is incomplete, **extend it** instead of forking it.
   3. Verify the directory you're adding to is the correct home per project structure.
   4. Match the naming, extension, and export style of siblings in that directory.
   5. Add the new file to any index/barrel file the convention requires.

   ---

   ## 4. DRY Discipline

   - Before writing a helper, search for an existing one in `utils/`, `lib/`, `common/`, `shared/`, or `hooks/`.
   - If you copy more than ~5 lines from another file, that is a duplication signal — extract it.
   - When you notice existing duplication, either remove it in the same change or flag it to the user.
   - Prefer composing small, well-named functions over one large function that does many things.
   - Ask before creating: Can I parameterize an existing function instead of creating a new one? Can I compose existing pieces?

   ---

   ## 5. Frontend Design Rules (Framework-Agnostic)

   These rules apply regardless of whether the project uses React, Vue, Svelte, Solid, or vanilla JS.

   ### 5.1 Component Composition

   - Favor small, single-responsibility components. A component that does more than one thing should be split.
   - Compose via children/slots, not inheritance or wrapping.
   - Separate data-fetching logic from presentation. Keep presentational components pure.
   - Name components for what they render, not where they appear.

   ### 5.2 Styling Discipline

   - Follow the project's existing CSS approach exactly — do not mix paradigms.
   - Use design tokens (spacing, color, typography, shadows) from the theme system; never hardcode raw values.
   - Avoid !important. If you need it, refactor the specificity chain instead.
   - Keep styles co-located with their component unless the project explicitly separates them.

   ### 5.3 Accessibility

   - Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<header>`, etc.) before reaching for ARIA.
   - ARIA attributes are for augmenting native semantics, not replacing them.
   - Every interactive element must be keyboard-navigable and have a visible focus indicator.
   - Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text).
   - Images must have descriptive `alt` text. Decorative images should use `alt=""`.

   ### 5.4 Responsive Design

   - Build mobile-first: start with the narrowest layout, then add breakpoints upward.
   - Test layouts at minimum 3 breakpoints. Do not hardcode specific device widths.
   - Use CSS Grid and Flexbox for layout. Avoid fixed-width containers.
   - Ensure touch targets are at least 44×44px on interactive elements.

   ### 5.5 State Management

   - State hierarchy: local state → lifted state → context/zustand → external store.
   - Do not prop-drill beyond 3 levels without introducing context or composition.
   - Derive computed values from source state; do not keep redundant state.
   - Side effects (fetching, subscriptions, localStorage) belong in dedicated lifecycle hooks/effects, not inline in render logic.

   ### 5.6 Error / Empty / Loading States

   - Every data-fetching component must explicitly handle all three states.
   - Never leave the user on a blank screen or a perpetual spinner.
   - Error states should offer a recovery action (e.g., "Retry" button).
   - Empty states should explain what would normally appear and guide the user toward populating it.

   ### 5.7 Performance Awareness

   - Memoize expensive computations (derived data, large list filters) but not trivial ones.
   - Lazy-load routes and heavy components below the fold.
   - Avoid unnecessary re-renders: understand your framework's reactivity model before optimizing.
   - Profile before optimizing. Do not add caching or memoization without evidence of a bottleneck.

   ---

   ## 6. File Creation Guidelines

   1. **Never create a new file without first searching** for an existing one that could serve the same purpose.
   2. When a new file is truly needed:
      - Place it in the correct directory per the established structure.
      - Use the same boilerplate, import style, and export pattern as sibling files.
      - Immediately add an export to the nearest barrel file if the project uses one.
      - Write a minimal test skeleton in the matching test directory.
   3. Every new file must include a brief header comment explaining its role and relationship to the rest of the system (if the project uses header comments).

   ---

   ## 7. Verification Checklist

   Before finishing any task, confirm each point:

   - [ ] I searched the codebase for existing solutions before creating anything new.
   - [ ] I read files adjacent to my changes and understood the surrounding context.
   - [ ] I followed existing patterns, naming conventions, and architectural boundaries.
   - [ ] I did not introduce unnecessary duplication or dependencies.
   - [ ] I handled error / empty / loading states for every new data-fetching component.
   - [ ] I verified the build, typecheck, and linter pass.
   - [ ] I ran existing tests and they pass. I added tests for new behavior where appropriate.
   - [ ] I did not leave dead code, commented-out blocks, or TODO stubs.

   ---

   ## 8. Communication Style

   - Be concise. Focus on the "what" and "why" of your changes.
   - Cite exact file paths and line numbers when explaining a decision.
   - When uncertain, state your assumptions explicitly and ask a specific question.
   - If a request conflicts with existing architecture or DRY principles, push back respectfully and explain the conflict.
   - Propose alternatives when you cannot follow a request as stated.
   - After making changes, summarize: what files were touched, what was added/modified/removed, and why.

   ---

   ## 9. Stack & Project Setup

   > **⚠️ AGENT DIRECTIVE — On first interaction with this codebase, perform a deep research pass before accepting any task.**
   >
   > Scan the repository and populate every TODO section below. Do not ask the user to fill these in — discover them from the code.

   ### 9.1 Project Structure

   `[TODO: populated by agent]` — Describe the top-level directories and the responsibility of each.

   ### 9.2 Commands

   `[TODO: populated by agent]` — Exact commands for common actions.

   | Action | Command |
   |--------|---------|
   | Install | `[TODO]` |
   | Dev server | `[TODO]` |
   | Build | `[TODO]` |
   | Test | `[TODO]` |
   | Test (single file) | `[TODO]` |
   | Lint | `[TODO]` |
   | Typecheck | `[TODO]` |
   | Format | `[TODO]` |

   ### 9.3 Architecture & Patterns

   `[TODO: populated by agent]` — Describe the architectural style (layered, feature-based, hexagonal, MVC), module boundaries, data flow, state management approach, error-handling conventions, authentication/authorization patterns, and any key abstractions new code must integrate with.

   ### 9.4 Code Style

   `[TODO: populated by agent]` — Append project-specific style rules enforced by linters/formatters (eslint, prettier, etc.). Include naming conventions, import ordering rules, and any project-specific dos and don'ts.

   ### 9.5 Testing

   `[TODO: populated by agent]` — Where tests live, how to run a single test, naming/structure conventions for tests, and coverage expectations.
