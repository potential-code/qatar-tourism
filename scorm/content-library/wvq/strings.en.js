/* Welcoming visitors to Qatar: English text. Original demonstration content. */
window.QTA_STRINGS = {
  lang: 'en',
  packageId: 'wvq-en-scorm2004',
  wordmark: 'Qatar Tourism <span>Academy</span>',
  title: 'Welcoming visitors to Qatar',
  subtitle: 'Interactive package • about 8 minutes • 5 screens • English',
  pill: 'SCORM 2004 package • English',
  skip: 'Skip to content',
  saveExit: 'Save and exit',
  previewBanner:
    '<strong>Preview mode: no LMS connection.</strong> Everything works, but progress and scores are not saved.',
  stepLabel: 'Screen {n} of {total}',
  steps: ['Welcome', 'Visitor needs', 'Watch', 'Practise', 'Check'],
  back: 'Back',
  next: 'Next',
  incompatible:
    'The saved place could not be used with this version, so the module starts from the beginning.',
  s1: {
    eyebrow: 'Welcome',
    h: 'A first impression that lasts',
    lead: 'In the next few minutes you will practise the moments that shape how a visitor feels about Qatar: the greeting, understanding what they need, and replying with confidence.',
    objectivesTitle: 'By the end you will be able to',
    objectives: [
      'Greet a visitor and ask one useful question.',
      'Notice what a visitor needs beyond what they ask for.',
      'Offer a clear next step that you can stand behind.',
    ],
    meta: 'Five screens, a short captioned video and a three-question knowledge check. You can close at any time and pick up where you stopped.',
  },
  s2: {
    eyebrow: 'Visitor needs',
    h: 'Listen for three kinds of need',
    lead: 'Visitors often ask for one thing and need another. Select each card to see what to listen for and a question you can try.',
    revealHint: 'Select to open',
    cards: [
      {
        h: 'Information',
        p: 'They want facts they can rely on: where, when, how long and how much.',
        ask: 'Try asking: “What time would suit you best?”',
      },
      {
        h: 'Comfort',
        p: 'They may need shade, seating, step-free access, a quiet corner or someone who speaks their language.',
        ask: 'Try asking: “Is there anything that would make this easier for your group?”',
      },
      {
        h: 'Confidence',
        p: 'They want to know the plan will work, and what to do if it does not.',
        ask: 'Try asking: “Shall I write the meeting point down for you?”',
      },
    ],
    tip: 'Tip: one short question is usually enough. Then listen.',
  },
  s3: {
    eyebrow: 'Watch',
    h: 'A welcome in four moments',
    lead: 'Watch the sample video. It has no voice track, so the narration appears as captions. You can also read the transcript.',
    captionsOn: 'Captions are on. Use the video controls to change the caption language.',
    transcriptTitle: 'Read the transcript',
    transcript:
      'A helpful welcome begins with attention. Greet the visitor, introduce yourself and ask what they need today. Listen before suggesting an option. If the request is unclear, ask one short follow-up question. Offer information you can verify and explain the next step in plain language. Before the conversation ends, check that the visitor knows what to do next. A confident service experience is built through clarity, respect and follow-through.',
    watched: 'You have watched the video.',
    videoLabel: 'Sample video: a welcome in four moments',
    captionEn: 'English',
    captionAr: 'العربية',
  },
  s4: {
    eyebrow: 'Practise',
    h: 'A visitor arrives with a question',
    lead: 'Choose how to respond. Each choice leads to a different conversation.',
    scene:
      'A visitor arrives at the hotel desk after a flight, with two children. It is early afternoon.',
    visitor: 'Visitor',
    you: 'You',
    continue: 'Continue',
    tryAgain: 'Start the conversation again',
    pathLabel: 'Choices made: {n}',
    nodes: {
      start: {
        line: '“We have a free afternoon. What should we do?”',
        prompt: 'How do you respond?',
        options: [
          {
            id: 'a',
            text: 'Hand over a list of ten attractions and say, “Pick whatever you like.”',
            feedback:
              'That is a lot to take in after a long journey. The visitor now has the work of choosing.',
            next: 'a1',
          },
          {
            id: 'b',
            text: 'Ask one short question: “How are the children feeling, and what do you enjoy?”',
            feedback:
              'A short, warm question shows you are listening and gives you something to work with.',
            next: 'b1',
          },
          {
            id: 'c',
            text: 'Say, “The airport has leaflets; please look there.”',
            feedback:
              'This sends the visitor away without help. Try a response that keeps the conversation going.',
            next: 'endNo',
          },
        ],
      },
      a1: {
        line: '“That is a lot. We do not know where to start.”',
        prompt: 'The visitor looks overwhelmed. What now?',
        options: [
          {
            id: 'a',
            text: 'Ask about the children’s energy and what the family enjoys.',
            feedback: 'Good recovery. A question narrows the choice.',
            next: 'b1',
          },
          {
            id: 'b',
            text: 'Read the list again, more slowly.',
            feedback: 'Repeating the same list does not make the choice easier.',
            next: 'endSlow',
          },
        ],
      },
      b1: {
        line: '“The children are tired but love water and boats. We like quiet walks.”',
        prompt: 'What do you offer?',
        options: [
          {
            id: 'a',
            text: 'Two confirmed options: a short, shaded waterfront walk with a playground, or an early-evening boat trip with seats held until <bdi dir="ltr">15:00</bdi>.',
            feedback:
              'Both options fit what you heard and both are confirmed, so the visitor can decide with confidence.',
            next: 'endGood',
          },
          {
            id: 'b',
            text: 'A full-day desert trip that leaves in an hour.',
            feedback: 'It does not match what the family told you, and it is not confirmed for today.',
            next: 'endMiss',
          },
        ],
      },
      endGood: {
        tone: 'good',
        title: 'A clear, confident reply',
        text: 'You listened, narrowed the choice and offered two confirmed options. The visitor knows what happens next.',
      },
      endMiss: {
        tone: 'try',
        title: 'The offer missed the need',
        text: 'The family said they were tired and liked water and quiet walks. Offer only what fits and what you can confirm.',
      },
      endSlow: {
        tone: 'try',
        title: 'The choice was still too wide',
        text: 'A shorter list or one more question would have helped more than repeating the same options.',
      },
      endNo: {
        tone: 'try',
        title: 'No help was given',
        text: 'Visitors remember whether you tried to help. Even a quick question keeps the conversation going.',
      },
    },
  },
  s5: {
    eyebrow: 'Check your knowledge',
    h: 'Three quick questions',
    lead: 'Choose one answer for each question. You will see feedback straight away. You need 2 of 3 to pass.',
    qOf: 'Question {n} of {total}',
    correct: 'Correct.',
    incorrect: 'Not quite.',
    questions: [
      {
        q: 'A visitor says, “Something relaxing, please.” What is the best first move?',
        options: [
          'Choose a spa for them.',
          'Ask what relaxing means to them and whether they have any practical needs.',
          'Give them a map and wish them well.',
        ],
        correct: 1,
        why: 'People mean different things by “relaxing”. One short question lets you match the suggestion to the person.',
      },
      {
        q: 'Which reply gives the visitor a clear next step?',
        options: [
          '“Maybe try the museum. I think it is open.”',
          '“The museum opens at <bdi dir="ltr">9:00</bdi>. It is a five-minute walk along the waterfront, and I will mark the entrance on your map.”',
          '“It is easy to find. Just ask someone.”',
        ],
        correct: 1,
        why: 'It gives a time, a distance and a visible action, using information you can verify.',
      },
      {
        q: 'You are not sure whether a tour still has seats. What do you do?',
        options: [
          'Promise seats so the visitor is happy.',
          'Check with the operator before you offer it.',
          'Leave the tour out and say nothing.',
        ],
        correct: 1,
        why: 'Only offer what you have confirmed. A short check protects the visitor’s plans and your credibility.',
      },
    ],
    passedTitle: 'Passed',
    failedTitle: 'Not passed yet',
    passNote: 'You answered {n} of {total} correctly. This module is complete.',
    failNote:
      'You answered {n} of {total} correctly. You need 2 of 3. Review the feedback and try again.',
    retry: 'Try the questions again',
    scoreLabel: 'Your score',
  },
  announce: { screen: 'Screen {n} of {total}: {name}', saved: 'Progress saved' },
}
