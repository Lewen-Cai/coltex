---
# Adapted for ColTex from OpenAI's skill-creator (Apache-2.0, see LICENSE.txt and NOTICE).
name: skill-creator
description: Guide for writing effective skills for ColTex's AI agent. Use when the author wants to create a new skill, improve or rewrite an existing one, or turn a way of working from the conversation into a skill.
---

# Skill Creator

Skills are instructions the AI agent in a ColTex project loads for recurring tasks: a journal's house style, how this author wants an abstract tightened, the checks to run before submitting, how to translate their Chinese drafts into English. A skill turns the general-purpose agent into one that knows the author's own procedures and preferences.

## Core principles

### Concise is key

The context window is shared with the project, the conversation and every other skill's description. Assume the agent already knows LaTeX and academic writing well; only write down what it can't know: the author's preferences, a journal's rules, the order of steps, the mistakes to avoid. Challenge each sentence: does the agent really need this? Prefer one short example to a paragraph of explanation.

### Match the freedom to the task

- **High freedom** (plain guidance) when several approaches are fine and judgement matters: "Keep the author's voice; shorten rather than rewrite."
- **Low freedom** (exact steps, exact wording, a checklist) when the task is fragile or must be the same every time: a journal's required section order, a fixed acknowledgement text, the exact macro names.

### What a skill is in ColTex

```
skill-name/
├── SKILL.md            name + description (front matter) and the instructions
└── references/         optional text files, loaded only when needed
```

- **name**: lowercase letters, digits and hyphens, under 64 characters, short and verb-led (`polish-abstract`, `check-figure-refs`, `ieee-house-style`). `compact`, `new` and `chats` are taken.
- **description**: the only part the agent sees before it decides to use the skill. Say what the skill does and when to use it, with the words the author would actually use ("abstract", "摘要", "submission", "cover letter"). Put every "when to use" here, not in the body.
- **instructions**: imperative Markdown, written for another instance of the agent. Loaded when the skill is used.
- **reference files**: material that is only sometimes needed (a journal's full author guidelines, a glossary of the author's preferred terms, a sample of a well-written section, macro conventions). Keep them one level deep and say in the instructions when to read each one ("For the full list of banned phrases, read references/banned-phrases.md").

What the agent can do with a skill in a project: read and search the project's files, look up TeX Live packages, draft edits that the author reviews and applies, and run trial compiles. It cannot run scripts, use the internet, or open files outside the project and the skill. Don't write steps that depend on those; describe the check and let the agent do it by reading. Don't add README, changelog or other files about the skill itself.

## Process

1. **Understand it with concrete examples.** Ask what the author would say when they want it, what a good result looks like, and what goes wrong today. Ask one or two questions at a time, most important first. If they pasted a sample of their writing or a journal's rules, use them. Skip this only when it is already clear.
2. **Plan the contents.** For each example, ask what the agent would otherwise have to rediscover every time: the rules (into the instructions), long material (into reference files), the order of steps, the output format.
3. **Draft it** with propose_skill: name, description, instructions, and any reference files. Keep the instructions under about 500 lines; move details into reference files when they grow.
4. **Try it.** Offer to run the draft on a short sample the author pastes: follow the draft's instructions yourself and show the result, so they can see what it would do. Revise from what they say.
5. **Improve existing skills** the same way: read the skill first with read_skill, keep what works, and propose the new version under the same name; the author chooses whether it replaces the old one.

## Writing the instructions

- Use the imperative: "Count the words first", not "You should count the words".
- Start with the goal in one line, then the steps or rules, then the output format if it matters ("Reply with the revised abstract in a latex code block, then a list of what changed").
- Say what not to touch when it matters: citations, labels, numbers, the author's terminology.
- When the skill edits the project, say so ("Draft the changes as edits for the author to review"); when it only advises, say that.
- For examples of good and weak descriptions and instructions, read references/examples.md.
