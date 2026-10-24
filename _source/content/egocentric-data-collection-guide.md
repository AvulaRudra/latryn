---
title: Egocentric data collection: a practical guide for robotics and embodied AI
dek: Why first-person video matters for robots and assistants, what the large public datasets teach us, and how to run a capture program that produces usable data.
category: Egocentric data
read: 9 min
keywords: egocentric video data, egocentric data collection, first-person video dataset, head-mounted camera data, embodied AI training data, robot learning from human video, hand-object interaction annotation
takeaways:
- Egocentric video records a task from the point of view of the person doing it, so hands, objects and intent stay in frame.
- Public datasets such as Ego4D and EPIC-KITCHENS-100 show the value of scale and of dense, fine-grained action labels.
- Robot learning research reports that an hour of human hand data can be worth more than an extra hour of robot data.
- Good capture programs fix the protocol, consent and privacy handling before recording, and review annotation as carefully as collection.
---

A robot that has to pour, fold or assemble learns best from data that looks like the job: hands at work, objects being handled, seen from roughly where the eyes would be. That is egocentric video, recorded from the first-person point of view with a head-mounted camera or smart glasses. This guide explains why it matters, what the research shows, and how to run a capture program that gives a model signal rather than hours of footage.

## What makes egocentric data different

A camera on a tripod sees a scene. A camera on someone's head sees a task. The wearer's hands, the object they reach for and the order of their actions stay in view, and the camera moves with their attention. That makes egocentric video a natural fit for problems where the model must act, not just describe: robot manipulation, assistants that guide a person through a task, and models that anticipate what someone will do next.

The same properties make it harder to collect. The camera is worn by a person in real homes and workplaces, bystanders can appear in frame, and the most important events (a grasp, a twist, a release) can last a fraction of a second.

## What the large datasets teach us

**Scale and diversity.** Ego4D collected 3,670 hours of daily-life activity video recorded by 931 camera wearers in 74 locations across 9 countries, covering household, outdoor, workplace and leisure scenarios [[1]](#ref-1). Its authors describe a collection approach designed around consenting participants, privacy and ethics standards, with de-identification where relevant [[1]](#ref-1). Diversity of people, places and tasks is what lets a model generalise beyond one kitchen.

**Density of labels.** EPIC-KITCHENS-100 contains 100 hours of footage, 20 million frames and 90,000 actions in 700 videos recorded across 45 environments [[2]](#ref-2). Compared with the previous version, it reports 54% more actions per minute and 128% more action segments, because denser, more complete annotation captures fine-grained actions that sparse labels miss [[2]](#ref-2). The lesson for any program: the annotation scheme matters as much as the recording.

**Skill and expertise.** Ego-Exo4D pairs first-person and third-person views of skilled activity: 1,286 hours of video from 740 participants in 13 cities and 123 scene contexts [[3]](#ref-3). It adds commentary from coaches and teachers and benchmarks such as proficiency estimation [[3]](#ref-3). When the task requires skill, the people recording it and the people labelling it both need domain knowledge.

## Why robotics teams care

Robot demonstrations are slow and expensive to collect. Human video is cheaper and far more varied, but a human hand is not a robot gripper. Recent work closes part of that gap. EgoMimic captures human data with Project Aria glasses, pairing egocentric video with 3D hand tracking, and trains on human and robot data together [[4]](#ref-4). Its authors report that adding one hour of hand data was significantly more valuable than one hour of additional robot data [[4]](#ref-4).

That does not make any video useful. Data helps when the tasks match what the robot must do, the hands and objects are clearly visible, and the labels describe actions at the level the policy needs.

## Running a capture program that works

**1. Write the protocol first.** Define the tasks, the environments, the camera position and settings, the clip length and what counts as a usable take. Ambiguity at this stage becomes inconsistent data later.

**2. Agree consent and privacy before recording.** Contributors should understand what is recorded and how it will be used. Decide how bystanders, faces, screens and documents are handled and who can access raw footage. Ego4D treats these as design constraints, not afterthoughts [[1]](#ref-1).

**3. Pilot and calibrate.** Run a small batch, review it with the client and fix the protocol. Most problems, such as hands leaving frame, poor lighting or tasks done in an unusual order, show up in the first few clips.

**4. Annotate at the right granularity.** Typical layers are action segments with start and end times, verb and object labels, hand and object boxes or keypoints, and short narrations. Choose the layers the model actually needs, and write examples for the hard cases.

**5. Review collection and labels.** Screen every clip for technical issues and protocol breaks, score annotations against the guideline, and send edge cases to a senior reviewer. Track agreement between annotators rather than assuming it.

**6. Deliver with context.** Ship clips together with labels, capture metadata and the consent records the program requires, so the data stays usable and auditable.

## Where Latryn fits

Latryn Capture runs this process end to end: contributors record with head-mounted cameras to your protocol, trained reviewers segment and label each clip, and every clip passes the same three review gates as the rest of our work. See [how our quality gates work](../index.html#quality), read about [expert and crowd annotation](expert-vs-crowd-annotation.html), or [scope a capture program](../index.html?type=Scope%20a%20program#contact).

## References

1. <span id="ref-1"></span>Grauman, K., et al. (2022). *Ego4D: Around the World in 3,000 Hours of Egocentric Video.* CVPR 2022. [arXiv:2110.07058](https://arxiv.org/abs/2110.07058)
2. <span id="ref-2"></span>Damen, D., et al. (2022). *Rescaling Egocentric Vision: Collection, Pipeline and Challenges for EPIC-KITCHENS-100.* International Journal of Computer Vision. [arXiv:2006.13256](https://arxiv.org/abs/2006.13256)
3. <span id="ref-3"></span>Grauman, K., et al. (2024). *Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives.* CVPR 2024. [arXiv:2311.18259](https://arxiv.org/abs/2311.18259)
4. <span id="ref-4"></span>Kareer, S., et al. (2024). *EgoMimic: Scaling Imitation Learning via Egocentric Video.* [arXiv:2410.24221](https://arxiv.org/abs/2410.24221)
