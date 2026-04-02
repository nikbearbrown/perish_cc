-- Tier essay content seed
-- Run after migration-003 (tiers table must exist with rows 1–7)
-- Replace placeholder text below with actual essays when available.

UPDATE tiers SET page_content = '
Pattern intelligence is the foundation of all statistical learning. It is the capacity to detect regularity — to notice that certain features co-occur, that sequences repeat, that distributions have shape. Every machine learning model, from logistic regression to the largest transformer, operates at this tier.

What makes pattern intelligence irreducibly human is not the detection itself — machines surpass us there — but the judgment of which patterns matter. A model finds every correlation. A human decides which ones are meaningful. The distinction between signal and noise is not a statistical problem. It is an interpretive one.

At this tier, the question is not whether AI can recognize patterns. It can. The question is whether pattern recognition alone constitutes understanding. The answer, consistently, is no. Understanding requires context, purpose, and the ability to know when a pattern is coincidence rather than cause.

Articles in this tier explore the boundary between statistical regularity and genuine comprehension — where pattern recognition ends and human intelligence begins.
' WHERE id = 1;

UPDATE tiers SET page_content = '
Embodied intelligence is the knowledge that lives in the body. It is the carpenter who feels when the wood is about to split, the surgeon whose hands know tissue tension before conscious thought arrives, the dancer who understands momentum through muscle rather than equation.

AI has no body. It has no proprioception, no fatigue, no spatial experience of being in a place rather than processing data about a place. The most sophisticated robotics systems simulate embodiment; they do not possess it. The difference matters because embodied knowledge is not a degraded form of propositional knowledge — it is a different kind of knowledge entirely.

Situatedness — being physically present in an environment that pushes back — shapes cognition in ways that disembodied processing cannot replicate. You cannot understand heat from a dataset of temperatures. You understand heat because it has burned you.

Articles in this tier explore physical situatedness, sensorimotor grounding, and the forms of intelligence that emerge only from having a body in a world.
' WHERE id = 2;

UPDATE tiers SET page_content = '
Social intelligence is the capacity for intersubjective understanding — knowing what another person feels, not through inference from behavioral data, but through direct apprehension born of shared experience. It is the mother who hears the difference between her child''s cries. It is the negotiator who reads the room. It is the friend who knows when silence means peace and when it means pain.

AI can classify emotional expressions. It can predict social behavior from large datasets. What it cannot do is feel with another person. Empathy is not sentiment analysis. Social cognition is not the modeling of social behavior from the outside — it is participation in a shared mental life from the inside.

The irreducibly human element is not the ability to predict what someone will do. It is the ability to care about what they are experiencing. That caring shapes our responses in ways that no reward function can replicate, because caring is not optimization. It is relationship.

Articles in this tier explore intersubjective feeling, social cognition, and the forms of intelligence that require genuine participation in human relationship.
' WHERE id = 3;

UPDATE tiers SET page_content = '
Metacognitive intelligence is the capacity to observe, evaluate, and regulate one''s own thinking. It is knowing that you don''t know. It is catching yourself in a bias before it shapes your conclusion. It is the scientist who distrusts her own result precisely because it confirms what she hoped to find.

AI systems can be made to express uncertainty — calibrated confidence scores, ensemble disagreement metrics, abstention thresholds. But these are engineered properties, not self-awareness. A model that outputs "I''m not sure" has not experienced doubt. It has produced tokens that pattern-match to expressions of uncertainty in its training data.

The difference matters because genuine metacognition changes behavior from the inside. When a human recognizes that she is reasoning poorly, she can step back, reframe, seek outside perspective. A model cannot step back from itself. It has no self to step back from.

Articles in this tier explore the oversight of one''s own cognitive processes — the capacity that allows humans to improve their own thinking in real time.
' WHERE id = 4;

UPDATE tiers SET page_content = '
Causal intelligence is the capacity to reason about why things happen — not merely that they co-occur, but that one brings about the other. It is the difference between knowing that the rooster crows before dawn and knowing that the rooster does not cause the sun to rise.

AI finds correlations at superhuman scale. But correlation is not causation, and no amount of data resolves this gap. Judea Pearl''s ladder of causation — association, intervention, counterfactual — maps the ascent from pattern to cause. Current AI systems operate almost entirely at the first rung. Humans reason naturally at all three.

Counterfactual thinking — asking "what would have happened if?" — is the hallmark of causal intelligence. It requires constructing a mental model of the world, intervening on that model, and evaluating the consequences of interventions that never occurred. This is not something that emerges from statistical training. It is something that emerges from having a theory of how the world works.

Articles in this tier explore causal reasoning, counterfactual thinking, and the kind of "why" questions that statistical models cannot answer.
' WHERE id = 5;

UPDATE tiers SET page_content = '
Collective intelligence is the capacity that emerges when groups, institutions, or communities think together in ways that exceed what any individual — human or artificial — could achieve alone. It is the jury that deliberates, the research community that self-corrects, the democratic process that aggregates judgment under uncertainty.

AI can coordinate agents. It can optimize multi-agent systems. What it cannot do is participate in the kind of collective reasoning that requires trust, accountability, dissent, and the willingness to be persuaded. Collective intelligence is not swarm optimization. It is the emergent property of agents who hold each other accountable, who change their minds in response to argument rather than gradient, and who bear consequences for their collective decisions.

The irreducibly human element is institutional: the norms, traditions, and structures that allow groups to be smarter than their smartest member. These structures are not algorithms. They are social contracts, maintained by people who choose to uphold them.

Articles in this tier explore emergent intelligence from group behavior, institutional reasoning, and the forms of collective cognition that require genuine social participation.
' WHERE id = 6;

UPDATE tiers SET page_content = '
Wisdom is practical judgment under genuine stakes. It is the doctor who knows when to stop treating. It is the leader who knows when to act on incomplete information and when to wait. It is the parent who knows that the right answer for this child, in this moment, is not the answer that would be right in general.

Wisdom cannot be optimized because it operates in domains where the objective function is unclear, contested, or changes depending on who is affected. It requires the integration of all lower tiers — pattern, embodiment, social feeling, metacognition, causal reasoning, collective judgment — applied to decisions that matter and cannot be undone.

AI can simulate deliberation. It can weigh evidence. What it cannot do is bear the weight of a decision. Wisdom is not the output of a decision procedure. It is the quality of judgment that emerges when a person takes responsibility for acting under uncertainty, knowing that they might be wrong and that the consequences are real.

This is the capstone tier — not because wisdom is the "highest" form of intelligence, but because it is the most integrated. It requires everything else and adds the dimension of genuine stakes.

Articles in this tier explore practical judgment, decision-making under uncertainty, and the forms of intelligence that emerge only when something real is at risk.
' WHERE id = 7;
