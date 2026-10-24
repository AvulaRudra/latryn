---
title: How to build agent environments that test real work
dek: Docker images, terminal tasks and verifiers: a practical anatomy of the environments used to train and evaluate AI agents.
category: Agent environments
read: 8 min
keywords: AI agent environments, agent benchmark, Docker evaluation environment, terminal tasks, verifier, SWE-bench, AgentBench, Terminal-Bench
takeaways:
- An agent environment has four parts: a brief, a reproducible container, a reference solution and a verifier.
- Agents fail on long, multi-step work, so environments should test sequences of actions, not single answers.
- Reproducibility is a quality issue: environments that build differently produce failures unrelated to the agent.
- The verifier decides what the benchmark measures, so it deserves the most review.
---

A chat benchmark asks a model for an answer. An agent environment asks it to do something: run commands, edit files, call tools and check its own work. That shift changes what good evaluation and training data looks like.

## Why agents need environments, not prompts

AgentBench, published in 2023, evaluated language models as agents across eight distinct environments, from operating systems and databases to web tasks [[1]](#ref-1). The authors found that top commercial models performed well, while many open models of 70B parameters or fewer fell well behind, and identified weak long-horizon reasoning, decision-making and instruction following as the main obstacles [[1]](#ref-1). Those are exactly the skills a single-turn prompt cannot test.

SWE-bench made the same point for software engineering by asking models to resolve real GitHub issues inside real repositories. When it launched, the best model resolved only 1.96% of the 2,294 issues [[2]](#ref-2). Terminal-Bench 2.0 extends the idea to 89 hard command-line tasks, each with its own environment and tests, where frontier systems still score below 65% [[3]](#ref-3).

## Anatomy of a good environment

```
task-0417/
  instruction.md        goal, inputs, acceptance criteria
  task.toml             language, domain, difficulty, time limit
  environment/
    Dockerfile          pinned base image and dependencies
  fixtures/             input files the agent must handle
  solution/
    solve.sh            human-written reference solution
  tests/
    verifier.py         checks the end state, not the steps
  review/
    notes.md            who reviewed it and what changed
```

### 1. The brief
The instruction states the goal and the acceptance criteria in plain language. It does not hint at the solution, and it does not hide requirements in the tests.

### 2. The container
Pin everything: base image digest, package versions, data files. An environment that builds differently on Tuesday produces failures that have nothing to do with the agent. OpenAI listed hard-to-set-up development environments as one of the reasons it re-annotated SWE-bench [[4]](#ref-4).

### 3. The reference solution
A human writes and runs a full solution inside the container. If the author cannot solve it reliably in the environment provided, neither can the agent, and the task is broken.

### 4. The verifier
The verifier checks the final state of the system: files, outputs, service behaviour. It should accept any valid approach and fail known wrong ones. Because it defines what success means, it gets the most scrutiny at review.

## Designing tasks that agents actually fail

Hard tasks are not obscure tasks. The most useful ones come from real workflows and require several dependent steps:

- Diagnosing a failing build, fixing it and proving the fix with tests.
- Migrating data between formats while preserving edge cases.
- Configuring a service so another program can use it.
- Recovering from a partially broken state left by a previous step.

Each step should be checkable, and failure partway through should be visible in the end state.

## Review before release

Before any environment ships, a second engineer rebuilds it from scratch, solves it from the brief, runs the verifier against the reference solution and an alternative solution, and tries at least one plausible wrong answer. Anything that fails goes back to the author with notes.

Browse our [sample tasks](../sample-tasks.html) to see this structure, or read [what makes a benchmark trustworthy](trustworthy-ai-benchmarks.html).

## References

1. <span id="ref-1"></span>Liu, X., et al. (2023). *AgentBench: Evaluating LLMs as Agents.* ICLR 2024. [arXiv:2308.03688](https://arxiv.org/abs/2308.03688)
2. <span id="ref-2"></span>Jimenez, C. E., et al. (2023). *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?* ICLR 2024. [arXiv:2310.06770](https://arxiv.org/abs/2310.06770)
3. <span id="ref-3"></span>Merrill, M. A., et al. (2026). *Terminal-Bench: Benchmarking Agents on Hard, Realistic Tasks in Command Line Interfaces.* [arXiv:2601.11868](https://arxiv.org/abs/2601.11868)
4. <span id="ref-4"></span>OpenAI (2024). *Introducing SWE-bench Verified.* [openai.com](https://openai.com/index/introducing-swe-bench-verified/)
