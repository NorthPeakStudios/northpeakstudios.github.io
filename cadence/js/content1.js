// Curriculum part 1: Beginner + Intermediate. Lessons are concise and checked for accuracy.
// ex: notation examples. ev syntax: space-separated events; '+' joins chord tones; ':label' adds a label; '|' adds a barline after the event.
const CONCEPTS = [];
const C = o => CONCEPTS.push(o);

// ================= TIER 1: BEGINNER =================
C({id:'pitch', tier:1, area:'notation', title:'Pitch, notes & octaves', pre:[], links:['staff','accidentals','acoustics','piano-layout'],
lesson:`<p><b>Pitch</b> is how high or low a sound is; physically it is the frequency of vibration in hertz (Hz). Western music names pitches with seven letters, <b>A B C D E F G</b>, then repeats.</p>
<p>The repeat is the <b>octave</b>: a note with exactly double the frequency sounds like "the same note, higher". A4 = 440 Hz, A5 = 880 Hz, A3 = 220 Hz.</p>
<p><b>Scientific pitch notation</b> numbers octaves starting at C: middle C is <b>C4</b>; the B just below it is B3.</p>
<p>The octave is divided into 12 equal <b>semitones</b> (half steps) in equal temperament; two semitones make a <b>whole step</b>.</p>`,
ex:[{clef:'treble', ev:'C4:C4 D4 E4 F4 G4 A4 B4 C5:C5', cap:'One octave of natural notes, C4 to C5'}],
explain:{kid:'Notes are like stairs for sound. There are 7 letter-named stairs, and then the pattern starts again higher up — that next "same letter" is an octave.',
berklee:'Pitch = frequency; octave equivalence (2:1) lets us use 7 letter classes. Learn SPN (C4 = middle C) so you can talk about register precisely, e.g. "voice the 3rd above C5".',
jazz:'Every note name is a pitch class. Register is a choice: the same Bb7 voicing sounds muddy below about C3 and bright up top. Know where the octave numbers sit on your horn.',
phd:'Octave equivalence partitions pitch space into 12 pitch classes (in 12-TET), a quotient Z/12Z of the integer pitch continuum. Its perceptual basis is partial but not absolute (e.g., stretched octaves in piano tuning).',
math:'f(n) = 440 · 2^((n−69)/12) for MIDI note n. An octave multiplies frequency by 2; a semitone by 2^(1/12) ≈ 1.05946.'},
examples:[['Film','"Somewhere Over the Rainbow" (Arlen) opens with an upward octave leap.'],['Science','Concert A = 440 Hz is the ISO 16 standard tuning reference.']],
quiz:{gens:['note-freq','octave-id'], mcq:[{q:'If A4 is 440 Hz, what is A3?',a:'220 Hz',o:['880 Hz','220 Hz','330 Hz','110 Hz'],why:'Down an octave halves the frequency.'},{q:'Which note is middle C in scientific pitch notation?',a:'C4',o:['C3','C4','C5','C0'],why:'Middle C = C4 (≈261.63 Hz).'}]}});

C({id:'piano-layout', tier:1, area:'notation', title:'The keyboard: half & whole steps', pre:['pitch'], links:['accidentals','intervals','major-scale'],
lesson:`<p>White keys are the natural notes. Black keys sit in groups of <b>2 and 3</b>; C is the white key just left of each 2-black-key group.</p>
<p>A <b>half step</b> (semitone) is the very next key, black or white. A <b>whole step</b> = 2 half steps. E–F and B–C are half steps with no black key between them.</p>`,
ex:[{clef:'treble', ev:'E4+F4:half B4+C5:half C4+D4:whole', cap:'Half steps occur naturally at E–F and B–C'}],
explain:{kid:'Find the two black keys: the white key to their left is C. Moving to the very next key is a tiny step (half step).',
berklee:'Memorize the natural half steps E–F and B–C; every scale formula (W-W-H-W-W-W-H) is built from this.',
jazz:'Your ear should feel half-step motion as tension → release: leading tones, chromatic approach notes, enclosures.',
phd:'The diatonic collection is the maximally even 7-note subset of Z12; its two semitones (E–F, B–C) are as far apart as possible.',
math:'White keys = pitch classes {0,2,4,5,7,9,11}. Step sizes cycle (2,2,1,2,2,2,1).'},
examples:[['Film','"Jaws" (John Williams): the menacing two-note half step E–F.']],
quiz:{gens:['tap-note','halfwhole'], mcq:[{q:'Which pair is a natural half step (no black key between)?',a:'B–C',o:['C–D','B–C','F–G','A–B'],why:'E–F and B–C are the only natural half steps.'}]}});

C({id:'staff', tier:1, area:'notation', title:'The staff & reading notes', pre:['pitch'], links:['clefs','ledger','accidentals'],
lesson:`<p>The <b>staff</b> has 5 lines and 4 spaces. Each line or space is one letter step. Higher on the staff = higher pitch.</p>
<p>Treble staff lines bottom→top: <b>E G B D F</b>; spaces: <b>F A C E</b>. Bass staff lines: <b>G B D F A</b>; spaces: <b>A C E G</b>.</p>
<p><b>Ledger lines</b> extend the staff. Middle C sits on one ledger line below the treble staff and one above the bass staff.</p>`,
ex:[{clef:'treble', ev:'E4:E G4:G B4:B D5:D F5:F', cap:'Treble lines'},{clef:'bass', ev:'G2:G B2:B D3:D F3:F A3:A', cap:'Bass lines'},{clef:'treble', ev:'C4:C4 A5:A5 C6:C6', cap:'Ledger lines'}],
explain:{kid:'The staff is a ladder for notes. Each line and each space between lines is the next letter.',
berklee:'Read by landmarks (treble G4, middle C, bass F3, high C5/low C3) and intervals, not by counting lines from the bottom.',
jazz:'Lead sheets live in treble clef; bass players read bass clef. Sight-reading = pattern recognition (steps, skips, chord shapes).',
phd:'Staff notation is a diatonic (not chromatic) coordinate system: vertical position encodes letter-name (diatonic) distance; accidentals encode chromatic inflection.',
math:'Staff position = diatonic index d = 7·octave + letterIndex; adjacent positions differ by 1 regardless of semitone size.'},
examples:[['Mnemonic','Treble lines "Every Good Boy Does Fine"; spaces spell FACE.']],
quiz:{gens:['note-name-treble','note-name-bass','tap-note'], mcq:[]}});

