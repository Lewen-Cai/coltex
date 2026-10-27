# Templates

## New projects from templates

**New project** shows one list: the built-in templates and the templates shared with you. A tag on each says where it comes from:

- **Built-in**: comes with ColTex.
- **Shared by the system administrator**: for everyone on this server.
- **Shared across** a group's name: shared with a group you are in.
- **Shared by** a name: shared with you in person.

The buttons above the list (**All**, then the fields) show the templates of one field. You see only the templates shared with you. See also [Getting started](#/help/getting-started).

## Publishing a project as a template

Administrators can publish a project they own as a template, a group's thesis format, say:

1. In the project's menu (⋯) in the project list, or in the project settings, choose **Publish as template…**.
2. Give it a name, a description and a **Field** (where it is listed), choose who gets it under **Shared with**, and click **Publish**.

Who it can be for:

- An admin: the groups they are in, and people they pick by name or email.
- The system administrator: also **Everyone on this server**.
- Members can't publish templates; ask an administrator.

Good to know:

- New projects from it get the project's files as they are **at that moment**, its compiler and its spell-check language; not its members, history or comments.
- The template follows the project: change the project, and later new projects get the changes.
- Open **Publish as template…** again to change its name, field or who it is for, or to **Unpublish** it. The system administrator can also remove any template in the new-project dialog.
- It goes away when the project is deleted.

## Importing a journal's template

Many journals and conferences publish LaTeX templates that aren't built into ColTex: their licences don't allow passing them on, or they aren't part of TeX Live. Among them are NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Download the official template from the conference's or the publisher's website, then import it as a template:

1. Click **New project**, then **Import template** (administrators only).
2. Choose the zip, give it a name, a description and a **Field**, choose who gets it under **Shared with**, and click **Import**.

Good to know:

- Who it can be for follows the rules for publishing (above): admins share with their groups and with people they pick, the system administrator also with everyone.
- The zip becomes a project of yours, published as a template. Its main document is found as when importing a project; build files and system clutter are left out.
- The template's ⋯ menu has **Open project** (to change its files), **Edit template…** (to rename it, change who it is for, or unpublish it) and **Remove template**.

## Converting to a journal template

**Convert to template…** in a project's menu (in the project settings: "Convert to a journal template") rewrites a paper for another journal or conference: IEEE Transactions, IEEE Conference, ACM Conference, ACM Journal, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS or a plain article. Every built-in template can be converted to each of these.

Under **Templates** the paper goes into any template instead: one from the template list, one of your projects (**One of my projects**), or the zip a journal offers for download (**Upload a template (.zip)**). The paper's title, authors, affiliations, abstract and keywords are written where the template has its sample ones, in the template's own way, and the sample text after them is replaced by your paper. The template's class and style files come along, and its sample main file stays in the project for reference.

- The title, authors, affiliations, abstract, packages and bibliography are rebuilt in a **new project**, which is then compiled. The original stays as it is.
- Papers written in Springer Nature's `sn-jnl` template are read too, as are BMC, OUP and Elsevier CAS ones: authors with first names and surnames, affiliations, `\abstract{}` and structured abstracts, keywords and the back matter.
- A report lists what was changed and what to check. If the build has errors or the report has warnings, **Open and fix with AI** opens the new project with the AI agent following the built-in **template-conversion** Skill: it first asks which journal or conference you're submitting to, looks up its current author guidelines, makes the paper build, and brings it in line with the guidelines without changing what it says. Its changes wait for your review.
