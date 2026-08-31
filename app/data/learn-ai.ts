// Copy and qualification options for the /learn-ai services page.
// Keep the calendar URL server-side: the intake API returns it only after a
// visitor finishes the questions.

export const calendarUrl = 'https://cal.com/mariusmanola/30min';
export const contactEmail = process.env.LEAD_CONTACT_EMAIL || 'mariusmanola@gmail.com';

export const spotsOpen = 2;
export const spotsNote = spotsOpen > 0 ? `Now booking ${spotsOpen} new company engagements` : '';

export const profileLink = {
  label: 'LinkedIn',
  href: 'https://www.linkedin.com/in/marius-manolachi/',
};

export const offer = {
  eyebrow: 'AI training, implementation & custom solutions',
  lead:
    'Whether your team needs practical training, one workflow implemented, or a custom AI product built, I help you move from an unclear opportunity to something useful, tested, and owned by your company.',
  ctaLabel: 'Discuss your AI need',
  start: 'Training or discovery',
  build: 'Workflows & products',
  finish: 'Your team owns it',
};

export const serviceTracks = [
  {
    number: '01',
    title: 'Train the team',
    text: 'Practical workshops and capability programmes built around the work your people actually do—not generic prompt lessons.',
    result: 'People who can use AI independently',
  },
  {
    number: '02',
    title: 'Implement a workflow',
    text: 'Turn a repeated, expensive process into a reliable AI-assisted workflow inside the tools and constraints you already have.',
    result: 'A working process with clear controls',
  },
  {
    number: '03',
    title: 'Build a custom solution',
    text: 'Design and build an internal tool, integration, or AI product when an off-the-shelf workflow is not enough.',
    result: 'A solution made for your business',
  },
];

export const engagementProcess = [
  {
    number: '01',
    title: 'Understand the work',
    text: 'Start with the people, decisions, data, and friction—not a predetermined AI tool.',
  },
  {
    number: '02',
    title: 'Choose the intervention',
    text: 'Decide whether the right next step is training, a workflow, or a custom build. If AI is unnecessary, say so early.',
  },
  {
    number: '03',
    title: 'Build and test',
    text: 'Work in small, reviewable releases and test the result against real cases before expanding it.',
  },
  {
    number: '04',
    title: 'Transfer ownership',
    text: 'Leave your team with the working system, documentation, and capability to operate and improve it.',
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
  title: 'Training that changes the work.',
  body:
    'At Orange, I taught employees how to apply AI to their day-to-day work using real examples, clearer instructions, and repeatable workflows they could keep using after the workshop. The same principle carries into every engagement: the capability stays with the team.',
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
  { value: 'training', label: 'Train our team to use AI well' },
  { value: 'workflow', label: 'Implement or improve an AI workflow' },
  { value: 'custom', label: 'Build a custom AI tool or product' },
  { value: 'strategy', label: 'Decide where AI can create value' },
  { value: 'unsure', label: 'We are not sure yet' },
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
  heading: 'Tell me what you want to change',
  intro: 'Seven short questions, one at a time. I will read every answer before we speak.',
  fields: {
    project: 'What kind of help are you looking for?',
    teamSize: 'How many people would this involve?',
    usage: 'How does the team use AI today?',
    timeline: 'When would you like to start?',
    detail: 'What do you want to change, improve, or build?',
    detailHint: 'Describe the current situation, the people involved, what is getting in the way, and what a useful result would look like.',
    detailPlaceholder: 'For example: our operations team handles the same requests across email and spreadsheets. We want to know whether to train the team, improve the process, or build an internal tool…',
    name: 'What should I call you?',
    email: 'Where should I send the call details?',
  },
  nextLabel: 'Continue',
  backLabel: 'Back',
  submitLabel: 'Unlock my calendar',
  submitting: 'Preparing your calendar…',
  booked: {
    heading: 'Your AI services call is ready.',
    body: 'Choose a time that works. I will read your notes before we meet.',
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
