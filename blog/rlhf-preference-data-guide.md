# RLHF and preference data, explained for teams that collect it

> Reinforcement learning from human feedback is only as good as the comparisons behind it. What to collect, who should collect it, and how DPO changes the pipeline.

Published 2026-10-24 by the Latryn Research Team. Canonical: https://latryn.com/blog/rlhf-preference-data-guide.html

## Key takeaways

- RLHF turns human comparisons between model outputs into a training signal, usually through a reward model.
- Small amounts of well-chosen feedback go a long way: early RLHF work trained agents with feedback on less than one percent of their interactions.
- In InstructGPT, a 1.3B model trained with human feedback was preferred over the 175B GPT-3.
- DPO removes the separate reward model, but it still needs the same high-quality preference pairs.

Most of what makes a modern assistant feel helpful happens after pre-training. Post-training teaches a model which of many plausible answers people actually want. The raw material for that step is preference data: humans comparing outputs and saying which is better, and why.

This guide explains how the main methods use that data and what it means for the people who produce it.

## Where RLHF came from

The core idea predates large language models. In 2017, Christiano and colleagues showed that agents could learn complex behaviours from human judgements about which of two short clips was better, rather than from a hand-written reward function [[1]](#ref-1). Their agents needed human feedback on less than one percent of their interactions with the environment [[1]](#ref-1). The lesson that carried forward: people are far better at comparing outcomes than at specifying them.

## The InstructGPT recipe

OpenAI's InstructGPT work set the template most teams still recognise [[2]](#ref-2):

1. **Demonstrations.** Labelers write examples of the desired behaviour, and the model is fine-tuned on them with supervised learning.
2. **Comparisons.** Labelers rank several model outputs for the same prompt.
3. **Reinforcement learning.** A reward model trained on those rankings guides further fine-tuning.

The headline result is still striking. In human evaluations, outputs from a 1.3B parameter InstructGPT model were preferred to those of the 175B GPT-3, despite having roughly 100 times fewer parameters [[2]](#ref-2). Better data and better objectives beat raw scale.

Anthropic's work on helpful and harmless assistants applied the same approach and collected preference data specifically for both helpfulness and harmlessness, studying how the two interact [[3]](#ref-3).

## DPO: same data, simpler pipeline

Direct Preference Optimization, introduced by Rafailov and colleagues in 2023, showed that the reward model can be folded into the policy itself, so the standard RLHF objective can be optimised with a simple classification loss on preference pairs [[4]](#ref-4). That removes the separate reward model and the reinforcement learning loop.

DPO changes the engineering, not the inputs. It still needs pairs of responses with a reliable judgement about which is better. If anything, it makes data quality more visible, because there is no reward model in between to absorb noise.

## What good preference data looks like

The methods differ, but the data requirements are shared:

- **Comparisons a domain expert would agree with.** A preference on a chemistry answer is only useful if the person judging it knows chemistry.
- **A rationale for each judgement.** Short written reasons let reviewers audit decisions and catch rater drift.
- **Calibrated guidelines.** Raters need worked examples of edge cases: two good answers, two bad answers, an answer that is correct but unsafe.
- **Agreement measured, not assumed.** Overlap a share of items across raters and track agreement over time.
- **Coverage, not just volume.** Prompts should span the capabilities and failure modes the model will meet in use.

## Common failure modes

| Problem | What it looks like | Fix |
|---|---|---|
| Length bias | Raters reward longer answers by default | Guidelines that score substance, with short "better" examples |
| Surface fluency | Confident but wrong answers win | Domain experts and a factual check step |
| Rater drift | Standards shift over weeks | Recurring calibration sets with known answers |
| Narrow prompts | Model improves on the training mix only | Prompt sets designed for coverage |

## Who should do the comparing

For general conversational quality, trained generalists can do excellent work. For code, maths, science, law and medicine, the comparison is a technical judgement, and it needs someone who can verify the answer rather than admire it. That is why we match preference work to specialists and keep a senior reviewer on borderline items.

Read more about [how we vet experts](expert-vs-crowd-annotation.html), or see how our [Train practice](../index.html#build) packages SFT, RLHF and preference data.

## References

1. Christiano, P., et al. (2017). *Deep Reinforcement Learning from Human Preferences.* NeurIPS 2017. [arXiv:1706.03741](https://arxiv.org/abs/1706.03741)
2. Ouyang, L., et al. (2022). *Training Language Models to Follow Instructions with Human Feedback.* NeurIPS 2022. [arXiv:2203.02155](https://arxiv.org/abs/2203.02155)
3. Bai, Y., et al. (2022). *Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback.* [arXiv:2204.05862](https://arxiv.org/abs/2204.05862)
4. Rafailov, R., et al. (2023). *Direct Preference Optimization: Your Language Model is Secretly a Reward Model.* NeurIPS 2023. [arXiv:2305.18290](https://arxiv.org/abs/2305.18290)
