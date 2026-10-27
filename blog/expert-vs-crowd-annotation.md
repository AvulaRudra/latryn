# Expert or crowd? Measuring quality in human data collection

> When crowd labels are enough, when you need specialists, and how to measure annotation quality instead of assuming it.

Published 2026-10-24 by the Latryn Research Team. Canonical: https://latryn.com/blog/expert-vs-crowd-annotation.html

## Key takeaways

- For simple tasks, a few non-expert labels can match an expert: one classic study needed about four per item.
- For technical tasks, the judgement itself requires expertise, and aggregation cannot replace it.
- Measure agreement with chance-corrected statistics, not raw percent agreement.
- Vetting, calibration and senior review are what turn a group of annotators into a reliable data source.

Every AI data project eventually faces the same question: do we need experts, or will a larger crowd do? The honest answer depends on the task. The research gives a useful way to decide.

## When crowds work

In 2008, Snow, O'Connor, Jurafsky and Ng compared non-expert annotations from a crowdsourcing platform with expert labels across five language tasks: affect recognition, word similarity, recognising textual entailment, event temporal ordering and word sense disambiguation [[1]](#ref-1). They found that, on average, about four non-expert labels per item were needed to emulate expert-level label quality [[1]](#ref-1).

That result is still widely cited because it is so practical. For tasks where an average person can judge the answer, several cheap labels combined can rival one expert.

## When they do not

The finding has a boundary. Aggregating votes works when each voter can recognise a correct answer. It fails when the judgement itself needs expertise: whether a proof step is valid, whether a patch introduces a race condition, whether a dosage is safe. Ten people who cannot verify an answer do not become one person who can.

Modern AI training and evaluation tasks increasingly sit on the expert side of that line. When OpenAI re-annotated SWE-bench, it used 93 software developers experienced in Python, labelled each sample three times and kept the highest-severity label [[2]](#ref-2). The task needed engineers, and it needed redundancy among engineers.

## Measure agreement properly

Percent agreement looks reassuring but ignores chance. If 90% of items belong to one class, two careless annotators will agree most of the time. Artstein and Poesio's survey for computational linguistics explains chance-corrected coefficients such as kappa and alpha and when each is appropriate [[3]](#ref-3).

In practice we recommend:

- Overlap a fixed share of items across annotators throughout the project, not only at the start.
- Report a chance-corrected agreement statistic per task type.
- Investigate disagreements before resolving them. They often reveal unclear guidelines rather than careless work.
- Keep a calibration set with known answers and re-run it regularly to catch drift.

## A decision guide

| Task | Typical approach |
|---|---|
| Sentiment, simple classification | Trained generalists with redundant labels |
| Factual QA in general knowledge | Generalists plus expert spot checks |
| Code, maths, science reasoning | Domain experts, independent review |
| Safety and red teaming | Domain specialists matched to each harm area |
| Benchmark authoring | Experts who write, solve and verify every task |

## What vetting should look like

Expertise claimed on a CV is not expertise demonstrated. A useful admission process tests the actual work: solving representative tasks, judging flawed examples and explaining decisions. At Latryn every expert in the Lattice passes a two-part timed assessment, an automatically scored technical section and a scenario section reviewed by our team, before they work on client data.

Read more about [quality over quantity in training data](quality-over-quantity-training-data.html), or [join the Lattice](../index.html#lattice) if you are a specialist.

## References

1. Snow, R., O'Connor, B., Jurafsky, D., and Ng, A. Y. (2008). *Cheap and Fast, But is it Good? Evaluating Non-Expert Annotations for Natural Language Tasks.* EMNLP 2008. [ACL Anthology D08-1027](https://aclanthology.org/D08-1027/)
2. OpenAI (2024). *Introducing SWE-bench Verified.* [openai.com](https://openai.com/index/introducing-swe-bench-verified/)
3. Artstein, R., and Poesio, M. (2008). *Inter-Coder Agreement for Computational Linguistics.* Computational Linguistics 34(4). [ACL Anthology J08-4004](https://aclanthology.org/J08-4004/)
