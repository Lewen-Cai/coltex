% A small journal class for ColTex's tests of converting into a template the
% author brings: it writes its front matter the way Springer Nature's sn-jnl
% does (\author*[1]{\fnm{..} \sur{..}}, \affil*[1]{\orgname{..}}, \abstract{..})
% and is in no table of the converter.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{byot-journal}[2026/10/27 Test journal class]
\DeclareOption*{}
\ProcessOptions\relax
\LoadClass{article}
\RequirePackage{natbib}
\RequirePackage{graphicx}
\RequirePackage{amsmath}
\newcommand\fnm[1]{#1}
\newcommand\sur[1]{#1}
\newcommand\orgdiv[1]{#1}
\newcommand\orgname[1]{#1}
\newcommand\orgaddress[1]{#1}
\newcommand\city[1]{#1}
\newcommand\country[1]{#1}
\let\@authorlist\@empty
\let\@affillist\@empty
\let\@keywords\@empty
\let\@abstract\@empty
\renewcommand\title[2][]{\gdef\@title{#2}}
\def\author{\@ifstar{\@bauthor}{\@bauthor}}
\newcommand\@bauthor[2][]{\g@addto@macro\@authorlist{\par #2\textsuperscript{#1}}}
\def\affil{\@ifstar{\@baffil}{\@baffil}}
\newcommand\@baffil[2][]{\g@addto@macro\@affillist{\par\textsuperscript{#1}#2}}
\newcommand\email[1]{\g@addto@macro\@authorlist{ (\texttt{#1})}}
\newcommand\equalcont[1]{}
\def\abstract#1{\gdef\@abstract{#1}}
\newcommand\keywords[1]{\gdef\@keywords{#1}}
\renewcommand\maketitle{%
  {\centering{\LARGE\@title\par}\medskip\@authorlist\par\medskip{\small\@affillist\par}}%
  \section*{Abstract}\@abstract\par
  \ifx\@keywords\@empty\else\noindent\textbf{Keywords:} \@keywords\par\fi}
\newcommand\bmhead[1]{\paragraph*{#1}}
\newcommand\backmatter{}
\bibliographystyle{unsrtnat}
