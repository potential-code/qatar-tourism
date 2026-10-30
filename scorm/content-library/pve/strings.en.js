/* Planning a visitor experience: English text. Original scenarios; no third-party text or images. */
window.QTA_STRINGS = {
  lang: 'en',
  packageId: 'pve-en-xapi',
  wordmark: 'Qatar Tourism <span>Academy</span>',
  title: 'Planning a visitor experience',
  subtitle: 'Interactive activity • about 6 minutes • 4 steps • English',
  pill: 'xAPI activity • English',
  skip: 'Skip to content',
  saveExit: 'Save and exit',
  previewBanner:
    '<strong>Preview mode: no Academy connection.</strong> The activity works, but nothing is recorded.',
  stepLabel: 'Step {n} of {total}',
  steps: ['Meet', 'Choose', 'Respond', 'Complete'],
  back: 'Back',
  next: 'Next',
  incompatible:
    'The saved place could not be used with this version, so the activity starts from the beginning.',
  lrs: {
    summary: 'Simulated learning record store: {n} statements sent',
    note: 'This activity sends xAPI statements to a simulated learning record store inside the demo. No network calls are made.',
    pending: 'sending',
    sent: 'sent',
    failed: 'failed',
    notRecorded: 'not recorded',
  },
  s1: {
    eyebrow: 'Meet your visitors',
    h: 'Noor, Daniel and Sami are planning three days in Doha',
    lead: 'Noor enjoys history and local crafts. Daniel prefers being outdoors. Sami, who is eight, loves boats and watching wildlife. They have asked you to help plan their stay.',
    start: 'Start planning',
    cont: 'Continue',
  },
  s2: {
    eyebrow: 'Choose a destination',
    h: 'Which experience fits this family best?',
    lead: 'Choose one for their first full day. You will see why it works, or what to adjust.',
    options: [
      {
        id: 'heritage',
        title: 'An old-market evening',
        text: 'Wander lantern-lit lanes, stop for tea and Arabic sweets, and watch craftspeople at work. Easy walking, mostly shaded after sunset.',
        feedback:
          'A lovely fit for Noor. Daniel and Sami may want more outdoor activity and time on the water.',
        score: 0.5,
      },
      {
        id: 'waterfront',
        title: 'Museum morning, waterfront afternoon',
        text: 'Start at a family-friendly museum with hands-on galleries, then take a short boat ride along the bay and finish with ice cream on the promenade.',
        feedback:
          'It brings history for Noor, fresh air for Daniel and boats for Sami, in a day that suits an eight-year-old.',
        score: 1,
      },
      {
        id: 'desert',
        title: 'A day at the edge of the desert',
        text: 'A long drive to see dunes and an inland sea, with a picnic. Spectacular, but a long day with little shade and few places to rest.',
        feedback:
          'Memorable, but long and exposed for a short stay with a young child. Consider it for a later day.',
        score: 0.5,
      },
    ],
  },
  s3: {
    eyebrow: 'Respond to a change',
    h: 'The plan changes',
    lead: 'The afternoon boat ride is cancelled because of strong wind. Daniel asks, “Is there anything else we can do?”',
    options: [
      {
        id: 'nothing',
        text: 'I am sorry, there is nothing I can do about the weather.',
        feedback:
          'It is true, but it leaves the family with nothing. Acknowledge the change, then offer what you can confirm.',
        score: 0,
      },
      {
        id: 'confirmed',
        text: 'I am sorry about the change. The museum is still open this afternoon, and I have checked two boat times for the day after tomorrow. Which would you prefer? I will message you the details.',
        feedback:
          'You acknowledged the change, offered confirmed options and promised a clear follow-up.',
        score: 1,
      },
      {
        id: 'refund',
        text: 'Do not worry, I will refund the whole trip now.',
        feedback:
          'A refund may be right later, but promising one is outside your authority. Offer confirmed alternatives first.',
        score: 0,
      },
    ],
  },
  s4: {
    eyebrow: 'Complete',
    h: 'Review and complete',
    lead: 'Check your choices, then complete the activity. Completing sends a final statement to the simulated learning record store.',
    destination: 'Destination',
    response: 'Your response to the change',
    result: 'Result: {score}%',
    complete: 'Complete the activity',
    done: 'Activity complete. Your result was recorded once for this unit, in either language.',
    passNote: 'Well planned. Both choices suit the visitors.',
    failNote: 'One choice did not fit. You can try again from the destination step.',
    retry: 'Try again from step 2',
    missing: 'Make both choices first.',
  },
  announce: { step: 'Step {n} of {total}: {name}' },
}
