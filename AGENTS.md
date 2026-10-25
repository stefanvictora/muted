# Documentation

Use plain technical English for the README and maintained documentation. Take guidance
from ASD-STE100 principles; formal compliance, a controlled vocabulary, and fixed word
limits are not required. Keep the prose natural.

- Include a statement only when it answers a concrete reader question. Describe behavior,
  requirements, or limitations. Omit slogans, sales language, and obvious repository facts.
- Prefer short, direct sentences and active verbs. Keep related ideas together when that
  makes the explanation easier to read.
- Use the same term for the same concept. Match visible UI labels exactly; distinguish
  website rules from browser permissions.
- Write procedures as numbered steps with one main action per step. State a condition
  before the action it controls and explain results when they are not obvious.
- Make important effects explicit: what changes, what remains saved, and what the user
  must do next. Preserve technical qualifications when simplifying a sentence.
- Use examples to clarify behavior, rather than to promote benefits. Avoid unsupported
  claims about focus, performance, privacy, or security.
- Keep the README as a concise introduction and starting point. Put detailed usage in
  `docs/INSTALLATION.md`, permissions in `docs/SECURITY.md`, and contributor guidance in
  `docs/DEVELOPMENT.md`. Link to those details instead of repeating them.

Before finishing a documentation edit, remove redundant statements and check that the
changed instructions, UI labels, and local links are accurate. Retain clear existing
wording when a rewrite adds no useful information.
