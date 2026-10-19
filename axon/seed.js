/* Axon starter vault · Northpeak Studios */
window.AXON_SEED = {
 "folders": [
  "Neuroanatomy",
  "Neurophysiology",
  "Neuropharm",
  "Neuropharm/Dopamine",
  "Neuropharm/Receptors & channels",
  "Clinical cases",
  "Daily notes"
 ],
 "notes": [
  {
   "folder": "",
   "title": "Welcome to Axon",
   "body": "Axon keeps your notes **on this device**. No account, no server, and it works offline.\n\n## The basics\n- Tap **+** to make a note. Write in markdown.\n- Link notes by typing `[[` and picking a name, like [[Dopamine pathways]].\n- Tapping a link to a note that doesn't exist yet creates it: try [[My first idea]].\n- Every note shows its **backlinks**: the notes that point to it.\n- The **Graph** tab draws how everything connects.\n\n## Markdown cheat sheet\n- `# Heading`, `**bold**`, `*italic*`, `==highlight==`\n- `- [ ] task` makes a checkbox you can tap\n- `> quote` and three backticks for code\n\n- [x] Open Axon\n- [ ] Write a note\n- [ ] Link two notes together\n\n> [!tip] Install it\n> In Safari tap Share, then **Add to Home Screen**. Axon then opens full screen and works with no signal.\n\nWhen you're ready, clear these starter notes in Settings. #axon"
  },
  {
   "folder": "Neuropharm/Dopamine",
   "title": "Dopamine pathways",
   "body": "Four major pathways carry dopamine out of the midbrain:\n\n- [[Mesolimbic pathway]]: VTA → nucleus accumbens. Reward, motivation, salience.\n- [[Mesocortical pathway]]: VTA → prefrontal cortex. Working memory, planning.\n- [[Nigrostriatal pathway]]: [[Substantia nigra]] → striatum; part of the [[Basal ganglia]] motor loop.\n- Tuberoinfundibular: hypothalamus → pituitary; dopamine here **inhibits prolactin** release.\n\nLose nigrostriatal neurons → [[Parkinson's disease]].\n\nDopamine acts on G-protein coupled [[Receptors]]: D1-like (D1, D5) raise cAMP, D2-like (D2, D3, D4) lower it.\n\n#neuro #pharm"
  },
  {
   "folder": "Neuropharm/Dopamine",
   "title": "Mesolimbic pathway",
   "body": "Ventral tegmental area (VTA) → **nucleus accumbens** (ventral striatum), with branches to the amygdala and hippocampus.\n\n- Encodes *reward prediction error*: firing rises when an outcome is better than expected, dips when it's worse.\n- Central to motivation and learning what's worth pursuing.\n- Overactivity here is linked to the positive symptoms of psychosis.\n\nPart of [[Dopamine pathways]]. Sister route: [[Mesocortical pathway]]. #neuro"
  },
  {
   "folder": "Neuropharm/Dopamine",
   "title": "Mesocortical pathway",
   "body": "VTA → **prefrontal cortex**.\n\n- Supports working memory, attention and planning.\n- *Under*activity here is linked to the negative and cognitive symptoms of psychosis.\n- Works with the [[Mesolimbic pathway]]; both start in the VTA.\n\nSee [[Prefrontal cortex]] and [[Dopamine pathways]]. #neuro"
  },
  {
   "folder": "Neuropharm/Dopamine",
   "title": "Nigrostriatal pathway",
   "body": "[[Substantia nigra]] pars compacta → dorsal striatum (caudate + putamen).\n\n- The motor branch of the [[Dopamine pathways]].\n- Feeds the [[Basal ganglia]]: D1 receptors excite the direct (\"go\") pathway, D2 receptors inhibit the indirect (\"stop\") pathway.\n- Net effect: dopamine makes it **easier to start movement**.\n\nDegeneration here causes [[Parkinson's disease]]. Blocking D2 receptors in this pathway is why some antipsychotics cause movement side effects. #neuro #pharm"
  },
  {
   "folder": "Neuroanatomy",
   "title": "Basal ganglia",
   "body": "A group of deep nuclei that select and gate movement (and habits, and some cognition).\n\n## Parts\n- Striatum: caudate + putamen (input)\n- Globus pallidus: external (GPe) and internal (GPi) segments\n- Subthalamic nucleus (STN)\n- [[Substantia nigra]]: pars compacta (dopamine) and pars reticulata (output)\n\n## Two loops\n1. **Direct pathway**: cortex → striatum (D1) → GPi/SNr → less inhibition of thalamus → movement *on*.\n2. **Indirect pathway**: cortex → striatum (D2) → GPe → STN → GPi → more inhibition → movement *off*.\n\nThe direct pathway is boosted by [[Dopamine pathways]] via D1; the indirect one is damped via D2. See [[Nigrostriatal pathway]] and [[Parkinson's disease]].\n\n#neuro #anatomy"
  },
  {
   "folder": "Neuroanatomy",
   "title": "Substantia nigra",
   "body": "Midbrain nucleus, named \"black substance\" for its **neuromelanin**.\n\n- *Pars compacta*: dopamine neurons that start the [[Nigrostriatal pathway]].\n- *Pars reticulata*: GABA output nucleus of the [[Basal ganglia]].\n\nLoss of pigmented cells here is the classic pathology finding in [[Parkinson's disease]]. #anatomy"
  },
  {
   "folder": "Neuroanatomy",
   "title": "Prefrontal cortex",
   "body": "Front of the frontal lobe. The brain's planner.\n\n- Dorsolateral: working memory, planning, switching tasks\n- Orbitofrontal / ventromedial: value, decisions, social behaviour\n- Anterior cingulate: conflict and error monitoring\n\nGets dopamine from the [[Mesocortical pathway]]. Matures last, into the mid-20s. #anatomy"
  },
  {
   "folder": "Clinical cases",
   "title": "Parkinson's disease",
   "body": "Progressive loss of dopamine neurons in the [[Substantia nigra]], so the [[Nigrostriatal pathway]] can't drive the [[Basal ganglia]] direct loop.\n\n## Classic signs (TRAP)\n- **T**remor at rest (\"pill-rolling\")\n- **R**igidity (cogwheel)\n- **A**kinesia / bradykinesia: slow, small movements\n- **P**ostural instability\n\n## Pathology\nLewy bodies: clumps of the protein α-synuclein inside neurons.\n\n## Treatment ideas\nRestore dopamine signalling: a precursor that crosses the blood–brain barrier, dopamine agonists, or blocking dopamine breakdown. Deep brain stimulation for some patients.\n\nSee [[Dopamine pathways]] for why movement slows. #clinical #neuro"
  },
  {
   "folder": "Neurophysiology",
   "title": "Action potentials",
   "body": "An all-or-none electrical spike that travels down an axon.\n\n1. Rest: about **−70 mV**, held by the Na⁺/K⁺ pump and K⁺ leak.\n2. Threshold: around −55 mV, voltage-gated Na⁺ channels open.\n3. Depolarization: Na⁺ rushes **in**, peak near +30 mV.\n4. Repolarization: Na⁺ channels inactivate, K⁺ flows **out**.\n5. Hyperpolarization: K⁺ channels close slowly, brief undershoot → refractory period.\n\nDetails in [[Ion channels]]. Speed depends on [[Myelin]]. At the end of the axon it triggers the [[Synapses]]. #neuro #physiology"
  },
  {
   "folder": "Neuropharm/Receptors & channels",
   "title": "Ion channels",
   "body": "Proteins that let ions cross the membrane.\n\n| Type | Opens when | Example |\n|---|---|---|\n| Voltage-gated | membrane voltage changes | Na⁺ channel in [[Action potentials]] |\n| Ligand-gated | a molecule binds | nicotinic ACh receptor |\n| Leak | always partly open | K⁺ leak channel |\n\n- Na⁺ in → depolarize; K⁺ out → repolarize; Cl⁻ in → usually inhibit.\n- Local anaesthetics work by blocking voltage-gated Na⁺ channels.\n\nSee also [[Receptors]]. #physiology #pharm"
  },
  {
   "folder": "Neurophysiology",
   "title": "Myelin",
   "body": "Fatty insulation wrapped around axons.\n\n- Made by **oligodendrocytes** in the CNS and **Schwann cells** in the PNS.\n- Gaps called *nodes of Ranvier* let the signal jump: **saltatory conduction**.\n- Makes [[Action potentials]] travel up to ~100× faster.\n\nDamage to CNS myelin is the core problem in multiple sclerosis. #physiology"
  },
  {
   "folder": "Neurophysiology",
   "title": "Synapses",
   "body": "Where one neuron talks to the next.\n\n1. An [[Action potentials|action potential]] reaches the terminal.\n2. Voltage-gated Ca²⁺ channels open, Ca²⁺ flows in.\n3. Vesicles fuse and release [[Neurotransmitters]].\n4. They bind [[Receptors]] on the next cell.\n5. The signal ends by reuptake, enzymes, or diffusion.\n\n> Most drugs that act on the brain work somewhere in steps 3–5.\n\n#physiology #pharm"
  },
  {
   "folder": "Neuropharm",
   "title": "Neurotransmitters",
   "body": "Chemical messengers released at [[Synapses]].\n\n- **Glutamate**: main excitatory signal\n- **GABA**: main inhibitory signal\n- **Dopamine**: reward, movement; see [[Dopamine pathways]]\n- **Serotonin**: mood, sleep, gut\n- **Norepinephrine**: alertness, fight-or-flight\n- **Acetylcholine**: muscles, memory, attention\n\nEach works through specific [[Receptors]]. #pharm"
  },
  {
   "folder": "Neuropharm/Receptors & channels",
   "title": "Receptors",
   "body": "Proteins that a neurotransmitter or drug binds to.\n\n## Ionotropic\nA ligand-gated [[Ion channels|ion channel]]. Fast (milliseconds). Examples: nicotinic ACh, GABA-A, AMPA.\n\n## Metabotropic\nG-protein coupled receptors (GPCRs). Slower but longer, work through second messengers like cAMP. Examples: all dopamine receptors, muscarinic ACh, most serotonin receptors.\n\n## Words to know\n- **Agonist**: activates the receptor\n- **Antagonist**: blocks it\n- **Affinity**: how tightly it binds; **efficacy**: how much it activates\n\nSee [[Neurotransmitters]] and [[Dopamine pathways]]. #pharm"
  },
  {
   "folder": "Daily notes",
   "title": "Study plan",
   "body": "## This week\n- [x] Read [[Action potentials]]\n- [x] Map the [[Dopamine pathways]]\n- [ ] Draw the [[Basal ganglia]] loops from memory\n- [ ] Quiz myself on [[Receptors]]\n- [ ] Write a case summary for [[Parkinson's disease]]\n\n> Spaced review beats cramming. Come back to each note in 1, 3 and 7 days.\n\n#study"
  }
 ]
};
