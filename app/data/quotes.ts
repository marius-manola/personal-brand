export type Quote = {
  text: string;
  author?: string;
  sourceText?: string;
  sourceLink?: string;
  categories: string[];
};

export const quotes: Quote[] = [
  {
    text: "It's always easier to land on the moon if someone else has already done it.",
    author: "Demis Hassabis",
    sourceText: "The Thinking Game",
    sourceLink: "https://www.imdb.com/title/tt32150119/",
    categories: ["Innovation", "Motivation"]
  },
  {
    text: "Eventually you get tired of performing for someone who isn't clapping anymore.",
    author: "Shaan Puri",
    categories: ["Motivation", "Inspiration"]
  },
  {
    text: "The entire point of life is to take chances on dreams that seem crazy to most, but feel like destiny to you.",
    author: "Case Kenny",
    categories: ["Inspiration", "Motivation"]
  },
  {
    text: "If you pray to win a marathon, expect shoes, not a medal.",
    categories: ["Motivation", "Innovation"]
  },
  {
    text: "How do you know you are doing the right thing? If people you respect approve of your action.",
    author: "Nasim Nicholas Taleb",
    categories: ["Inspiration", "Motivation"]
  },
  {
    text: "Make it exist first, you can make it good later.",
    categories: ["Inspiration", "Motivation"]
  },
  {
    text: "A man who fears suffering more than failure is sure to fail in his fear of suffering, thus making his worst fear a reality.",
    author: "Marcus Aurelius",
    categories: ["Motivation", "Philosophy"]
  },
  {
    text: "If you allow yourself to have more than one focus, you've already blinked.",
    author: "Ryan Holiday",
    categories: ["Motivation", "Focus"]
  },
  {
    text: "Light yourself on fire with passion and people will come from miles to watch you burn.",
    author: "John Wesley",
    categories: ["Inspiration", "Motivation"]
  },
  {
    text: "You're the choices you make, the love you give and the life you create.",
    categories: ["Inspiration", "Philosophy"]
  },
  {
    text: "The magic you're looking for is in the work you're avoiding.",
    author: "Chris Williamson",
    categories: ["Motivation", "Productivity"]
  },
  {
    text: "Desire is a contract you make with yourself to be unhappy until you get what you want.",
    author: "Naval Ravikant",
    categories: ["Philosophy", "Mindfulness"]
  },
  {
    text: "What you go looking for in the world you're sure to find it.",
    author: "Brené Brown",
    categories: ["Philosophy", "Inspiration"]
  },
  {
    text: "You don't have to turn this into something. It doesn't have to upset you.",
    author: "Marcus Aurelius",
    categories: ["Philosophy", "Mindfulness"]
  },
  {
    text: "It's better to be at the bottom of the mountain you want to climb than halfway up one you don't.",
    categories: ["Motivation", "Inspiration"]
  },
  {
    text: "Society is a set of collective lies that we all believe so we can get along.",
    author: "Naval Ravikant",
    categories: ["Philosophy", "Society"]
  },
  {
    text: "What doesn't kill you makes you stronger.",
    author: "Friedrich Nietzsche",
    categories: ["Motivation", "Philosophy"]
  },
  {
    text: "The happiness of your life depends on the quality of your thoughts.",
    author: "Marcus Aurelius",
    categories: ["Philosophy", "Mindfulness"]
  },
  {
    text: "Nobody is innocent.",
    author: "Mikhail Bulgakov",
    categories: ["Philosophy", "Literature"]
  },
  {
    text: "Your lack of urgency for success shows your acceptance of mediocrity.",
    categories: ["Motivation", "Success"]
  },
  {
    text: "You can't think your way out of some things, you have to move your way out.",
    author: "Mel Robbins",
    categories: ["Motivation", "Action"]
  },
  {
    text: "The fastest way to become the person you want to be is to put yourself in a situation you have no choice but to become them.",
    author: "Alex Hormozi",
    categories: ["Motivation", "Growth"]
  },
  {
    text: "You'll never feel ready, because ready isn't a feeling. It is a decision.",
    author: "Mel Robbins",
    categories: ["Motivation", "Action"]
  }
]; 