C({id:'clefs', tier:1, area:'notation', title:'Clefs: treble, bass, alto, tenor', pre:['staff'], links:['staff','orchestration','transposition'],
lesson:`<p>A <b>clef</b> tells you which line is which pitch.</p><ul><li><b>Treble (G) clef</b>: its curl circles the 2nd line = G4.</li><li><b>Bass (F) clef</b>: its two dots surround the 4th line = F3.</li><li><b>Alto (C) clef</b>: centered on the middle line = C4 (viola).</li><li><b>Tenor (C) clef</b>: centered on the 4th line = C4 (high cello, bassoon, trombone).</li></ul>`,
ex:[{clef:'treble', ev:'G4:G4', cap:'Treble clef: G4 on line 2'},{clef:'bass', ev:'F3:F3', cap:'Bass clef: F3 on line 4'},{clef:'alto', ev:'C4:C4', cap:'Alto clef: middle line = C4'}],
explain:{kid:'A clef is the key to a map. Same staff, different clef, different notes.',
berklee:'C clefs keep ledger lines off the page for mid-range instruments. Learn alto for viola parts and tenor for trombone/cello scores.',
jazz:'Trombonists read bass and tenor; if you write for bone in a big band, write in bass clef, tenor clef only up high.',
phd:'Historically clefs were movable (soprano, mezzo-soprano, baritone clefs too); score readers used clef substitution to transpose at sight.',
math:'A clef sets the offset k in staff position → pitch: line i (0..4) maps to diatonic index k + 2i.'},
examples:[['Orchestra','Violas read alto clef; cellos switch to tenor clef in high passages.']],
quiz:{gens:['note-name-alto','note-name-bass'], mcq:[{q:'Which line does the bass clef mark as F3?',a:'4th line',o:['2nd line','3rd line','4th line','5th line'],why:'The F clef dots straddle the 4th line.'},{q:'Which instrument mainly reads alto clef?',a:'Viola',o:['Violin','Viola','Cello','Flute'],why:'Viola = alto clef.'}]}});

C({id:'accidentals', tier:1, area:'notation', title:'Accidentals & enharmonics', pre:['piano-layout','staff'], links:['keysigs','intervals','spelling'],
lesson:`<p><b>Sharp ♯</b> raises a half step, <b>flat ♭</b> lowers a half step, <b>natural ♮</b> cancels. <b>Double sharp 𝄪</b> / <b>double flat 𝄫</b> move two half steps.</p>
<p>An accidental lasts for the rest of the measure on that line/space (same octave).</p>
<p><b>Enharmonic</b> notes sound the same but are spelled differently: C♯ = D♭, E♯ = F, B♯ = C, F𝄪 = G. Spelling matters: it shows the note's function (a leading tone in D minor is C♯, not D♭).</p>`,
ex:[{clef:'treble', ev:'C#4:C♯ Db4:D♭ E#4:E♯ F4:F', cap:'Enharmonic pairs'}],
explain:{kid:'Sharps move a note up one key, flats move it down one key. Sometimes two names point to the same key.',
berklee:'Spell by function: in A major the 3rd is C♯ (never D♭). Scales use each letter once.',
jazz:'Chord symbols get sloppy (Gb vs F#); spell for the reader. In a D7, the 3rd is F♯; the ♯9 is E♯ (often written F).',
phd:'Enharmonic equivalence holds in 12-TET but not in tonal syntax or in just/meantone tunings, where G♯ and A♭ differ in pitch.',
math:'Spelled pitch = (letter, accidental) ∈ Z7 × Z; pitch class = (natural(letter)+accidental) mod 12. Many-to-one map.'},
examples:[['Theory','In 1/4-comma meantone, G♯ is about 41 cents lower than A♭.']],
quiz:{gens:['enharmonic','note-name-treble-acc'], mcq:[{q:'What is enharmonic to E♯?',a:'F',o:['F','E','F♯','D♯'],why:'E♯ is a half step above E = F.'}]}});

C({id:'rhythm', tier:1, area:'rhythm', title:'Rhythm: note values & rests', pre:[], links:['meter','tempo','rhythm-dictation'],
lesson:`<p>Durations halve each step: <b>whole (4 beats in 4/4) → half (2) → quarter (1) → eighth (½) → sixteenth (¼)</b>. Each has a matching rest.</p>
<p>A <b>dot</b> adds half the note's value: dotted half = 3 beats, dotted quarter = 1½. A <b>tie</b> joins two notes into one sound.</p>
<p>Eighths and sixteenths are <b>beamed</b> together within a beat so the beat is visible.</p>`,
rhythm:[[[4]],[[2],[2]],[[1],[1],[1],[1]],[[0.5,0.5],[0.5,0.5],[0.25,0.25,0.25,0.25],[1.5,0.5]]],
explain:{kid:'A whole note is a long "hold", a half note is half as long, a quarter is one clap, eighths are two quick claps per beat.',
berklee:'Count subdivisions out loud: "1 e & a". Dotted-quarter + eighth = "1 (2) & ".',
jazz:'Swing eighths are written straight but played long-short (roughly a triplet feel). Read "1 & 2 &", feel triplets.',
phd:'Western notation is a binary-subdivision durational lattice; tuplets and dots extend it to ternary ratios. Performance (expressive timing) deviates from notated ratios systematically.',
math:'Durations are dyadic rationals 2^−k (times 3/2 for one dot, 7/4 for two). A measure is a partition of the bar length into these values.'},
examples:[['Classical','Beethoven Symphony No. 5: short-short-short-long motive (three eighths + a held note).']],
quiz:{gens:['rhythm-beats','note-value'], mcq:[{q:'How many beats does a dotted half note get in 4/4?',a:'3',o:['2','3','4','1.5'],why:'2 + half of 2 = 3.'}]}});

