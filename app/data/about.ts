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
    title: "",
    subtitle: "",
    content: [
      ''
    ]
  }
}; 