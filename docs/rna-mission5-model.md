# RNA mission 5 — separate target and editable scissors RNA (v3)

Repository: https://github.com/ahntibody87/ahntibody87.github.io
Production: https://ahntibody87.github.io/advanced-life-science/gene-expression/rna-lab/#m=scissors
Deployment: GitHub Pages, main / root. No DB or Vercel project.

The primary textarea is always visible. It accepts 8–80 bases, automatically applies valid input after 500 ms, and stays synchronized with nucleotide selection/editing, undo and reset. Default scissors RNA is 38 bases. RibossFold predicts only this independent RNA, never a concatenation with the target.

The complete fictional target is 18 bases: 4 flanking + 4 left binding + 2 central + 4 right binding + 4 flanking. The target is separate and never editable. First four scissors bases recognize the target right site antiparallel; last four recognize the left site. Both sites require four Watson–Crick pairs. The scissors fold must expose these ends and contain four two-pair segments, two 1+1 internal loops and two four-base terminal loops. Exterior spacers can vary; the exact starting sequence and length are not required for success.

Success plays four stages: approach, eight intermolecular pairs, meeting of the internal loops, and cleavage of the target into two nine-base products. The target and scissors never share a covalent backbone. The binding and cleavage scene is an educational animation, not a two-strand thermodynamic or catalytic prediction. No real viral sequence or catalytic motif is used.

MoleculeView preserves the existing sugar/phosphate/base-ring graphics and transitions. Version 3 storage/links keep the prior exercise's drafts separate.

Verification: build.mjs, check.mjs, check-rna-scissors.mjs and check-rna-view.mjs. Actual engine fixture plus independent-fold, variable length, complement orientation, eight intermolecular bonds and cleavage boundaries are tested. Browser verification covers direct input, automatic folding, success animation and variable length.

Image classroom-lab.png is the previously generated virtual laboratory / coronavirus illustration, unchanged.
