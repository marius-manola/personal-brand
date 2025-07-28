interface PageContent {
  title: string;
  subtitle: string;
  contentPrefix: string;
  contentSuffix: string;
}

interface Content {
  about: PageContent;
}

export const content: Content = {
  about: {
    title: "About",
    subtitle: "",
    contentPrefix: "I'm ",
    contentSuffix: " years old. I'm currently vibe living."
  }
}; 