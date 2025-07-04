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
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    sourceText: "Steve Jobs",
    sourceLink: "https://en.wikipedia.org/wiki/Steve_Jobs",
    categories: ["Inspiration", "Motivation"]
  },
  {
    text: "Stay hungry, stay foolish.",
    author: "Steve Jobs",
    sourceText: "Steve Jobs",
    sourceLink: "https://en.wikipedia.org/wiki/Steve_Jobs",
    categories: ["Motivation", "Innovation"]
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    sourceText: "Eleanor Roosevelt",
    sourceLink: "https://en.wikipedia.org/wiki/Eleanor_Roosevelt",
    categories: ["Inspiration", "Motivation"]
  }
]; 