C({id:'meter', tier:1, area:'rhythm', title:'Meter & time signatures', pre:['rhythm'], links:['rhythm','tempo','syncopation'],
lesson:`<p>A <b>time signature</b> shows how beats group. In <b>simple meter</b> the beat divides in 2 (2/4, 3/4, 4/4: top = beats per bar, bottom = beat unit).</p>
<p>In <b>compound meter</b> the beat divides in 3: 6/8 = 2 dotted-quarter beats, 9/8 = 3, 12/8 = 4. Top number divisible by 3 (and > 3) usually means compound.</p>
<p><b>Duple</b> = 2 beats, <b>triple</b> = 3, <b>quadruple</b> = 4. <b>Asymmetric</b> meters like 5/8 or 7/8 group as 2+3, 2+2+3, etc.</p>`,
explain:{kid:'Time signature tells you how to count: 3/4 is "1-2-3, 1-2-3" like a waltz, 4/4 is "1-2-3-4".',
berklee:'6/8 vs 3/4: both 6 eighths, but 6/8 groups 3+3 (two beats), 3/4 groups 2+2+2 (three beats). Conduct it.',
jazz:'Most charts are 4/4; jazz waltzes in 3/4 ("Someday My Prince Will Come"); Dave Brubeck’s "Take Five" is in 5/4.',
phd:'Meter is a hierarchical entrainment of periodicities (London, "Hearing in Time"); the time signature is notational and may conflict with perceived meter (hemiola, metric dissonance per Krebs).',
math:'Simple meter: beat = 2 subdivisions; compound: 3. A measure is a nested hierarchy, e.g. 6/8 = 2×3, 3/4 = 3×2.'},
examples:[['Jazz','"Take Five" (Dave Brubeck Quartet, Paul Desmond) — 5/4.'],['Classical','Strauss II "The Blue Danube" — waltz in 3/4.'],['Pop','Pink Floyd "Money" — mostly 7/4.']],
quiz:{gens:['meter-type'], mcq:[{q:'How many beats per bar in 6/8 (normal tempo)?',a:'2',o:['6','3','2','4'],why:'Compound duple: 2 dotted-quarter beats.'},{q:'Which is compound triple?',a:'9/8',o:['3/4','9/8','6/8','3/8'],why:'9/8 = 3 dotted-quarter beats each divided in 3.'}]}});

C({id:'tempo', tier:1, area:'rhythm', title:'Tempo, dynamics & articulation', pre:['rhythm'], links:['meter','orchestration'],
lesson:`<p><b>Tempo</b> = speed in beats per minute (BPM). Approximate Italian terms: <b>Largo</b> (very slow, ~40–60), <b>Adagio</b> (slow, ~66–76), <b>Andante</b> (walking, ~76–108), <b>Moderato</b> (~108–120), <b>Allegro</b> (fast, ~120–156), <b>Presto</b> (very fast, ~168–200). Ranges vary by source and era. <i>Accelerando</i> = speed up, <i>ritardando</i> = slow down, <i>a tempo</i> = back to tempo.</p>
<p><b>Dynamics</b>: <i>pp</i> (pianissimo), <i>p</i>, <i>mp</i>, <i>mf</i>, <i>f</i>, <i>ff</i> (fortissimo); crescendo &lt; and decrescendo &gt;; <i>sfz</i> = sudden accent.</p>
<p><b>Articulations</b>: staccato (dot, short/detached), tenuto (line, full value), accent (&gt;, stronger attack), marcato (^, strongly accented), slur/legato (smooth), fermata (hold).</p>`,
explain:{kid:'Tempo is how fast, dynamics is how loud, articulation is how each note is attacked: short, smooth, punchy.',
berklee:'For horns, articulation markings define the band’s phrasing: "doo" (tenuto), "dit" (staccato), "dah" (accent). Mark them consistently.',
jazz:'Big-band charts use ^ for short-and-fat, > for long-accented. A trumpet section lives or dies by matching them.',
phd:'Tempo terms were character indications before Maelzel’s metronome (1815); Beethoven’s metronome marks remain debated.',
math:'BPM → seconds per beat = 60/BPM. At 120 BPM a quarter = 0.5 s, a sixteenth = 0.125 s.'},
examples:[['Classical','Ravel "Boléro" — one continuous crescendo across the whole piece.']],
quiz:{gens:['bpm'], mcq:[{q:'Which marking means "very soft"?',a:'pp',o:['ff','mf','pp','sfz'],why:'pp = pianissimo.'},{q:'Which tempo is fastest?',a:'Presto',o:['Andante','Adagio','Allegro','Presto'],why:'Presto > Allegro > Andante > Adagio.'},{q:'A dot above a notehead means…',a:'staccato (detached)',o:['staccato (detached)','hold (fermata)','accent','tenuto'],why:'Dot = staccato.'}]}});

// ================= TIER 2: INTERMEDIATE =================
C({id:'intervals', tier:2, area:'intervals', title:'Intervals', pre:['accidentals'], links:['triads','consonance','acoustics','interval-ear','counterpoint-species'],
lesson:`<p>An <b>interval</b> has a <b>number</b> (count letter names, inclusive: C–E = 3rd) and a <b>quality</b>.</p>
<p><b>Perfect family</b> (unison, 4th, 5th, octave): perfect, augmented (+1 semitone), diminished (−1). <b>Major family</b> (2nd, 3rd, 6th, 7th): major, minor (−1), augmented (+1 from major), diminished (−1 from minor).</p>
<p>Semitones: m2 1, M2 2, m3 3, M3 4, P4 5, A4/d5 6 (tritone), P5 7, m6 8, M6 9, m7 10, M7 11, P8 12.</p>
<p><b>Inversion</b>: numbers sum to 9 and quality flips (M↔m, A↔d, P stays P): M3 ↔ m6, P4 ↔ P5.</p>
<p>Trick: for a lower note's major scale, the upper note in that scale is major/perfect.</p>`,
ex:[{clef:'treble', ev:'C4+D4:M2 C4+E4:M3 C4+F4:P4 C4+F#4:A4 C4+G4:P5 C4+A4:M6 C4+B4:M7 C4+C5:P8', cap:'Intervals above C4'}],
explain:{kid:'An interval is the distance between two notes. Count the letters (C-D-E = 3), then check if it is the big or small version.',
berklee:'Always count letters first, then semitones. F–B is an A4, F–C♭ is a d5 — same sound, different function.',
jazz:'Guide tones are the 3rd and 7th. Tritone between them in a dominant 7th (B–F in G7) is the engine of V7 → I.',
phd:'Interval as a directed distance between spelled pitches: an element of Z7×Z (generic, specific); its 12-TET image is an interval class mod 12 (ic 0–6 after inversion).',
math:'Semitone size s; interval class ic = min(s mod 12, 12 − s mod 12). Just ratios: P8 2/1, P5 3/2, P4 4/3, M3 5/4, m3 6/5.'},
examples:[['Film','"Star Wars" main title: opening leap of a perfect 5th.'],['Musical','"Maria" (West Side Story): tritone + half step.'],['Song','"Here Comes the Bride": perfect 4th.'],['Song','"My Bonnie Lies Over the Ocean": major 6th.']],
quiz:{gens:['interval-id','interval-build','interval-semis','interval-invert'], mcq:[]}});

