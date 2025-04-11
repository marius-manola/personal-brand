interface PageContent {
  title: string;
  subtitle: string;
  content: string[];
}

interface Content {
  about: PageContent;
}

export const content: Content = {
  about: {
    title: "About",
    subtitle: "What is my life's work going to be?",
    content: [
      `I'm 18 years old, and instead of going to university, I'm building an alternative to higher education. This is not a project, it's my life's work.`,
    ]
  }
}; 