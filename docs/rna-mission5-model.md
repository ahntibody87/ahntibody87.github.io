# Mission 5: classroom RNA structure model

- Repository: https://github.com/ahntibody87/ahntibody87.github.io
- Production: https://ahntibody87.github.io/advanced-life-science/gene-expression/rna-lab/#m=scissors
- Deployment: existing GitHub Pages, main / root. No database or Vercel project.

## Model and scope

The target is a fictional 8-base classroom sequence, not a coronavirus genomic sequence. The scenario image depicts a virtual laboratory and a coronavirus model. No biological sample, natural catalytic motif, wet-lab protocol, or organism-specific target is used.

RibossFold recalculates all 44 bases of a joined single-chain teaching model after every edit. The target/design boundary is visibly marked as a virtual connection. This is not a thermodynamic two-strand cofold prediction. Four three-pair stems, two 2+2 internal loops, and four-base terminal loops form the goal. Grading checks the complete topology and target placement; it does not infer catalytic activity. Docking and cleavage are conceptual animations shown only after structural success.

The existing MoleculeView provides ribose/phosphate chemistry, base ring shapes and colors, hydrogen bonds, retained nodes, transitions, selection, zoom and reduced-motion handling. Optional geometry, highlighted target positions and broken bonds support the completion animation without changing other missions.

Version 2 drafts and links are isolated from the old target-selector exercise. Switching labs cancels reaction timers; edits invalidate old predictions and success state. Retry restarts the folding worker after errors/timeouts.

## Verification

- node scripts/build.mjs
- node scripts/check.mjs
- node scripts/check-rna-grading.mjs
- node scripts/check-rna-view.mjs
- node scripts/check-rna-scissors.mjs

The scissors test exercises the actual folding engine, a fictional solvable fixture, 13 different mutation-induced structures, target preservation, stale prediction rejection, loop topology, and product separation geometry. Browser QA covers success, automatic cleavage, failed edits, undo, reset, view switching, lab switching, persistence and sharing.

## Image provenance

classroom-lab.png was generated with the built-in image generation tool on 2026-10-14. Prompt: a bright modern biology teaching laboratory with microscope and laptop, a large scientifically inspired coronavirus educational hologram, soft sage/slate/cream palette, calm textbook/3D style, no people, text, sequences or experimental procedure; wide classroom banner. The complete prompt and generation trace remain in the creating chat. No third-party image license dependency.