C({id:'triads', tier:2, area:'chords', title:'Triads', pre:['intervals'], links:['inversions','sevenths','roman','functions','neo-riemannian'],
lesson:`<p>A <b>triad</b> is a root plus a 3rd and a 5th above it, stacked in thirds.</p>
<ul><li><b>Major</b>: M3 + m3 (root–5th = P5), e.g. C E G</li><li><b>Minor</b>: m3 + M3 (P5), e.g. C E♭ G</li><li><b>Diminished</b>: m3 + m3 (d5), e.g. C E♭ G♭</li><li><b>Augmented</b>: M3 + M3 (A5), e.g. C E G♯</li></ul>
<p>In a major key, triads on the scale degrees are: I ii iii IV V vi vii°.</p>`,
ex:[{clef:'treble', ev:'C4+E4+G4:C C4+Eb4+G4:Cm C4+Eb4+Gb4:C° C4+E4+G#4:C+', cap:'Four triad qualities on C'}],
explain:{kid:'Stack three notes skipping one letter each time (C-E-G). Major sounds happy, minor sounds sad, diminished sounds tense, augmented sounds dreamy.',
berklee:'Know all 48 triads (12 roots × 4 qualities) on sight. Spell with letters skipping: root, 3rd, 5th always use alternate letters.',
jazz:'Triads are the building blocks of upper-structure voicings: a D triad over C7 gives you 9, ♯11, 13.',
phd:'Major and minor triads are the 24 consonant triads, the elements of set class 3-11 (037); P, L, R act on them as a dihedral group of order 24.',
math:'Major triad pcs {r, r+4, r+7}; minor {r, r+3, r+7}; inversion I maps one to the other: −{0,4,7} = {0,5,8} = T5 of {0,3,7}.'},
examples:[['Classical','Bach Prelude in C BWV 846 opens with an arpeggiated C major triad.']],
quiz:{gens:['triad-id','triad-spell'], mcq:[]}});

C({id:'sevenths', tier:2, area:'chords', title:'Seventh chords & extensions', pre:['triads'], links:['dominant7','jazz-voicings','roman','upper-structures'],
lesson:`<p>Add a 7th above the root:</p><ul><li><b>maj7</b> (major triad + M7): C E G B</li><li><b>dominant 7</b> (major triad + m7): C E G B♭</li><li><b>m7</b> (minor triad + m7): C E♭ G B♭</li><li><b>ø7 half-diminished</b> (dim triad + m7): C E♭ G♭ B♭</li><li><b>°7 fully diminished</b> (dim triad + d7): C E♭ G♭ B𝄫</li></ul>
<p><b>Extensions</b> continue stacking thirds: 9, 11, 13 (an octave above 2, 4, 6). Altered tensions: ♭9, ♯9, ♯11, ♭13.</p>`,
ex:[{clef:'treble', ev:'C4+E4+G4+B4:Cmaj7 C4+E4+G4+Bb4:C7 C4+Eb4+G4+Bb4:Cm7 C4+Eb4+Gb4+Bb4:Cø7 C4+Eb4+Gb4+Bbb4:C°7', cap:'Seventh chord qualities on C'}],
explain:{kid:'Add one more skipped note on top of a triad and you get a seventh chord. It sounds richer, jazzier.',
berklee:'Diatonic 7ths in major: Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7. In harmonic minor: V7 and vii°7.',
jazz:'Rootless voicings (3-5-7-9 or 7-9-3-5, "A/B voicings") drop the root since the bass has it.',
phd:'The °7 chord (set class 4-28, 0369) is symmetrical: it maps to itself under T3, so it has only 3 distinct transpositions — a source of enharmonic modulation.',
math:'dom7 = {0,4,7,10}; ø7 = {0,3,6,10}; both are 4-27 (0258) — inversions of each other.'},
examples:[['Opera','Wagner "Tristan und Isolde": the "Tristan chord" F–B–D♯–G♯ sounds like a half-diminished seventh.']],
quiz:{gens:['seventh-id','seventh-spell'], mcq:[]}});

C({id:'inversions', tier:2, area:'chords', title:'Inversions & figured bass', pre:['triads','sevenths'], links:['voice-leading','roman','counterpoint-species'],
lesson:`<p>The <b>inversion</b> depends on which chord tone is in the bass.</p>
<ul><li>Root position: triad 5/3 (no figure), seventh <b>7</b></li><li>1st inversion (3rd in bass): <b>6</b> (6/3) | seventh <b>6/5</b></li><li>2nd inversion (5th in bass): <b>6/4</b> | seventh <b>4/3</b></li><li>3rd inversion (7th in bass): seventh <b>4/2</b> (or 2)</li></ul>
<p>Figures are intervals above the bass. Cadential 6/4 (I6/4 → V) is really a decorated V.</p>`,
ex:[{clef:'bass', ev:'C3+E3+G3:I E3+G3+C4:I6 G3+C4+E4:I6/4', cap:'C major: root, 1st and 2nd inversion'}],
explain:{kid:'Same chord, different note at the bottom. The bottom note changes how sturdy the chord sounds.',
berklee:'Use first inversion to make the bass smoother (I – V6 – vi). Avoid random 6/4s; use them as cadential, passing, or pedal 6/4.',
jazz:'Slash chords: C/E = C first inversion. "Bass line first, chords second."',
phd:'Figured bass is a thoroughbass practice (c. 1600–1800); the inversion concept (Rameau, Traité de l’harmonie, 1722) introduced the fundamental bass.',
math:'Inversion is a rotation of the ordered stack: (r,3,5) → (3,5,r) → (5,r,3).'},
examples:[['Baroque','Continuo parts in Bach cantatas are written as figured bass.']],
quiz:{gens:['inversion-id'], mcq:[]}});

