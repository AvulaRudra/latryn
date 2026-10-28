# Egocentric data collection for robotics and embodied AI

> Why first-person video matters for models that act in the world, what the major public datasets teach about scale and annotation, and what a capture program needs to get right.

Published 2026-10-24 by the Latryn Research Team. Canonical: https://latryn.com/blog/egocentric-data-collection.html

## Key takeaways

- Egocentric video shows a task the way the person doing it sees it: hands, objects and attention in one frame.
- Public datasets show the range: Ego4D has 3,670 hours from 931 camera wearers; EPIC-KITCHENS-100 has 90K annotated actions.
- Dense, consistent annotation matters as much as hours of footage.
- Human first-person data can train robot policies directly: one study found an hour of hand data worth more than an hour of robot data.
- A good program fixes the protocol, consent and annotation schema before the first recording.

Most video on the internet is filmed by someone watching. Models that have to act, such as robot policies, assistants in smart glasses and agents that follow a person through a task, need the other view: the one from the eyes of the person doing the work. That first-person view is called egocentric data, and collecting it well is a discipline of its own.

## Why the first-person view

An egocentric clip puts the hands, the objects they touch and the direction of attention in the same frame. It captures the order of steps, the small corrections and the moments of hesitation that a third-person camera misses. For robotics and embodied AI, that is the signal that matters: what a skilled person actually does, from where they actually stand.

## What the public datasets teach

Three research datasets show what large-scale egocentric collection looks like and where the effort goes.

**Scale and diversity.** Ego4D collected 3,670 hours of daily-life video from 931 unique camera wearers in 74 locations across 9 countries [[1]](#ref-1). Its benchmarks span remembering the past, understanding the present (including hand and object manipulation) and forecasting what happens next [[1]](#ref-1). The lesson: diversity of people and places is designed in, not hoped for.

**Annotation density.** EPIC-KITCHENS-100 contains 100 hours of video, 20M frames and 90K actions recorded in 45 kitchen environments [[2]](#ref-2). Its authors built a new annotation pipeline that produced denser and more complete labels, with 54% more actions per minute than the earlier version [[2]](#ref-2). The lesson: how you annotate decides what a dataset is worth.

**Skill and expertise.** Ego-Exo4D captured skilled human activity from 740 participants in 13 cities, 1,286 hours of video recorded from first-person and third-person cameras at the same time, with gaze, IMU and 3D point clouds [[3]](#ref-3). It also includes commentary written by coaches and teachers about how well each activity was performed [[3]](#ref-3). The lesson: for skilled tasks, expert judgement is part of the data.

## From watching to doing

Egocentric video is no longer only for recognition models. EgoMimic recorded human demonstrations with Project Aria glasses, paired them with 3D hand tracking, and trained a single robot policy on human and robot data together [[4]](#ref-4). The authors report that an additional hour of hand data was significantly more valuable than an additional hour of robot data [[4]](#ref-4). Human first-person data is cheaper to collect than robot teleoperation, and it scales with people rather than hardware.

## What a capture program needs

Footage alone is not a dataset. The programs that work decide these things before anyone presses record:

- **A capture protocol.** Which tasks, which environments, how long each session runs, how the camera is worn and what counts as a usable clip.
- **Consent and privacy.** Written consent from every contributor, clear rules for bystanders, screens and documents in view, and how clips are stored and handed over.
- **An annotation schema.** Which labels you need: hand keypoints, object boxes and contact, action segments with start and end times, narration, or quality judgements. Write the edge cases down.
- **Agreement checks.** Overlap a share of clips between annotators and measure agreement with chance-corrected statistics, as with any human labelling. Our note on [expert and crowd annotation](expert-vs-crowd-annotation.html) explains how.
- **Review before delivery.** Reject clips that break the protocol before they are labelled, and review labels before they reach your training pipeline.

## How Latryn runs egocentric programs

Latryn Capture follows the same loop as our other practices. We agree the tasks, devices, consent process and annotation schema with you in writing. A pilot batch calibrates contributors and annotators on the edge cases. Contributors then record real tasks with head-mounted cameras, trained reviewers segment and label each clip, and every clip passes three gates (automated screen, structured scoring and human sign-off) before delivery.

See [the structure of a sample egocentric clip](../sample-tasks.html#egocentric-sample) or [scope a capture program](../index.html?type=Scope%20a%20program#contact).

## References

1. Grauman, K., et al. (2022). *Ego4D: Around the World in 3,000 Hours of Egocentric Video.* CVPR 2022. [arXiv:2110.07058](https://arxiv.org/abs/2110.07058)
2. Damen, D., et al. (2022). *Rescaling Egocentric Vision: Collection, Pipeline and Challenges for EPIC-KITCHENS-100.* International Journal of Computer Vision. [arXiv:2006.13256](https://arxiv.org/abs/2006.13256)
3. Grauman, K., et al. (2024). *Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives.* CVPR 2024. [arXiv:2311.18259](https://arxiv.org/abs/2311.18259)
4. Kareer, S., et al. (2024). *EgoMimic: Scaling Imitation Learning via Egocentric Video.* [arXiv:2410.24221](https://arxiv.org/abs/2410.24221)
