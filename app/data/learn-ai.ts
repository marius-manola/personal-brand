// Copy and qualification options for the single /learn-ai offer.
// Keep the calendar URL server-side: the intake API returns it only after a
// visitor finishes the questions.

export const calendarUrl = 'https://cal.com/mariusmanola/30min';
export const contactEmail = process.env.LEAD_CONTACT_EMAIL || 'mariusmanola@gmail.com';

export const spotsOpen = 2;
export const spotsNote = spotsOpen > 0 ? `Only ${spotsOpen} spots left this month` : '';

export const profileLink = {
  label: 'LinkedIn',
  href: 'https://www.linkedin.com/in/marius-manolachi/',
};

export const sprint = {
  eyebrow: 'AI implementation for teams of 5 to 50',
  lead:
    'Bring one repeated task that wastes your team’s time. In seven days, we choose the right AI opportunity, build it in your current stack, and teach your team to run it without me.',
  ctaLabel: 'Check Your Workflow',
  price: 'US$1,000',
  duration: '7 days',
  scope: '1 working workflow',
};

export const sprintProcess = [
  {
    number: '01',
    title: 'Map the work',
    text: 'Choose the repeated task with the clearest return.',
  },
  {
    number: '02',
    title: 'Build the workflow',
    text: 'Build it in your current stack and test it on real inputs.',
  },
  {
    number: '03',
    title: 'Make it yours',
    text: 'Train the team and leave with a process they can run alone.',
  },
];

export const studentProof = {
  students: 110585,
  reviews: 24168,
  courses: 4,
  src: '/proof/udemy-profile-2026.png',
  width: 2556,
  height: 1620,
  alt: 'Marius Manola’s Udemy instructor profile showing 110,585 learners, 24,168 reviews, and four courses',
  href: 'https://www.udemy.com/user/marius-manola/',
};

export const orangeCase = {
  badge: 'Orange Telecom · Corporate AI workshop',
  title: 'Practical AI, inside a real team.',
  body:
    'I taught Orange employees how to apply AI to their day-to-day work using real examples, clearer instructions, and repeatable workflows they could keep using after the workshop.',
  src: '/proof/testimonial-natalia.jpg',
  width: 664,
  height: 820,
  alt: 'Public attendee testimonial and photos from Marius Manolachi’s AI workshop with Orange employees',
  href: 'https://www.linkedin.com/posts/natalia-melniciuc-phd_continuouslearning-professionaldevelopment-ugcPost-7222195991079231489-fwGg',
};

export interface Choice {
  value: string;
  label: string;
}

export const projectChoices: Choice[] = [
  { value: 'proposals', label: 'Proposals, reports, or client deliverables' },
  { value: 'research', label: 'Research, analysis, or internal knowledge' },
  { value: 'content', label: 'Content and marketing production' },
  { value: 'sales', label: 'Sales, recruiting, or customer operations' },
  { value: 'other', label: 'Another repetitive knowledge-work process' },
];

export const teamSizeChoices: Choice[] = [
  { value: '1-4', label: '1 to 4 people' },
  { value: '5-10', label: '5 to 10 people' },
  { value: '11-25', label: '11 to 25 people' },
  { value: '26-50', label: '26 to 50 people' },
  { value: '51+', label: 'More than 50 people' },
];

export const usageChoices: Choice[] = [
  { value: 'none', label: 'Almost not at all' },
  { value: 'individual', label: 'A few people use ChatGPT or Claude individually' },
  { value: 'repeatable', label: 'We have a few repeatable prompts or processes' },
  { value: 'production', label: 'AI is already part of an important workflow' },
];

export const timelineChoices: Choice[] = [
  { value: 'now', label: 'Within the next two weeks' },
  { value: 'month', label: 'Within the next month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'exploring', label: 'I am exploring for now' },
];

export const signals = {
  weakTimeline: 'exploring',
  thinDetailLength: 40,
};

export const qualifier = {
  heading: 'Tell me about the workflow',
  intro: 'Seven short questions, one at a time. Your calendar unlocks at the end.',
  fields: {
    project: 'What kind of workflow should we improve?',
    teamSize: 'How many people would use the workflow?',
    usage: 'How does the team use AI today?',
    timeline: 'When would you want to run the sprint?',
    detail: 'Walk me through the workflow as it works today.',
    detailHint: 'What goes in, what comes out, who touches it, and where does it slow down?',
    name: 'What should I call you?',
    email: 'Where should I send the call details?',
  },
  nextLabel: 'Continue',
  backLabel: 'Back',
  submitLabel: 'Unlock my calendar',
  submitting: 'Preparing your calendar…',
  booked: {
    heading: 'Your sprint call is ready.',
    body: 'Choose a time that works. I will read your workflow notes before we meet.',
    ctaLabel: 'Choose a time',
    undelivered: 'Your answers may not have reached me. Please bring them to the call.',
  },
  error: {
    heading: 'That did not send',
    body: 'Something broke on my end. Email me and I will pick it up:',
  },
};

export const quietLinks = [
  { label: 'Home', href: '/' },
  { label: 'AI field notes', href: '/blog' },
  { label: 'LinkedIn', href: profileLink.href, external: true },
];