C({id:'major-scale', tier:2, area:'keys', title:'Major & minor scales', pre:['piano-layout','accidentals'], links:['keysigs','modes','harmonic-minor','triads'],
lesson:`<p><b>Major</b>: W W H W W W H (C D E F G A B C).</p><p><b>Natural minor</b>: W H W W H W W (A B C D E F G A).</p>
<p><b>Harmonic minor</b> raises 7̂ to make a leading tone (A minor: G♯), creating an augmented 2nd between 6̂ and 7̂.</p>
<p><b>Melodic minor</b> raises 6̂ and 7̂ ascending; in classical practice it descends as natural minor. Jazz "melodic minor" uses the ascending form both ways.</p>
<p>Scale degrees: 1̂ tonic, 2̂ supertonic, 3̂ mediant, 4̂ subdominant, 5̂ dominant, 6̂ submediant, 7̂ leading tone (subtonic if a whole step below tonic).</p>`,
ex:[{clef:'treble', ev:'A4 B4 C5 D5 E5 F5 G#5 A5', cap:'A harmonic minor'},{clef:'treble', ev:'A4 B4 C5 D5 E5 F#5 G#5 A5', cap:'A melodic minor (ascending)'}],
explain:{kid:'A scale is a ladder of notes from one note to the same note an octave up. Major has the bright pattern, minor the darker one.',
berklee:'Harmonic minor exists for harmony (V and vii° with a leading tone); melodic minor exists for smooth melodies around 6̂–7̂.',
jazz:'Melodic minor is the mother of jazz scales: its modes give Lydian dominant (4th mode) and altered (7th mode).',
phd:'Major/minor emerged from the modal system c. 1600–1700; the minor mode’s variable 6̂/7̂ reflects its dual melodic and harmonic demands.',
math:'Major = pcs {0,2,4,5,7,9,11}, the diatonic set 7-35 (013568T); harmonic minor = 7-32; melodic minor = 7-34.'},
examples:[['Game','The Tetris theme ("Korobeiniki", Russian folk song) is in a minor key.']],
quiz:{gens:['scale-spell','scale-id','scale-degree'], mcq:[]}});

C({id:'keysigs', tier:2, area:'keys', title:'Key signatures & the circle of fifths', pre:['major-scale'], links:['modulation','relative-parallel','key-finding'],
lesson:`<p>Sharps in order: <b>F C G D A E B</b>. Flats: <b>B E A D G C F</b>.</p>
<p>Sharp keys: the major key is a half step above the last sharp (F♯ C♯ → D major). Flat keys: the major key is the second-to-last flat (B♭ E♭ A♭ → E♭ major); one flat = F major.</p>
<p>Circle of fifths: each step clockwise adds a sharp (C G D A E B F♯ C♯); counter-clockwise adds a flat (C F B♭ E♭ A♭ D♭ G♭ C♭).</p>
<p><b>Relative</b> minor shares the signature, a m3 below (C ↔ A minor). <b>Parallel</b> minor shares the tonic (C major ↔ C minor, 3 flats).</p>`,
explain:{kid:'The key signature is a shortcut at the start of the music: "every F is F-sharp in this song."',
berklee:'Know all 15 major and 15 minor signatures instantly. Neighbors on the circle are closely related keys (differ by one accidental).',
jazz:'Tunes cycle through keys in fourths (counter-clockwise): ii–V–I chains walk the circle.',
phd:'Key distance as circle-of-fifths distance underlies Weber’s and Schoenberg’s regional charts and Lerdahl’s Tonal Pitch Space.',
math:'Key with k sharps (negative = flats) has tonic pc 7k mod 12. The circle is Z12 generated by 7 (since gcd(7,12)=1).'},
examples:[['Trumpet','Concert B♭ for a band = written C on B♭ trumpet; concert E♭ = written F.']],
quiz:{gens:['keysig-id','keysig-count','relative-key'], mcq:[]}});

C({id:'modes', tier:2, area:'keys', title:'Church modes', pre:['major-scale'], links:['jazz-scales','modal-mixture','mode-ear'],
lesson:`<p>Modes are rotations of the major scale (white keys starting on each note):</p>
<ul><li><b>Ionian</b> (C) = major</li><li><b>Dorian</b> (D): minor with ♮6</li><li><b>Phrygian</b> (E): minor with ♭2</li><li><b>Lydian</b> (F): major with ♯4</li><li><b>Mixolydian</b> (G): major with ♭7</li><li><b>Aeolian</b> (A) = natural minor</li><li><b>Locrian</b> (B): ♭2 and ♭5 (diminished tonic, rare as a key)</li></ul>
<p>Bright→dark order: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian.</p>`,
ex:[{clef:'treble', ev:'D4 E4 F4 G4 A4 B4 C5 D5', cap:'D Dorian (white keys from D)'},{clef:'treble', ev:'F4 G4 A4 B4 C5 D5 E5 F5', cap:'F Lydian'}],
explain:{kid:'Play only white keys but start on a different note — each starting note gives the music a different flavor.',
berklee:'Think of each mode relative to its parallel major/minor with one "characteristic note": Dorian ♮6, Lydian ♯4, Mixolydian ♭7, Phrygian ♭2.',
jazz:'Over m7 play Dorian, over maj7♯11 Lydian, over 7 (sus) Mixolydian. Modal jazz: "So What" vamps D Dorian then E♭ Dorian.',
phd:'Medieval modes were defined by final and range (authentic/plagal; Glarean’s Dodecachordon, 1547, added Ionian and Aeolian); the modern "rotation" model is a later simplification.',
math:'Modes are the 7 rotations of the diatonic step sequence (2,2,1,2,2,2,1). Brightness rank = sum of pcs above the tonic.'},
examples:[['Jazz','Miles Davis "So What" — Dorian.'],['TV','"The Simpsons" theme (Danny Elfman) — Lydian.'],['Rock','The Beatles "Norwegian Wood" — Mixolydian.'],['Latin','Santana "Oye Como Va" — Dorian vamp.'],['Folk','"Scarborough Fair" — Dorian.']],
quiz:{gens:['mode-id','mode-parent'], mcq:[]}});

