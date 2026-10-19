# Examples

## Descriptions

Weak: `Helps with abstracts.`
(Too vague: the agent can't tell when to use it, and "helps" says nothing about what it does.)

Good: `Tighten a paper's abstract to the venue's word limit while keeping every claim and number. Use when the author asks to shorten, polish or check the abstract (摘要), or before submission.`

Weak: `IEEE stuff.`

Good: `House style for IEEE Transactions papers: section order, figure and table captions, reference style, and words to avoid. Use when writing or revising any part of an IEEE paper, or when the author asks whether the paper follows IEEE style.`

## Instructions

A short, complete skill body (`polish-abstract`):

```markdown
Tighten the abstract without changing what it claims.

1. Find the abstract (the abstract environment, or \abstract{...}) and count its words.
2. Ask for the word limit if the author hasn't given one and the class doesn't imply it (IEEE: 250, Elsevier: usually 250, ACM: 150–250).
3. Shorten: cut filler ("in this paper we", "it is worth noting that"), merge sentences that repeat the motivation, keep every number, dataset, method name and citation.
4. Keep the author's terminology and spelling variety (British or American).
5. Draft the change as an edit to the abstract, then reply with the old and new word counts and one line on what was cut.
```

A skill with a reference file (`thesis-terms`):

```markdown
Keep terminology consistent across the thesis.

- Before editing any chapter, read references/glossary.md: it lists the preferred term for each concept and the variants to replace.
- Replace variants only in prose, never inside \label, \ref, \cite, maths or code listings.
- Report each replacement as "chapter file: variant → preferred term (n times)".
```

## Common mistakes

- "When to use" sections in the body. The body is read only after the skill was chosen; that information belongs in the description.
- Explaining LaTeX the agent already knows ("\section creates a section").
- Steps that need a script or the internet ("run checkrefs.py", "fetch the journal's template"). Describe the check instead.
- One skill for unrelated jobs. Split it: each skill should have one clear trigger.
