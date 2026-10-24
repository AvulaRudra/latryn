---
title: What makes an AI benchmark trustworthy
dek: Contamination, unfair tests and vague task statements quietly break evaluations. Here is how to build benchmarks whose scores you can believe.
category: Evaluation
read: 8 min
keywords: AI benchmark design, LLM evaluation, benchmark contamination, SWE-bench Verified, Terminal-Bench, evaluation data
takeaways:
- A benchmark score is only as good as its task statements, its tests and its isolation from training data.
- Human review of an existing benchmark can change scores a lot: OpenAI's review of SWE-bench filtered out 68.3% of the samples it annotated.
- Contamination cannot be fully eliminated, so plan for detection, fresh tasks and private test sets from day one.
- Every task needs a reference solution and a verifier that accepts all valid answers, not only the one the author wrote.
---

A benchmark is a promise: if a model scores well here, it can do this kind of work out there. That promise breaks more often than leaderboards suggest. Tasks leak into training data, tests reject correct answers, and problem statements leave out the detail a competent engineer would need. The score still looks precise. It just measures the wrong thing.

This article covers the three failure modes we see most often when we author and audit evaluation sets, and the controls that fix them.

## Failure mode 1: the task statement is underspecified

A task is underspecified when a skilled human could not be expected to solve it from the information given. In coding benchmarks this usually means an issue description that omits the expected behaviour, or a hidden requirement that only appears in the tests.

SWE-bench, which asks models to resolve real GitHub issues, made this visible. The original benchmark collected 2,294 task instances from 12 popular Python repositories [[1]](#ref-1). When OpenAI later had 93 experienced Python developers screen samples, annotators flagged 38.3% of the reviewed samples as underspecified [[2]](#ref-2). A model that fails those tasks is not necessarily weak. It may simply lack information that was never provided.

**The control:** every task gets a written brief that states the goal, the inputs and the acceptance criteria before any solution is written. A second expert who did not author the task must be able to solve it from the brief alone. If they cannot, the brief is rewritten, not the solution.

## Failure mode 2: the tests are unfair

A test is unfair when it rejects valid solutions. Overly specific unit tests are the classic case: they check a function name, an exact error string or one implementation path, when the task allowed several.

In the same SWE-bench review, annotators flagged 61.1% of samples for unit tests that could reject correct solutions [[2]](#ref-2). Across all issues, OpenAI filtered out 68.3% of the samples it annotated, and released the remaining 500 as SWE-bench Verified [[2]](#ref-2). That is a large share of a widely used benchmark, and it shows how much hidden noise an unreviewed test suite can carry.

**The control:** treat the verifier as a deliverable in its own right.

- Write a reference solution, then write at least one alternative valid solution and confirm the verifier accepts both.
- Test behaviour, not implementation details.
- Run the verifier against known wrong answers to confirm it fails them for the right reason.
- Record why each test exists, so reviewers can challenge it.

## Failure mode 3: the benchmark has leaked

Contamination happens when benchmark items, or close paraphrases of them, end up in a model's training data. The model then scores well by recall rather than reasoning.

A 2024 survey by Xu and colleagues groups detection methods into matching-based approaches, such as n-gram overlap and membership inference, and comparison-based approaches that look at model behaviour, such as perplexity or performance on data from different time periods [[3]](#ref-3). Its mitigations fall into three families: curating new data, including private and dynamic benchmarks; refactoring existing benchmarks through regeneration and filtering; and benchmark-free evaluation. The survey's conclusion is sobering: contamination risk cannot be fully eliminated [[3]](#ref-3).

**The control:** design for contamination from the start.

- Author original tasks rather than adapting public ones.
- Keep a private held-out split that never leaves controlled storage.
- Refresh the benchmark on a schedule, the idea behind dynamic benchmarks such as Dynabench, which keeps humans in the loop to write new, harder examples over time [[4]](#ref-4).
- Log provenance for every task: who wrote it, from what source, and when.

## What a trustworthy task looks like

Terminal-Bench is a useful reference point for hard, realistic tasks. Version 2.0 contains 89 tasks set in command-line environments inspired by real workflows, each with its own environment, a human-written reference solution and comprehensive tests [[5]](#ref-5). Frontier models and agents score below 65% on it [[5]](#ref-5), which is what you want from a benchmark meant to separate strong systems from very strong ones.

We use a simple checklist for every task we deliver:

| Component | What it must contain |
|---|---|
| `instruction.md` | Goal, inputs, expected output, acceptance criteria |
| Environment | A reproducible container that builds the same way every time |
| Reference solution | Written and run by the author, then re-run by a reviewer |
| Verifier | Tests that accept every valid answer and fail known wrong ones |
| Review notes | Who checked it, what changed, and why it passed |

## The short version

Benchmarks fail quietly. The fixes are not glamorous: clearer briefs, fairer tests, private splits and a second pair of expert eyes on every task. That review step is the difference between a number and a measurement.

If you are building or auditing an evaluation set, our [quality process](../index.html#quality) is built around exactly these checks, and our [sample tasks](../sample-tasks.html) show what the files look like in practice.

## References

1. <span id="ref-1"></span>Jimenez, C. E., et al. (2023). *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?* ICLR 2024. [arXiv:2310.06770](https://arxiv.org/abs/2310.06770)
2. <span id="ref-2"></span>OpenAI (2024). *Introducing SWE-bench Verified.* [openai.com](https://openai.com/index/introducing-swe-bench-verified/)
3. <span id="ref-3"></span>Xu, C., Guan, S., Greene, D., and Kechadi, M-T. (2024). *Benchmark Data Contamination of Large Language Models: A Survey.* [arXiv:2406.04244](https://arxiv.org/abs/2406.04244)
4. <span id="ref-4"></span>Kiela, D., et al. (2021). *Dynabench: Rethinking Benchmarking in NLP.* NAACL 2021. [arXiv:2104.14337](https://arxiv.org/abs/2104.14337)
5. <span id="ref-5"></span>Merrill, M. A., et al. (2026). *Terminal-Bench: Benchmarking Agents on Hard, Realistic Tasks in Command Line Interfaces.* [arXiv:2601.11868](https://arxiv.org/abs/2601.11868)