C({id:'pentatonic', tier:2, area:'keys', title:'Pentatonic & blues scales', pre:['major-scale'], links:['blues','modes','jazz-scales'],
lesson:`<p><b>Major pentatonic</b>: 1 2 3 5 6 (C D E G A) — no half steps. <b>Minor pentatonic</b>: 1 ♭3 4 5 ♭7 (A C D E G) — its relative.</p>
<p><b>Blues scale</b> adds the ♭5 "blue note" to minor pentatonic: A C D E♭ E G (often spelled D♯).</p>
<p>The <b>12-bar blues</b> in C: C7 C7 C7 C7 | F7 F7 C7 C7 | G7 F7 C7 G7 (I-IV-V with dominant 7ths everywhere).</p>`,
ex:[{clef:'treble', ev:'C4 D4 E4 G4 A4 C5', cap:'C major pentatonic'},{clef:'treble', ev:'A4 C5 D5 D#5 E5 G5 A5', cap:'A blues scale'}],
explain:{kid:'Pentatonic = 5 notes, and it is hard to sound wrong with it. Black keys alone make a pentatonic scale!',
berklee:'Minor pentatonic over a whole blues is the starting point; then target chord tones (the 3rd of each chord).',
jazz:'Blues in jazz adds ii–Vs: Charlie Parker’s "Blues for Alice" reharmonizes the 12-bar form with descending ii–Vs.',
phd:'Pentatonic collections are found across many traditions; the anhemitonic pentatonic is the maximally even 5-note subset of Z12 (5-35).',
math:'Major pentatonic = {0,2,4,7,9}, generated by stacking four perfect fifths: C-G-D-A-E.'},
examples:[['Folk','"Amazing Grace" melody — major pentatonic.'],['Rock','Chuck Berry "Johnny B. Goode" — 12-bar blues.'],['Jazz','Charlie Parker "Billie\'s Bounce" and "Now\'s the Time" — F blues.']],
quiz:{gens:['scale-spell-penta'], mcq:[{q:'What note turns A minor pentatonic into A blues?',a:'E♭ (D♯)',o:['B','F','E♭ (D♯)','G♯'],why:'The blue note is ♭5.'},{q:'Bar 5 of a 12-bar blues in G is…',a:'C7',o:['G7','C7','D7','Am7'],why:'Bars 5–6 = IV.'}]}});

C({id:'roman', tier:2, area:'harmony', title:'Roman numeral analysis', pre:['triads','keysigs'], links:['functions','secondary','cadences','analysis'],
lesson:`<p>Roman numerals name chords by scale degree: uppercase = major, lowercase = minor, ° = diminished, + = augmented.</p>
<p><b>Major key</b>: I ii iii IV V vi vii°. Sevenths: Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7.</p>
<p><b>Minor key</b> (harmonic minor for V and vii°): i ii° III iv V VI vii°. Sevenths: i7 iiø7 IIImaj7 iv7 V7 VImaj7 vii°7.</p>
<p>Add inversion figures: V6/5, ii6, I6/4.</p>`,
ex:[{clef:'treble', ks:0, ev:'C4+E4+G4:I F4+A4+C5:IV G4+B4+D5:V A4+C5+E5:vi D4+F4+A4:ii', cap:'C major'}],
explain:{kid:'Roman numerals are chord nicknames by position: chord 1, chord 4, chord 5. Then any song can be moved to any key.',
berklee:'Analyze in two layers: key and numeral, then function (T/PD/D). Mark cadences.',
jazz:'Jazz uses the same idea with symbols: ii–V–I = Dm7–G7–Cmaj7 in C. Nashville numbers are the same thing with Arabic numerals.',
phd:'Roman numeral analysis (Weber 1817–21; Vogler) presupposes a stable key and chord-root theory; critiques focus on its reductive treatment of contrapuntal sonorities.',
math:'A numeral is a map degree → chord via the scale; transposition-invariant: relabeling the tonic changes no numerals.'},
examples:[['Pop','"Let It Be" (Beatles): I–V–vi–IV (C–G–Am–F).'],['Rock','"Don\'t Stop Believin\'" (Journey): I–V–vi–IV in E.'],['Baroque','Pachelbel Canon: I–V–vi–iii–IV–I–IV–V.']],
quiz:{gens:['roman-id','roman-spell'], mcq:[]}});

C({id:'functions', tier:2, area:'harmony', title:'Harmonic function: T, PD, D', pre:['roman'], links:['cadences','secondary','dominant7','negative-harmony'],
lesson:`<p>Chords group into functions:</p><ul><li><b>Tonic (T)</b>: I (also vi, iii) — stability, home.</li><li><b>Predominant (PD)</b>: IV, ii (ii6 especially) — moves away, prepares D.</li><li><b>Dominant (D)</b>: V, V7, vii° — tension that wants to resolve to I.</li></ul>
<p>Typical phrase: T → PD → D → T. Retrogressions (V → IV) are less common in common-practice style (but normal in rock).</p>
<p>V7 → I: the leading tone (7̂) rises to 1̂, the chord 7th (4̂) falls to 3̂ — the tritone resolves.</p>`,
explain:{kid:'Home → leave home → get really excited to come back → home again.',
berklee:'Write progressions as T–PD–D–T and you’ll rarely go wrong. vi can substitute for I (deceptive cadence V–vi).',
jazz:'ii–V–I is PD–D–T. Tritone substitution keeps the D function (same tritone).',
phd:'Function theory (Riemann, "Vereinfachte Harmonielehre", 1893) reduces chords to T, S, D; American pedagogy uses PD for S. Riemann derived function from harmonic dualism.',
math:'Functions are equivalence classes of chords sharing common tones: ii and IV share 2 tones, so they substitute.'},
examples:[['Classical','Beethoven Symphony No. 5 ends with long stretches alternating V and I.']],
quiz:{gens:['function-id'], mcq:[]}});

