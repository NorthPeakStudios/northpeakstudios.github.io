// Cadence · Lesson text, part 1: The Basics, Rhythm & Meter, Scales & Key Signatures (original writing).
(() => {
  const X=(id,cfg)=>{ const e=MT.EX[id]; if(!e) return '#mt'; const code=MT.encode(e,Object.assign(MT.defaults(e),cfg||{})); return '#ex/'+id+(code?'/'+code:''); };
  addLessons('The Basics', [
    {id:'staff', t:'The staff & clefs', d:'lines, spaces, treble, bass, alto, tenor', x:[[X('noteid',{clefs:['treble']}),'Note ID — treble clef'],[X('noteid',{clefs:['bass']}),'Note ID — bass clef']], p:[
      ['Music is written on a <b>staff</b>: five lines and the four spaces between them. A note’s height on the staff shows its pitch — higher on the staff, higher in sound. Lines and spaces are counted from the bottom up.', 'treble;0;E4 F4 G4 A4 B4 C5 D5 E5 F5'],
      ['A <b>clef</b> at the start of the staff tells you which notes the lines mean. The <b>treble clef</b> is a G clef: its curl wraps around the second line, marking it as the G above middle C (G4). Trumpets, flutes, violins and the right hand of piano read treble.', 'treble;0;G4:G4'],
      ['The <b>bass clef</b> is an F clef: its two dots sit on either side of the fourth line, marking F3 (the F below middle C). Trombones, tubas, cellos and the piano’s left hand read bass.', 'bass;0;F3:F3'],
      ['Two C clefs point to <b>middle C</b> (C4). In the <b>alto clef</b> middle C is the middle line (violas read it); in the <b>tenor clef</b> it’s the fourth line (cello, bassoon and trombone use it for high passages).', 'alto;0;C4:alto_C4'],
      ['Same pitch, four clefs: middle C sits in a different place on each staff. Put treble and bass together with a brace and you get the <b>grand staff</b> that piano music uses — middle C is one ledger line between them.', 'tenor;0;C4:tenor_C4'],
    ]},
    {id:'names', t:'Note names', d:'the musical alphabet and middle C', x:[[X('noteid',{clefs:['treble','bass']}),'Note ID'],[X('kbnote',{keys:['white']}),'Keyboard: white keys']], p:[
      ['Notes use seven letters, <b>A B C D E F G</b>, then start over. Going up from C: C D E F G A B C. The distance from one C to the next is an <b>octave</b>.', 'treble;0;C4 D4 E4 F4 G4 A4 B4 C5'],
      ['On a piano, the white keys are the natural notes. C is the white key just left of each group of <b>two</b> black keys; F is just left of each group of <b>three</b>.', 'kb:60,62,64,65,67,69,71'],
      ['To say which octave, add a number: <b>middle C is C4</b>, the next C up is C5, and every note from C4 up to B4 carries a 4. So the A above middle C is A4 (440 Hz, the note orchestras tune to).', 'treble;0;C4:C4 A4:A4 C5:C5'],
      ['Treble clef memory aid: lines (bottom→top) E G B D F, spaces F A C E. Bass clef: lines G B D F A, spaces A C E G. Better still: learn a few landmarks (G4 in treble, F3 in bass, middle C) and count from them.', 'bass;0;G2 B2 D3 F3 A3'],
    ]},
    {id:'ledger', t:'Ledger lines', d:'going above and below the staff', x:[[X('noteid',{clefs:['treble'],r_treble:['F3','D6']}),'Note ID with ledger lines']], p:[
      ['Notes too high or low for the staff get short extra lines called <b>ledger lines</b>. They keep the same line–space pattern going.', 'treble;0;A5 B5 C6 D6 E6'],
      ['Middle C sits on one ledger line <b>below</b> the treble staff and one ledger line <b>above</b> the bass staff — same note, same sound.', 'treble;0;C4:middle_C B3 A3 G3'],
      ['Count ledger lines like staff lines: in treble, C6 has two ledger lines above; in bass, E2 has one below. Trumpet players live on these — low F♯3 and high C6 are both on ledger lines.', 'bass;0;E2 D2 C2 | C4 D4 E4'],
    ]},
    {id:'durations', t:'Note durations', d:'whole, half, quarter, eighth, sixteenth', x:[[X('rhythm',{ts:['4/4'],vals:['e','long']}),'Counting rhythms']], p:[
      ['A note’s <b>shape</b> says how long it lasts. A <b>whole note</b> is an open head with no stem. A <b>half note</b> adds a stem and lasts half as long. A <b>quarter note</b> fills the head in.', 'rh:[[4],[2],[2],[1],[1],[1],[1]]'],
      ['An <b>eighth note</b> adds a flag; a <b>sixteenth</b> has two. Groups of them are joined by <b>beams</b> instead of flags, usually one beat at a time, so you can see the beat.', 'rh:[[0.5,0.5],[0.25,0.25,0.25,0.25],[0.5,0.25,0.25],[1]]'],
      ['Each value is half the one before: 1 whole = 2 halves = 4 quarters = 8 eighths = 16 sixteenths. The note heads don’t change pitch — only the stems, fills and flags change length.', 'rh:[[1],[0.5,0.5],[0.25,0.25,0.25,0.25],[1]]'],
    ]},
    {id:'measures', t:'Measures & time signatures', d:'bar lines, beats and the two numbers', x:[[X('rhythm',{ts:['2/4','3/4','4/4']}),'Counting rhythms']], p:[
      ['<b>Bar lines</b> split music into <b>measures</b> (bars) holding an equal number of beats. A double bar marks the end of a section; a thin + thick double bar ends the piece.', 'treble;0;C4 D4 E4 F4 | G4 G4 G4 G4 |;ts=4/4'],
      ['The <b>time signature</b> sits after the clef. In simple meters the top number is how many beats per measure and the bottom is which note gets the beat: 4 = quarter, 2 = half, 8 = eighth. 3/4 = three quarter-note beats.', 'treble;0;G4 A4 B4 | C5 B4 A4 |;ts=3/4'],
      ['<b>C</b> (common time) means 4/4; <b>¢</b> (cut time) means 2/2 — two half-note beats, which is how marches feel even when they’re written like 4/4.', 'rh:[[1],[1],[1],[1]]'],
    ]},
    {id:'rests', t:'Rests', d:'measured silence', x:[[X('rhythm',{vals:['e','rest','long']}),'Counting rhythms with rests']], p:[
      ['Every note value has a matching <b>rest</b> — a silence of the same length. The whole rest hangs under the fourth line; the half rest sits on the third line (half rest looks like a hat, sitting up).', 'rh:[[-4],[-2],[2],[-1],[1],[1],[1]]'],
      ['Quarter, eighth and sixteenth rests: each is half the one before, just like the notes. A whole rest also means “rest the whole measure” in any meter.', 'rh:[[-1],[-0.5,0.5],[-0.25,0.25,0.25,0.25],[1]]'],
      ['Count rests exactly like notes — they take up beats. Most rhythm mistakes in band are rests cut short.', 'rh:[[1],[-1],[0.5,0.5],[-1]]'],
    ]},
    {id:'dots', t:'Dots & ties', d:'adding half, joining notes', x:[[X('rhythm',{vals:['e','dot','long']}),'Counting dotted rhythms']], p:[
      ['A <b>dot</b> after a note adds half of its value: dotted half = 3 beats (2 + 1), dotted quarter = 1½ (1 + ½), dotted eighth = ¾. A second dot adds half of the first dot’s value.', 'rh:[[3],[1],[1.5,0.5],[1],[1]]'],
      ['A <b>tie</b> is a curve joining two notes of the <b>same pitch</b>; you play one note lasting both values. Ties are how a note crosses a bar line. A curve between <i>different</i> pitches is a slur — a phrasing mark, not a tie.', 'rh:[[1],[1],[2],[0.75,0.25],[1],[2]]'],
      ['The classic dotted-quarter-plus-eighth: count “1 (2) & 3”. Hear how the eighth lands on the “&” of 2.', 'rh:[[1.5,0.5],[1],[1],[1.5,0.5],[2]]'],
    ]},
    {id:'steps', t:'Steps & accidentals', d:'half steps, whole steps, ♯ ♭ ♮ 𝄪 𝄫', x:[[X('noteid',{accs:['natural','sharp','flat']}),'Note ID with accidentals'],[X('kbnote'),'Keyboard note ID']], p:[
      ['A <b>half step</b> (semitone) is the nearest possible note: any key to the very next key, black or white. A <b>whole step</b> is two half steps. E–F and B–C are half steps with no black key between them.', 'kb:64,65,71,72'],
      ['<b>Accidentals</b> change a note: <b>sharp ♯</b> raises it a half step, <b>flat ♭</b> lowers it a half step, <b>natural ♮</b> cancels. An accidental lasts until the bar line and only affects that line or space (that octave).', 'treble;0;F4 F#4 F#4 Fn4 | Bb4 B4;w=56'],
      ['<b>Double sharp 𝄪</b> raises a whole step; <b>double flat 𝄫</b> lowers a whole step. They appear when a key or chord needs a raised note that is already sharp (G♯ minor’s leading tone is F𝄪).', 'treble;0;F##4:F𝄪 G4 | Bbb4:B𝄫 A4'],
      ['<b>Enharmonic</b> notes sound the same but are spelled differently: F♯ = G♭, C♯ = D♭, E♯ = F. Which spelling is right depends on the key and the chord — in B♭ major it’s B♭, never A♯. Trumpet players see this constantly.', 'treble;0;F#4 Gb4 | C#5 Db5 | E#4 F4'],
    ]},
  ]);
  addLessons('Rhythm & Meter', [
    {id:'simple', t:'Simple meter', d:'beats that split in two', x:[[X('rhythm',{ts:['2/4','3/4','4/4'],vals:['e','s','rest','dot']}),'Counting rhythms — simple meters']], p:[
      ['In <b>simple meter</b> each beat divides into <b>two</b> equal parts. 2/4 is simple duple, 3/4 simple triple, 4/4 simple quadruple — the name counts beats per bar.', 'rh:[[1],[0.5,0.5],[1],[0.5,0.5]]'],
      ['Count beats as numbers and the halves as “&”: 1 & 2 & 3 & 4 &. Sixteenths add “e” and “a”: 1 e & a.', 'rh:[[0.25,0.25,0.25,0.25],[0.5,0.5],[0.5,0.25,0.25],[1]]'],
      ['The beat note in simple meter is undotted: a quarter in 2/4, 3/4, 4/4; a half in 2/2; an eighth in 3/8 when it’s felt in three.', 'rh:[[2],[2],[1],[1],[2]]'],
    ]},
    {id:'compound', t:'Compound meter', d:'beats that split in three', x:[[X('rhythm',{ts:['6/8','9/8','12/8'],vals:['e','rest','dot','long']}),'Counting rhythms — compound meters']], p:[
      ['In <b>compound meter</b> each beat divides into <b>three</b>. The beat is a <b>dotted</b> note. 6/8 has two dotted-quarter beats, 9/8 three, 12/8 four.', 'rh:[[0.5,0.5,0.5],[0.5,0.5,0.5]]'],
      ['So the top number isn’t the beat count: divide it by 3. 6/8 = 2 beats (compound duple), 9/8 = 3, 12/8 = 4. Count “1 & a 2 & a”.', 'rh:[[1,0.5],[1.5],[0.5,0.5,0.5],[1.5]]'],
      ['Feel the difference: 3/4 is three beats of two eighths each; 6/8 is two beats of three eighths each. Same six eighths, different grouping — which is why 6/8 marches swing in two.', 'rh:[[0.5,0.5],[0.5,0.5],[0.5,0.5]]'],
    ]},
    {id:'odd', t:'Odd (asymmetrical) meter', d:'5/8, 7/8 and friends', p:[
      ['<b>Asymmetrical meters</b> mix beats of two and three eighths. 5/8 is 2+3 or 3+2; 7/8 is 2+2+3, 3+2+2 or 2+3+2. Beaming shows the grouping.', 'rh:[[0.5,0.5],[0.5,0.5,0.5]]'],
      ['Count the groups, not the eighths: 7/8 as 2+2+3 is “1 & 2 & 3 & a”. Long and short beats give these meters their limp — think of Bulgarian folk dances or Dave Brubeck’s “Blue Rondo à la Turk” (9/8 as 2+2+2+3).', 'rh:[[0.5,0.5],[0.5,0.5],[0.5,0.5,0.5]]'],
      ['5/4 works the same with quarter notes: Brubeck and Desmond’s “Take Five” is 3+2. Mission: Impossible’s theme is in 5/4 too.', 'rh:[[1],[1],[1],[1],[1]]'],
    ]},
  ]);
  addLessons('Scales & Key Signatures', [
    {id:'major', t:'The major scale', d:'W W H W W W H', x:[[X('earscale',{sc:['major','natural_minor']}),'Hear major vs minor']], p:[
      ['A <b>scale</b> is a set of notes in order. The <b>major scale</b> uses whole (W) and half (H) steps in this pattern: <b>W W H W W W H</b>. On C it’s all white keys.', 'treble;0;C4 D4 E4 F4 G4 A4 B4 C5'],
      ['Start the same pattern on another note and accidentals appear. G major needs F♯ to keep the half step between 7 and 8.', 'treble;0;G4 A4 B4 C5 D5 E5 F#5 G5'],
      ['F major needs B♭ so that 3–4 (A–B♭) is a half step. Every major scale uses each letter exactly once.', 'treble;0;F4 G4 A4 Bb4 C5 D5 E5 F5'],
    ]},
    {id:'minor', t:'Minor scales', d:'natural, harmonic, melodic', x:[[X('earscale',{sc:['natural_minor','harmonic_minor','melodic_minor']}),'Hear the three minors']], p:[
      ['The <b>natural minor</b> scale: <b>W H W W H W W</b>. A natural minor uses the same notes as C major, starting on A.', 'treble;0;A4 B4 C5 D5 E5 F5 G5 A5'],
      ['<b>Harmonic minor</b> raises the 7th, giving a leading tone a half step below the tonic (G♯ in A minor) — and an augmented 2nd between 6 and 7 (F–G♯).', 'treble;0;A4 B4 C5 D5 E5 F5 G#5 A5'],
      ['<b>Melodic minor</b> raises 6 and 7 going up for a smooth line, and in classical use returns to natural minor coming down. (In jazz, the raised form is used both ways.)', 'treble;0;A4 B4 C5 D5 E5 F#5 G#5 A5 G5 F5 E5;w=34'],
    ]},
    {id:'degrees', t:'Scale degrees', d:'tonic to leading tone', x:[['#rp/go/2','Relative pitch: hear the degrees']], p:[
      ['Each scale note has a number and a name: <b>1 tonic, 2 supertonic, 3 mediant, 4 subdominant, 5 dominant, 6 submediant, 7 leading tone</b>.', 'treble;0;C4:1 D4:2 E4:3 F4:4 G4:5 A4:6 B4:7 C5:1'],
      ['When 7 is a whole step below the tonic (as in natural minor), it’s called the <b>subtonic</b> instead of leading tone.', 'treble;0;A4:1 B4:2 C5:3 D5:4 E5:5 F5:6 G5:♭7 A5:1'],
      ['The degrees are the backbone of relative pitch: once you can hear “that’s 5” or “that’s 7 pulling up to 1”, you can play by ear in any key. The Relative pitch trainer drills exactly this.', 'treble;0;B4:7 C5:1 | D5:2 C5:1 | F4:4 E4:3'],
    ]},
    {id:'keysigs', t:'Key signatures', d:'sharps and flats at the start', x:[[X('keysigid'),'Key signature ID'],[X('keysigconst'),'Key signature construction']], p:[
      ['Instead of writing the same accidentals every time, a <b>key signature</b> after the clef lists them once; they apply to every octave for the whole piece (until it changes).', 'treble;3;A4 B4 C#5 D5 E5 F#5 G#5 A5'],
      ['Sharps always appear in the same order: <b>F C G D A E B</b>. Flats in the reverse order: <b>B E A D G C F</b>.', 'treble;7;_ ;final=0'],
      ['Each key signature belongs to one major key and its <b>relative minor</b> (a minor 3rd lower). No sharps or flats: C major / A minor. One flat: F major / D minor.', 'treble;-7;_ ;final=0'],
    ]},
    {id:'kscalc', t:'Key signature calculation', d:'reading a key from its signature', x:[[X('keysigid',{mode:'both'}),'Key signature ID — major + minor']], p:[
      ['<b>Sharp keys:</b> the last sharp is the leading tone, so go up a half step. Last sharp C♯ → D major (2 sharps).', 'treble;2;D4:D_major'],
      ['<b>Flat keys:</b> the second-to-last flat names the key. Flats B♭ E♭ A♭ → E♭ major. Memorize the one exception: one flat = F major.', 'treble;-3;Eb4:E♭_major'],
      ['<b>Minor:</b> find the major key, then go down a minor 3rd (to its 6th degree). 3 flats = E♭ major → C minor. The circle of fifths puts all of this in one picture: each step clockwise adds a sharp (C G D A E B F♯ C♯), counterclockwise adds a flat (F B♭ E♭ A♭ D♭ G♭ C♭).', 'treble;-3;C4:C_minor'],
    ]},
  ]);
})();
