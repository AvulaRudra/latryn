---
title: Quality over quantity in fine-tuning data
dek: The research case for smaller, cleaner, expert-written datasets, and a practical checklist for getting there.
category: Training data
read: 7 min
keywords: fine-tuning data quality, SFT data, data deduplication, LIMA, curated datasets, training data collection
takeaways:
- LIMA fine-tuned a 65B model on only 1,000 curated examples and was judged equivalent or better than GPT-4 in 43% of comparisons.
- Duplicated data harms models: deduplicated training data cut memorised output by about ten times.
- Carefully constructed, textbook-quality data can let small models compete above their size.
- The bottleneck is not collecting more examples. It is writing, checking and pruning better ones.
---

It is tempting to treat training data as a volume problem: more examples, more coverage, better model. For supervised fine-tuning in particular, the evidence points the other way. A small set of excellent examples often beats a large set of average ones.

## The LIMA result

In 2023, Zhou and colleagues fine-tuned a 65B parameter LLaMa model on only 1,000 carefully curated prompts and responses, with no reinforcement learning or human preference modelling [[1]](#ref-1). In a human study, its responses were either equivalent or strictly preferred to GPT-4 in 43% of cases [[1]](#ref-1).

The authors' interpretation, sometimes called the superficial alignment hypothesis, is that most knowledge is learned in pre-training and fine-tuning mainly teaches format and style. Whether or not that holds in every domain, the practical point stands: a thousand examples written with care can move a model a long way.

## Duplicates are not free

Large datasets hide repetition. Lee and colleagues found a single 61-word English sentence repeated more than 60,000 times in the C4 dataset [[2]](#ref-2). Training on deduplicated data meant models emitted memorised text about ten times less often [[2]](#ref-2). Repetition wastes compute, skews what the model treats as typical, and raises the chance of verbatim regurgitation.

## Textbook-quality data

Gunasekar and colleagues pushed the quality argument further with a code model trained largely on carefully constructed, "textbook quality" data, showing strong results from a model far smaller than its competitors [[3]](#ref-3). The design choice that mattered was not the amount of data but how instructive each example was.

## A practical checklist for SFT data

When we write or audit supervised fine-tuning sets, each example has to pass these checks:

1. **Correct.** A second expert can verify the answer, and code runs.
2. **Complete.** It answers the whole prompt, including the part that is easy to skip.
3. **Instructive.** Reasoning is shown where the task needs it, not padded where it does not.
4. **Consistent.** Style, format and refusals follow one written guideline.
5. **Unique.** Near-duplicates are removed with exact and fuzzy matching.
6. **Traceable.** Every example records its author, reviewer and revision history.

## What to measure instead of row count

| Instead of | Track |
|---|---|
| Number of examples | Share of examples that pass expert review first time |
| Hours logged | Defects found per hundred items at review |
| Coverage claims | Coverage against a written capability map |
| One-off QA | Agreement on a recurring calibration set |

## The takeaway

The cheapest way to improve a fine-tuned model is often to delete a third of its training data and rewrite another third. That work needs people who know the domain well enough to tell a good answer from a plausible one.

See how our [Train practice](../index.html#build) handles SFT and chain-of-thought data, or read about [preference data for RLHF and DPO](rlhf-preference-data-guide.html).

## References

1. <span id="ref-1"></span>Zhou, C., et al. (2023). *LIMA: Less Is More for Alignment.* NeurIPS 2023. [arXiv:2305.11206](https://arxiv.org/abs/2305.11206)
2. <span id="ref-2"></span>Lee, K., et al. (2022). *Deduplicating Training Data Makes Language Models Better.* ACL 2022. [arXiv:2107.06499](https://arxiv.org/abs/2107.06499)
3. <span id="ref-3"></span>Gunasekar, S., et al. (2023). *Textbooks Are All You Need.* [arXiv:2306.11644](https://arxiv.org/abs/2306.11644)