C({id:'dominant7', tier:2, area:'harmony', title:'The dominant seventh', pre:['sevenths','functions'], links:['secondary','tritone-sub','blues','voice-leading','acoustics','altered-scale'],
lesson:`<p><b>V7</b> = major triad + minor 7th on 5̂ (G B D F in C). It contains a <b>tritone</b> (B–F) between the leading tone and 4̂.</p>
<p>Resolution: 7̂ → 1̂ (up a half step), 4̂ → 3̂ (down a half step). In 4 parts, V7 → I often leaves the tonic triad incomplete (no 5th) if both chords are complete-voiced in root position.</p>
<p>The dominant 7th also appears as a <b>secondary dominant</b>, as the color chord of the <b>blues</b>, and is the target of <b>tritone substitution</b> in jazz.</p>`,
ex:[{clef:'treble', ev:'G4+B4+D5+F5:V7 G4+C5+E5+E5:I', cap:'V7 → I: B→C, F→E'}],
explain:{kid:'The dominant seventh is the "almost home!" chord. It really wants to go to the home chord.',
berklee:'Resolve the tritone inward (B–F → C–E) or outward (F–B → E–C). Never double the leading tone.',
jazz:'In bebop, the dominant is the playground: altered tensions (♭9 ♯9 ♯11 ♭13), Charlie Parker’s lines outline them.',
phd:'The tritone’s instability and the dominant’s acoustic resemblance to harmonics 4:5:6:7 (with the "natural seventh" much flatter than ET m7) are two different historical justifications.',
math:'Dom7 = {0,4,7,10}; harmonics 4:5:6:7 of G give G B D and a 7th about 31 cents flatter than ET F.'},
examples:[['Classical','Bach Prelude in C BWV 846 uses V7 chords leading back to C at its close.'],['Jazz','Charlie Parker blues heads (e.g. "Now\'s the Time") are built on dominant 7th harmony.'],['Rock','12-bar blues uses dominant 7ths on I, IV and V.']],
quiz:{gens:['dom7-of','tritone-of'], mcq:[{q:'In V7 → I in C major, where does F go?',a:'Down to E',o:['Up to G','Down to E','Stays','Up to F♯'],why:'The chord seventh resolves down by step.'}]}});

C({id:'secondary', tier:2, area:'harmony', title:'Secondary dominants & tonicization', pre:['dominant7','roman'], links:['modulation','chromaticism','tritone-sub'],
lesson:`<p>A <b>secondary dominant</b> is the V (or V7) of a chord other than I: <b>V/V</b>, <b>V/ii</b>, <b>V/IV</b>, <b>V/vi</b>, etc. It briefly <b>tonicizes</b> its target.</p>
<p>To build V/x: go up a P5 from x’s root (or down a P4) and make a major triad / dominant 7th. In C: V/V = D(7), V/ii = A(7), V/vi = E(7), V/IV = C7.</p>
<p>Secondary leading-tone chords: vii°/x (vii°7/V in C = F♯ A C E♭).</p>`,
ex:[{clef:'treble', ev:'C4+E4+G4:I D4+F#4+A4+C5:V7/V G4+B4+D5:V C4+E4+G4:I', cap:'C: I – V7/V – V – I'}],
explain:{kid:'Any chord can have its own "almost home" chord that points to it.',
berklee:'Spot the accidental: a raised note that resolves up by half step is likely a secondary leading tone.',
jazz:'"Take the A Train": the D7 in bar 3 is V/V (II7) in C. Chains of secondary dominants = "dominant cycles".',
phd:'Tonicization vs modulation is a continuum (Schenker’s "Tonikalisierung"); the distinction depends on cadential confirmation and duration.',
math:'V/x root = root(x) + 7 mod 12.'},
examples:[['Jazz','Duke Ellington/Billy Strayhorn "Take the A Train" — D7 (V/V) in C.'],['Pop','"Yesterday" (Beatles) includes secondary dominant motion toward vi.']],
quiz:{gens:['secondary-spell'], mcq:[]}});

C({id:'modal-mixture', tier:2, area:'harmony', title:'Modal mixture (borrowed chords)', pre:['functions','modes'], links:['chromaticism','neapolitan','negative-harmony'],
lesson:`<p><b>Modal mixture</b> borrows chords from the parallel mode, usually minor into major: <b>iv</b>, <b>ii°</b>, <b>iiø7</b>, <b>♭VI</b>, <b>♭III</b>, <b>♭VII</b>, <b>vii°7</b>.</p>
<p>In C major: iv = F A♭ C, ♭VI = A♭ C E♭, ♭VII = B♭ D F. The borrowed 6̂ (A♭) tends to fall to 5̂.</p>
<p>The <b>Picardy third</b> is the reverse: ending a minor piece on a major tonic.</p>`,
ex:[{clef:'treble', ev:'C4+E4+G4:I F4+Ab4+C5:iv C4+E4+G4:I', cap:'Borrowed iv in C major'}],
explain:{kid:'Borrowing a sad chord from the minor key for a moment inside a happy song.',
berklee:'iv in major is the classic "bittersweet" move. ♭VI–♭VII–I is the "Mario cadence" heard in many games and rock songs.',
jazz:'Minor iv (Fm6, B♭7 = "backdoor" ♭VII7) resolves to I by voice leading: A♭ → G.',
phd:'Mixture blurs the major/minor dichotomy; Schenkerian theory treats it as inflection of the same tonal space (Mischung).',
math:'Mixture swaps scale degrees {4,9,11}↔{3,8,10} on degrees 3̂, 6̂, 7̂.'},
examples:[['Rock','Radiohead "Creep": G–B–C–Cm (I–III–IV–iv).'],['Baroque','Bach minor-key chorales often end with a Picardy third.']],
quiz:{gens:['borrowed-id'], mcq:[]}});

