// Cadence · Lesson text, part 2: Intervals, Chords, Progressions & Voicing, Advanced (original writing).
(() => {
  const X=(id,cfg)=>{ const e=MT.EX[id]; if(!e) return '#mt'; const code=MT.encode(e,Object.assign(MT.defaults(e),cfg||{})); return '#ex/'+id+(code?'/'+code:''); };
  addLessons('Intervals', [
    {id:'ivgen', t:'Generic intervals', d:'counting letters', x:[[X('intervalid',{ivs:['m2','M2','m3','M3','P4','P5','m6','M6','m7','M7','P8'],rootAcc:false}),'Interval ID (no accidentals)']], p:[
      ['An <b>interval</b> is the distance between two notes. Played one after the other it’s <b>melodic</b>; together it’s <b>harmonic</b>.', 'treble;0;C4 E4 C4+E4'],
      ['The <b>number</b> comes from counting letter names, including both ends: C up to E is C-D-E = a <b>3rd</b>. C to C is a unison (1st); C to the next C is an octave (8th).', 'treble;0;C4+D4:2nd C4+E4:3rd C4+F4:4th C4+G4:5th C4+A4:6th C4+B4:7th C4+C5:8ve;w=46'],
      ['On the staff: line-to-next-space is a 2nd, line-to-next-line is a 3rd. Odd numbers (3, 5, 7) are both on lines or both in spaces; even ones (2, 4, 6) mix a line and a space. Accidentals never change the number — C to E♭ and C to E♯ are both 3rds.', 'treble;0;C4+Eb4 C4+E4 C4+E#4'],
    ]},
    {id:'ivspec', t:'Interval quality', d:'perfect, major, minor, augmented, diminished', x:[[X('intervalid'),'Interval ID'],[X('earinterval',{ivs:[1,2,3,4,5,7,12]}),'Interval ear training']], p:[
      ['Unisons, 4ths, 5ths and octaves are <b>perfect</b> (P). 2nds, 3rds, 6ths and 7ths are <b>major</b> (M) or <b>minor</b> (m). Measure from the lower note’s major scale: if the top note is in that scale, the interval is major or perfect.', 'treble;0;C4+D4:M2 C4+E4:M3 C4+F4:P4 C4+G4:P5 C4+A4:M6 C4+B4:M7 C4+C5:P8;w=46'],
      ['A minor interval is a half step smaller than major: C–E♭ is a minor 3rd (3 half steps), C–E a major 3rd (4).', 'treble;0;C4+Eb4:m3 C4+E4:M3 | A4+F5:m6 A4+F#5:M6'],
      ['One half step larger than major or perfect is <b>augmented</b> (A); one smaller than minor or perfect is <b>diminished</b> (d). F–B is an augmented 4th, B–F a diminished 5th — both six half steps, the <b>tritone</b>.', 'treble;0;F4+B4:A4 B4+F5:d5 | C4+G#4:A5 C#4+Bb4:d7'],
      ['Half-step counts: m2 1 · M2 2 · m3 3 · M3 4 · P4 5 · A4/d5 6 · P5 7 · m6 8 · M6 9 · m7 10 · M7 11 · P8 12. But the spelling decides the name: C–G♯ (A5) and C–A♭ (m6) are both 8 half steps.', 'treble;0;C4+G#4:A5 C4+Ab4:m6'],
    ]},
    {id:'ivwrite', t:'Writing intervals', d:'number first, then quality', x:[[X('intervalconst'),'Interval construction']], p:[
      ['To write a major 6th above E♭: first the <b>number</b> — count up six letters (E F G A B C) → some kind of C. Then the <b>quality</b>: E♭ major has C natural, so the answer is C.', 'treble;0;Eb4 C5:M6'],
      ['A minor 3rd above F♯: three letters up is A. F♯ to A is three half steps (F♯–G–G♯–A), exactly a minor 3rd, so the answer is A natural. Never change the letter to fix the quality — change the accidental.', 'treble;0;F#4 A4:m3'],
      ['Writing below works the same in reverse: a perfect 5th below D is G (D C B A G), and D down to G natural is 7 half steps — perfect.', 'treble;0;D5 G4:P5_below'],
    ]},
    {id:'ivinv', t:'Interval inversion', d:'flipping intervals', p:[
      ['<b>Inverting</b> an interval moves the lower note up an octave (or the upper note down). C up to E becomes E up to C.', 'treble;0;C4+E4:M3 E4+C5:m6'],
      ['The numbers always add to <b>9</b> (3 ↔ 6, 2 ↔ 7, 4 ↔ 5, 1 ↔ 8). Qualities flip: major ↔ minor, augmented ↔ diminished, perfect stays perfect.', 'treble;0;D4+F#4:M3 F#4+D5:m6 | F4+B4:A4 B4+F5:d5'],
      ['Handy trick: a 6th above is a 3rd below with the flipped quality. A major 6th above G = a minor 3rd below G, up an octave: E.', 'treble;0;G4+E5:M6 E4+G4:m3'],
    ]},
    {id:'ivcomp', t:'Compound intervals', d:'beyond the octave', x:[[X('intervalid',{compound:true}),'Interval ID with compound intervals']], p:[
      ['Intervals larger than an octave are <b>compound</b>. Subtract 7 to find the simple interval: a 9th is an octave + a 2nd, a 10th is an octave + a 3rd.', 'treble;0;C4+D5:M9 C4+E5:M10 C4+F5:P11 C4+G5:P12'],
      ['Quality carries over: C up to E♭5 is a minor 10th because C–E♭ is a minor 3rd. 9ths, 11ths and 13ths are the names you’ll see in jazz chord symbols.', 'treble;0;C4+Eb5:m10 C4+A5:M13'],
    ]},
  ]);
  addLessons('Chords', [
    {id:'triads', t:'Triads', d:'major, minor, diminished, augmented', x:[[X('chordid',{invs:[0],askInv:false}),'Chord ID (root position)'],[X('earchord'),'Chord ear training']], p:[
      ['A <b>triad</b> is three notes stacked in 3rds: <b>root, third, fifth</b>. On the staff a root-position triad is line-line-line or space-space-space.', 'treble;0;C4+E4+G4:C F4+A4+C5:F G4+B4+D5:G'],
      ['<b>Major</b> = major 3rd + minor 3rd (root to 5th is a P5). <b>Minor</b> = minor 3rd + major 3rd (also a P5).', 'treble;0;C4+E4+G4:C C4+Eb4+G4:Cm'],
      ['<b>Diminished</b> = two minor 3rds (a d5 from root to 5th). <b>Augmented</b> = two major 3rds (an A5).', 'treble;0;B4+D5+F5:B° C4+E4+G#4:C+'],
      ['Chord symbols: C, Cm (or C−), C° (Cdim), C+ (Caug). Quality is about intervals, so spelling matters: E–G♯–B is E major, never E–A♭–B.', 'treble;0;E4+G#4+B4:E Ab4+C5+Eb5:A♭ D4+F4+Ab4:D°'],
    ]},
    {id:'sevenths', t:'Seventh chords', d:'five common types', x:[[X('chordid',{types:['maj7','dom7','min7','hdim7','dim7'],invs:[0],askInv:false}),'Seventh chord ID']], p:[
      ['Add another 3rd to a triad and you get a <b>seventh chord</b>: root, 3rd, 5th, 7th.', 'treble;0;C4+E4+G4+B4:Cmaj7'],
      ['<b>Major 7th</b> (maj7): major triad + M7. <b>Dominant 7th</b> (7): major triad + m7 — the V7 chord. <b>Minor 7th</b> (m7): minor triad + m7.', 'treble;0;C4+E4+G4+B4:Cmaj7 C4+E4+G4+Bb4:C7 C4+Eb4+G4+Bb4:Cm7;w=60'],
      ['<b>Half-diminished</b> (ø7, m7♭5): diminished triad + m7. <b>Fully diminished</b> (°7): diminished triad + d7 — all minor 3rds.', 'treble;0;B4+D5+F5+A5:Bø7 B4+D5+F5+Ab5:B°7;w=60'],
    ]},
    {id:'inversions', t:'Inversions', d:'which note is in the bass', x:[[X('chordid',{invs:[0,1,2]}),'Chord ID with inversions']], p:[
      ['A chord is in <b>root position</b> when the root is the lowest note. <b>First inversion</b> puts the 3rd in the bass, <b>second inversion</b> the 5th.', 'treble;0;C4+E4+G4:root E4+G4+C5:1st G4+C5+E5:2nd;w=60'],
      ['Seventh chords have a <b>third inversion</b> with the 7th in the bass. The upper notes can be in any order — only the bass note decides the inversion.', 'treble;0;G4+B4+D5+F5:root B4+D5+F5+G5:1st D5+F5+G5+B5:2nd F4+G4+B4+D5:3rd;w=60'],
      ['Figured-bass numbers name inversions by the intervals above the bass. Triads: root <b>5/3</b> (usually omitted), 1st <b>6</b>, 2nd <b>6/4</b>. Sevenths: <b>7, 6/5, 4/3, 4/2</b>.', 'treble;0;C4+E4+G4:5/3 E4+G4+C5:6 G4+C5+E5:6/4;w=60'],
    ]},
    {id:'diatonic', t:'Diatonic triads', d:'the chords of a key', x:[[X('chordid',{types:['maj','min','dim'],rootAcc:false}),'Chord ID — diatonic qualities']], p:[
      ['Build a triad on each scale degree using only notes of the key. In every major key the qualities fall the same way: <b>I ii iii IV V vi vii°</b> — major, minor, minor, major, major, minor, diminished.', 'treble;0;C4+E4+G4:I D4+F4+A4:ii E4+G4+B4:iii F4+A4+C5:IV G4+B4+D5:V A4+C5+E5:vi B4+D5+F5:vii°;w=44'],
      ['In minor, composers raise the 7th (harmonic minor) for V and vii°: <b>i ii° III iv V VI vii°</b>.', 'treble;0;A4+C5+E5:i B4+D5+F5:ii° C5+E5+G5:III D5+F5+A5:iv E5+G#5+B5:V F5+A5+C6:VI G#4+B4+D5:vii°;w=44'],
      ['Uppercase = major, lowercase = minor, ° = diminished, + = augmented. Same Roman numeral in any key: in G major, V is D major; in E♭ major, V is B♭ major.', 'treble;-3;Eb4+G4+Bb4:I Ab4+C5+Eb5:IV Bb4+D5+F5:V Eb4+G4+Bb4:I'],
    ]},
    {id:'diatonic7', t:'Diatonic seventh chords', d:'7ths in major and minor', p:[
      ['Major key sevenths: <b>Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7</b>. Only V gets a dominant 7th.', 'treble;0;C4+E4+G4+B4:I⁷ D4+F4+A4+C5:ii⁷ E4+G4+B4+D5:iii⁷ F4+A4+C5+E5:IV⁷ G4+B4+D5+F5:V⁷ A4+C5+E5+G5:vi⁷ B4+D5+F5+A5:viiø⁷;w=44'],
      ['Minor key (raised 7th for V and vii): <b>i7 iiø7 IIImaj7 iv7 V7 VImaj7 vii°7</b>. The fully diminished vii°7 only occurs naturally in harmonic minor.', 'treble;0;A4+C5+E5+G5:i⁷ B4+D5+F5+A5:iiø⁷ E5+G#5+B5+D6:V⁷ G#4+B4+D5+F5:vii°⁷;w=56'],
    ]},
    {id:'roman', t:'Roman numeral analysis', d:'labelling chords in a key', x:[[X('chordid',{invs:[0,1,2],types:['maj','min','dim']}),'Chord ID with inversions']], p:[
      ['<b>Roman numeral analysis</b> names each chord by its scale degree and quality, then its inversion with figures: V6 = V in first inversion, ii6/5 = ii7 in first inversion.', 'treble;0;C4+E4+G4:I F4+A4+D5:ii⁶ G4+C5+E5:I⁶₄ G4+B4+D5+F5:V⁷ C4+E4+G4:I;w=56'],
      ['Steps: 1) find the key, 2) find each chord’s root (stack it in 3rds), 3) its quality, 4) the bass note for the inversion. The figure tells a performer exactly what’s in the bass.', 'treble;0;B3+D4+G4:V⁶ C4+E4+G4:I'],
      ['Roman numerals show <b>function</b> — I and vi feel like home, IV and ii lead away, V and vii° pull back home. That’s why the same progression works in any key.', 'treble;0;C4+E4+G4:I A4+C5+E5:vi F4+A4+C5:IV G4+B4+D5:V'],
    ]},
    {id:'buildch', t:'Building chords', d:'from the root up', x:[[X('chordconst'),'Chord construction']], p:[
      ['Build up from the root in 3rds, using the right intervals. G minor: root G, minor 3rd up = B♭, perfect 5th up = D.', 'treble;0;G4+Bb4+D5:Gm'],
      ['F♯ diminished 7th: F♯, minor 3rd → A, minor 3rd → C, minor 3rd → E♭ (not D♯ — it has to be a 7th above F♯, a letter E).', 'treble;0;F#4+A4+C5+Eb5:F♯°7'],
      ['Check by letters first (every other letter: F A C E), then fix accidentals. If a letter repeats or skips, the spelling is wrong even if it sounds right.', 'treble;0;D4+F#4+A4+C5:D7'],
    ]},
    {id:'analyzech', t:'Analyzing chords', d:'stack it, name it', x:[[X('chordid',{types:['maj','min','dim','aug','maj7','dom7','min7','hdim7','dim7'],invs:[0,1,2,3]}),'Chord ID — everything']], p:[
      ['To name a chord written in any voicing: rearrange its notes into stacked 3rds. The bottom of the stack is the <b>root</b>.', 'treble;0;E4+G4+C5:? C4+E4+G4:C'],
      ['Then name the quality from the intervals above the root, and the inversion from the actual bass note. E–G–C restacks to C–E–G: C major, first inversion (C/E).', 'treble;0;E4+G4+C5:C/E C4+E4+G4:C'],
      ['F–A–B–D restacks as B–D–F–A: B half-diminished 7th, with F (its 5th) in the bass — second inversion, viiø4/3 in C. Always stack before you name.', 'treble;0;F4+A4+B4+D5:viiø⁴₃'],
    ]},
  ]);
  addLessons('Progressions & Voicing', [
    {id:'function', t:'Chord function & progressions', d:'tonic, predominant, dominant', p:[
      ['Chords in a key do three jobs. <b>Tonic</b> (I, also vi, iii): home. <b>Predominant</b> (IV, ii): moving away. <b>Dominant</b> (V, vii°): tension that wants home. The typical phrase: <b>T → PD → D → T</b>.', 'treble;0;E4+G4+C5:I F4+A4+C5:IV D4+G4+B4:V E4+G4+C5:I;bass=C3 F3 G3 C3'],
      ['Root motion by descending 5th is the strongest: vi → ii → V → I. Keep going and you circle through every diatonic chord (the “circle progression”).', 'treble;0;E4+A4+C5:vi D4+F4+A4:ii D4+G4+B4:V C4+E4+G4:I;bass=A2 D3 G2 C3'],
      ['Pop’s favourite loop I–V–vi–IV uses the same functions in a different order (heard in songs like “Let It Be” and “Don’t Stop Believin’”).', 'treble;0;E4+G4+C5:I D4+G4+B4:V E4+A4+C5:vi F4+A4+C5:IV;bass=C3 G2 A2 F2'],
    ]},
    {id:'cadences', t:'Cadences', d:'how phrases end', p:[
      ['<b>Authentic cadence</b>: V(7) → I. It’s a <b>perfect</b> authentic cadence (PAC) when both chords are in root position and the melody ends on the tonic; otherwise imperfect (IAC).', 'treble;0;D4+G4+B4:V E4+G4+C5:I;bass=G2 C3'],
      ['<b>Half cadence</b>: the phrase stops on V — a question mark. <b>Plagal cadence</b>: IV → I, the “Amen” at the end of hymns.', 'treble;0;C4+F4+A4:IV C4+E4+G4:I;bass=F3 C3'],
      ['<b>Deceptive cadence</b>: V → vi. Your ear expects I and gets the submediant instead — a classic way to extend a phrase.', 'treble;0;D4+G4+B4:V C4+E4+C5:vi;bass=G2 A2'],
    ]},
    {id:'voicing', t:'Voice leading (SATB)', d:'four parts, smooth lines', x:[['#check','Voice-leading checker']], p:[
      ['Chorale style writes four voices: <b>soprano, alto, tenor, bass</b>. With a triad, one note is doubled — usually the root. Keep adjacent upper voices within an octave of each other.', 'treble;0;E4+G4+C5:I F4+A4+C5:IV;bass=C3 F3'],
      ['Move each voice as little as possible: keep common tones, move the others by step. The bass can leap; it carries the roots.', 'treble;0;E4+G4+C5:I D4+G4+B4:V E4+G4+C5:I;bass=C3 G2 C3'],
      ['Avoid <b>parallel 5ths and octaves</b> (two voices moving the same direction keeping a P5 or P8) — they make voices sound fused. Resolve the leading tone up to the tonic and a chord 7th down by step.', 'treble;0;F4+G4+B4:V⁷ E4+G4+C5:I;bass=G2 C3'],
    ]},
    {id:'nct', t:'Nonchord tones', d:'passing, neighbor, suspension…', p:[
      ['Melodies use notes outside the chord. A <b>passing tone</b> fills a 3rd by step (C–D–E over C major). A <b>neighbor tone</b> steps away and back (E–F–E).', 'treble;0;C5 D5:PT E5 | E5 F5:NT E5'],
      ['A <b>suspension</b> holds a note over a chord change, clashing, then resolves down by step: the classic 4–3 over V (C held over G major, then B).', 'treble;0;C5+G4:4 B4+G4:3;bass=G2 G2'],
      ['Also: <b>appoggiatura</b> (leap to a dissonance, step away), <b>escape tone</b> (step to it, leap away), <b>anticipation</b> (arrives early), <b>pedal point</b> (a held bass note under changing chords).', 'treble;0;A4 D5:App C5 | B4 C5:ET G4'],
    ]},
  ]);
  addLessons('Advanced', [
    {id:'neapolitan', t:'Neapolitan chords', d:'the ♭II6', p:[
      ['The <b>Neapolitan</b> is a major triad built on the lowered 2nd degree (♭2). In C minor that’s D♭–F–A♭. It’s most common in minor keys.', 'treble;-3;Db5+F5+Ab5:♭II'],
      ['It usually appears in <b>first inversion</b> (N6, ♭II6), with the 4th degree in the bass, and works as a <b>predominant</b>: it leads to V, often through a cadential 6/4.', 'treble;-3;Eb4+G4+C5:i F4+Ab4+Db5:N⁶ F4+G4+Bn4:V⁷ Eb4+G4+C5:i;bass=C3 F3 G2 C3;w=58'],
      ['Voice-lead ♭2 <b>down</b> to the leading tone (a diminished 3rd, D♭→B♮) rather than up to 2 — moving D♭ to D would create a cross-relation. Beethoven’s “Moonlight” Sonata (1st mvt.) uses the Neapolitan in its opening phrase.', 'treble;-3;Db5:♭2 Bn4:7 C5:1'],
    ]},
    {id:'aug6', t:'Augmented sixth chords', d:'Italian, French, German', p:[
      ['Augmented sixth chords put ♭6 in the bass and ♯4 above it: the interval is an <b>augmented 6th</b>, and both notes resolve outward by half step to 5. In C minor: A♭ and F♯ → G and G.', 'treble;-3;Ab4+F#5:+6 G4+G5:5_5'],
      ['<b>Italian</b> (It+6): ♭6, 1, ♯4. <b>French</b> (Fr+6): ♭6, 1, 2, ♯4. <b>German</b> (Ger+6): ♭6, 1, ♭3, ♯4.', 'treble;-3;Ab4+C5+F#5:It⁺⁶ Ab4+C5+D5+F#5:Fr⁺⁶ Ab4+C5+Eb5+F#5:Ger⁺⁶;w=64'],
      ['All three are predominants that lead to V. The German sounds like a dominant 7th (A♭7) but resolves differently; going straight to V creates parallel 5ths, so it usually passes through the cadential 6/4 first.', 'treble;-3;Ab4+C5+Eb5+F#5:Ger⁺⁶ G4+C5+Eb5+G5:i⁶₄ G4+Bn4+D5+G5:V;bass=Ab2 G2 G2;w=64'],
      ['Italian and French resolve directly to V. In major keys the German’s ♭3 is often spelled as ♯2 (D♯ instead of E♭ in C) when it moves up to the 3rd of the I6/4.', 'treble;-3;Ab4+C5+F#5:It⁺⁶ G4+Bn4+G5:V Ab4+C5+D5+F#5:Fr⁺⁶ G4+Bn4+D5+G5:V;w=60'],
    ]},
  ], {pro:true});
})();
