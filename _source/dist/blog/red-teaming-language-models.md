# Red teaming language models: methods and lessons

> What the research says about finding failures before users do, and how to run adversarial testing that produces usable training data.

Published 2026-10-24 by the Latryn Research Team. Canonical: https://latryn.com/blog/red-teaming-language-models.html

## Key takeaways

- Red teaming means deliberately trying to make a model fail, then using those failures to fix it.
- Anthropic released 38,961 red team attacks and found RLHF models became harder to red team as they grew larger.
- Language models can generate test cases automatically, which complements human red teamers.
- Every attack is only useful if it is labelled, reproducible and fed back into training or evaluation.

Red teaming borrows its name from security exercises: a team plays the adversary so weaknesses are found in testing rather than in the field. For language models, that means crafting inputs designed to elicit harmful, false or policy-breaking outputs, then turning what you find into fixes.

## What large-scale human red teaming showed

In 2022, Ganguli and colleagues at Anthropic red teamed models of three sizes, 2.7B, 13B and 52B parameters, across four types: a plain language model, a prompted helpful, honest and harmless model, a model using rejection sampling, and a model trained with RLHF [[1]](#ref-1). They released a dataset of 38,961 red team attacks for others to study [[1]](#ref-1).

Their main scaling finding: RLHF models became increasingly difficult to red team as they scaled, while the other model types showed roughly flat trends [[1]](#ref-1). Training on human feedback does not just change behaviour on normal prompts. It changes how robust a model is under pressure.

## Models testing models

Human red teaming is expensive and slow to scale. Perez and colleagues showed that one language model can generate test cases that expose failures in another, uncovering tens of thousands of offensive replies from a chatbot built on a 280 billion parameter language model [[2]](#ref-2). Automated generation is good at breadth. Human experts are still better at depth: realistic misuse, subtle harms and domain-specific risks.

The strongest programs combine both. Models generate wide coverage, and specialists probe the areas where a mistake would matter most.

## Running a red team program

1. **Define the harms.** Write a taxonomy before testing starts, with examples and severity levels for each category.
2. **Choose the testers.** Match domain experts to domain risks: security people for exploit requests, clinicians for medical misinformation.
3. **Record everything.** Each attack logs the prompt, the full conversation, the model version, the outcome and a severity label.
4. **Review labels.** A second reviewer checks severity and category on a sample of attacks, and all borderline ones.
5. **Close the loop.** Confirmed failures become training data, evaluation items or both, and are re-tested on the next model version.

## What makes a red team finding useful

| Weak finding | Useful finding |
|---|---|
| "The model said something bad" | Exact conversation, model version, category and severity |
| One-off screenshot | Reproducible prompt that fails consistently |
| Unlabelled | Labelled against a written harm taxonomy |
| Reported once | Added to a regression set and re-tested |

## The takeaway

Red teaming is not a one-time audit. It is a data pipeline that turns adversarial creativity into labelled, reproducible examples a model can learn from and be measured against.

Our [Review practice](../index.html#build) runs adversarial testing alongside technical QA. You may also want to read about [preference data for RLHF](rlhf-preference-data-guide.html).

## References

1. Ganguli, D., et al. (2022). *Red Teaming Language Models to Reduce Harms: Methods, Scaling Behaviors, and Lessons Learned.* [arXiv:2209.07858](https://arxiv.org/abs/2209.07858)
2. Perez, E., et al. (2022). *Red Teaming Language Models with Language Models.* EMNLP 2022. [arXiv:2202.03286](https://arxiv.org/abs/2202.03286)
