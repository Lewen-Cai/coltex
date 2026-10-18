// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/ide/human-readable-logs/HumanReadableLogsHints.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.
// ColTex: hints are plain text instead of JSX, so the compiler worker can
// attach them to diagnostics and the AI assistant can read them.

import { packageSuggestionsForCommands, packageSuggestionsForEnvironments } from './package-suggestions.ts'

type LogHint = {
  extraInfoURL?: string
  text: (details?: string[]) => string
}

const hints: { [ruleId: string]: LogHint } = {
  hint_misplaced_alignment_tab_character: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Misplaced_alignment_tab_character_%26",
    text: () =>
      "You have placed an alignment tab character '&' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand '&' in text, you must write \\& instead.",
  },
  hint_extra_alignment_tab_has_been_changed: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Extra_alignment_tab_has_been_changed_to_%5Ccr",
    text: () =>
      "You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.",
  },
  hint_display_math_should_end_with: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Display_math_should_end_with_$$",
    text: () =>
      "You have forgotten a $ sign at the end of 'display math' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.",
  },
  hint_missing_inserted: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Missing_$_inserted",
    text: () =>
      "You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).",
  },
  hint_reference_undefined: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/There_were_undefined_references",
    text: () =>
      "You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.",
  },
  hint_there_were_undefined_references: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/There_were_undefined_references",
    text: () =>
      "You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.",
  },
  hint_citation_on_page_undefined_on_input_line: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Citation_XXX_on_page_XXX_undefined_on_input_line_XXX",
    text: () =>
      "You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.",
  },
  hint_label_multiply_defined_labels: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/There_were_multiply-defined_labels",
    text: () =>
      "You have used the same label more than once. Check that each \\label{...} labels only one item.",
  },
  hint_float_specifier_changed: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/%60!h%27_float_specifier_changed_to_%60!ht%27",
    text: () =>
      "The float specifier 'h' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using 'ht', or even 'htbp' if necessary. If you want to try keep the float here anyway, check out the float package.",
  },
  hint_no_positions_in_optional_float_specifier: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/No_positions_in_optional_float_specifier",
    text: () =>
      "You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.",
  },
  hint_undefined_control_sequence: {
    extraInfoURL: 'https://www.overleaf.com/learn/Errors/Undefined_control_sequence',
    text: details => {
      if (details?.length) {
        const command = details[0]!
        const suggestion = packageSuggestionsForCommands.get(command)
        if (suggestion) {
          return `We think you’ve got a missing package! The ${command} command won't work unless you include ${suggestion.command} in your document preamble.`
        }
      }
      return 'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.'
    },
  },
  hint_undefined_environment: {
    extraInfoURL: 'https://www.overleaf.com/learn/Errors%2FLaTeX%20Error%3A%20Environment%20XXX%20undefined',
    text: details => {
      if (details?.length) {
        const environment = details[0]!
        const suggestion = packageSuggestionsForEnvironments.get(environment)
        if (suggestion) {
          return `We think you’ve got a missing package! The ${environment} environment won't work unless you include ${suggestion.command} in your document preamble.`
        }
      }
      return 'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.'
    },
  },
  hint_file_not_found: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/File_XXX_not_found_on_input_line_XXX",
    text: () =>
      "The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.",
  },
  hint_unknown_graphics_extension: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_Unknown_graphics_extension:_.XXX",
    text: () =>
      "The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.",
  },
  hint_unknown_float_option_h: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_Unknown_float_option_%60H%27",
    text: () =>
      "The compiler isn't recognizing the float option 'H'. Include \\usepackage{float} in your preamble to fix this.",
  },
  hint_unknown_float_option_q: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_Unknown_float_option_%60q%27",
    text: () =>
      "You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.",
  },
  hint_math_allowed_only_in_math_mode: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_%5Cmathrm_allowed_only_in_math_mode",
    text: () =>
      "You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.",
  },
  hint_mismatched_environment: {
    text: () =>
      "You have used \\begin{...} without a corresponding \\end{...}.",
  },
  hint_mismatched_brackets: {
    text: () =>
      "You have used an open bracket without a corresponding close bracket.",
  },
  hint_can_be_used_only_in_preamble: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_Can_be_used_only_in_preamble",
    text: () =>
      "You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.",
  },
  hint_missing_right_inserted: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Missing_%5Cright_insertede",
    text: () =>
      "You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.",
  },
  hint_double_superscript: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Double_superscript",
    text: () =>
      "You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.",
  },
  hint_double_subscript: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Double_subscript",
    text: () =>
      "You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.",
  },
  hint_no_author_given: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/No_%5Cauthor_given",
    text: () =>
      "You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.",
  },
  hint_somethings_wrong_perhaps_a_missing_item: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_Something%27s_wrong--perhaps_a_missing_%5Citem",
    text: () =>
      "There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.",
  },
  hint_misplaced_noalign: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Misplaced_%5Cnoalign",
    text: () =>
      "You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.",
  },
  hint_no_line_here_to_end: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_There%27s_no_line_here_to_end",
    text: () =>
      "You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.",
  },
  hint_verb_ended_by_end_of_line: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/LaTeX_Error:_%5Cverb_ended_by_end_of_line",
    text: () =>
      "You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.",
  },
  hint_illegal_unit_of_measure_pt_inserted: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors%2FIllegal%20unit%20of%20measure%20(pt%20inserted)",
    text: () =>
      "You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.",
  },
  hint_extra_right: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors/Extra_%5Cright",
    text: () =>
      "You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.",
  },
  hint_missing_begin_document: {
    extraInfoURL: "https://www.overleaf.com/learn/Errors%2FLaTeX%20Error%3A%20Missing%20%5Cbegin%20document",
    text: () =>
      "No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.",
  },
  hint_mismatched_environment2: {
    text: () =>
      "You have used \\begin{} without a corresponding \\end{}.",
  },
  hint_mismatched_environment3: {
    text: () =>
      "You have used \\begin{} without a corresponding \\end{}.",
  },
  hint_mismatched_environment4: {
    text: () =>
      "You have used \\begin{} without a corresponding \\end{}.",
  },
}

export default hints
