---
name: Design subagent escaped backtick bug
description: Design subagent writes {\` and \${ in JSX template literals; requires binary replace to fix
---

## Rule
When design subagent writes TSX files, it often escapes backticks as `{\`` instead of `{`` and `\${` instead of `${`. This causes esbuild to fail with "Syntax error \`".

**Why:** The subagent serializes backticks as escape sequences in its output.

**How to apply:** Use `.local/fix_backticks.py` (already exists) or write a new Python script using `content.replace(b'\\`{', b'{`')` etc. with binary mode to avoid shell escaping issues. Never try to fix with sed or bash due to backtick/dollar-brace conflicts.