C({id:'chromaticism', tier:2, area:'harmony', title:'Chromatic harmony: N6, augmented 6ths, mediants', pre:['secondary','modal-mixture'], links:['neo-riemannian','modulation','tristan'],
lesson:`<p><b>Neapolitan (N6)</b>: major triad on ♭2̂, usually in 1st inversion, a predominant. In C minor: D♭ F A♭ (F in bass).</p>
<p><b>Augmented sixth chords</b> (predominants): ♭6̂ in bass and ♯4̂ above form an A6 that expands outward to the octave on 5̂. In C: <b>It+6</b> A♭ C F♯; <b>Fr+6</b> A♭ C D F♯; <b>Ger+6</b> A♭ C E♭ F♯.</p>
<p><b>Chromatic mediants</b>: chords a third away with a chromatic note (C → E, C → A♭), common in Romantic and film music.</p>`,
ex:[{clef:'treble', ev:'F4+Ab4+Db5:N6 G4+B4+D5:V C4+Eb4+G4:i', cap:'C minor: N6 → V → i'},{clef:'treble', ev:'Ab3+C4+Eb4+F#4:Ger+6 G3+B3+D4+G4:V', cap:'German augmented sixth → V'}],
explain:{kid:'Spicy chords borrowed from far away that make the return home feel extra dramatic.',
berklee:'Augmented sixths are predominants; avoid the parallel 5ths of Ger+6 → V by going through I6/4 or using It/Fr.',
jazz:'The Ger+6 is enharmonically a dominant 7th (A♭7) — the jazz tritone sub of V/V.',
phd:'Augmented sixths arise from voice leading (chromatic passing to 5̂), not root progression; their naming by nationality is 19th-c. and arbitrary.',
math:'Ger+6 {8,0,3,6} = A♭7 as pc set 4-27; It+6 {8,0,6} ⊂ it; Fr+6 {8,0,2,6} = 4-25 (0268), whole-tone-ish.'},
examples:[['Classical','Beethoven "Moonlight" Sonata, 1st mvt — Neapolitan harmony early on.'],['Film','Chromatic mediants are a signature of Hollywood scores (Lehman, "Hollywood Harmony", 2018).']],
quiz:{gens:['n6-spell','aug6-id'], mcq:[]}});

C({id:'cadences', tier:2, area:'harmony', title:'Cadences', pre:['functions'], links:['form-phrase','cadence-ear','roman'],
lesson:`<ul><li><b>Perfect authentic (PAC)</b>: V–I, both root position, 1̂ in the soprano.</li><li><b>Imperfect authentic (IAC)</b>: V–I with 3̂/5̂ in soprano or an inversion.</li><li><b>Half cadence (HC)</b>: ends on V.</li><li><b>Plagal (PC)</b>: IV–I ("Amen").</li><li><b>Deceptive (DC)</b>: V–vi.</li><li><b>Phrygian half cadence</b>: iv6–V in minor.</li></ul>`,
ex:[{clef:'treble', ev:'G4+B4+D5:V C4+E4+C5:I F4+A4+C5:IV C4+E4+G4:I', cap:'Authentic then plagal'}],
explain:{kid:'Cadences are musical punctuation: a period (PAC), a comma (half cadence), a surprise (deceptive).',
berklee:'Phrases end with cadences; a period = antecedent (HC) + consequent (PAC).',
jazz:'ii–V–I is the jazz PAC; turnarounds (I–vi–ii–V) delay it.',
phd:'Caplin’s "Classical Form" (1998) treats cadence as formal function, distinguishing true cadences from "cadential" progressions.',
math:'Cadence = terminal 2-chord pattern; classification by bass motion and soprano scale degree.'},
examples:[['Sacred','Hymn "Amen" endings — plagal IV–I.']],
quiz:{gens:['cadence-id'], mcq:[]}});

C({id:'voice-leading', tier:2, area:'harmony', title:'Voice leading (SATB rules)', pre:['inversions','functions'], links:['counterpoint-species','checker','dominant7'],
lesson:`<p>Four voices: Soprano (C4–G5), Alto (G3–D5), Tenor (C3–G4), Bass (E2–C4) — typical textbook ranges.</p>
<ul><li>No <b>parallel 5ths or octaves</b> (two voices moving in the same direction keeping a P5/P8).</li><li>Avoid <b>hidden (direct) 5ths/8ves</b> in the outer voices when the soprano leaps.</li><li>Spacing: ≤ an octave between S–A and A–T; T–B can be wider.</li><li>No <b>voice crossing</b> or overlap.</li><li><b>Leading tone</b> resolves up to 1̂ (in an outer voice); <b>chordal 7ths</b> resolve down by step.</li><li>Don’t double the leading tone; prefer doubling the root.</li><li>Keep common tones; move other voices by step.</li></ul>`,
explain:{kid:'Each singer gets their own path. Good voice leading means everyone takes small, smooth steps and nobody copies someone else exactly.',
berklee:'Write the bass first, then soprano (contrary motion against the bass), then fill alto and tenor with common tones and steps.',
jazz:'Guide-tone lines: 7th of one chord moves by half step to the 3rd of the next (F of G7 → E of Cmaj7).',
phd:'Tymoczko (A Geometry of Music, 2011) models voice leadings as paths in orbifold chord spaces; efficient voice leading explains why near-even chords connect smoothly.',
math:'Voice-leading size = Σ|Δ semitones| per voice; parallel perfect intervals = consecutive equal interval classes 0 or 7 with same-direction motion.'},
examples:[['Baroque','Bach’s 371 chorales are the classic voice-leading models.']],
quiz:{gens:['vl-error'], mcq:[{q:'Soprano C5→D5 while Bass F3→G3 (both up a step). What error?',a:'Parallel fifths (compound 12ths)',o:['No error','Voice crossing','Parallel fifths (compound 12ths)','Hidden octaves'],why:'F3–C5 and G3–D5 are both compound perfect 5ths moving the same direction.'}]}});
