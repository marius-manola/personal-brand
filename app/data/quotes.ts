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
  }
]; 