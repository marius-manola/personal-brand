interface Book {
  title: string;
  author: string;
  description: string;
  link?: string;
  category: string;
  yearRead?: number;
  coverImage: string;
}

export const books: Book[] = [
  {
    title: "Surely You're Joking, Mr. Feynman!",
    author: "Richard P. Feynman",
    description: "",
    category: "Biographies",
    link: "https://en.wikipedia.org/wiki/Surely_You%27re_Joking,_Mr._Feynman!",
    coverImage: "/35167685.jpg"
  },
  {
    title: "Hackers & Painters",
    author: "Paul Graham",
    description: "",
    category: "Startups & Innovation",
    link: "http://www.paulgraham.com/hackpaint.html",
    coverImage: "/hackersandpainters.jpg"
  },
  {
    title: "Introduction to Systems Theory",
    author: "Niklas Luhmann",
    description: "",
    category: "Philosophy & Life",
    link: "https://www.wiley.com/en-us/Introduction+to+Systems+Theory-p-9780745645711",
    coverImage: "/systemstheory.jpg"
  },
  {
    title: "Lifelong Kindergarten",
    author: "Mitchel Resnick",
    description: "",
    category: "Education",
    link: "https://mitpress.mit.edu/9780262536134/lifelong-kindergarten/",
    coverImage: "/lifelongkindergarten.jpg"
  },
  {
    title: "Shoe Dog",
    author: "Phil Knight",
    description: "",
    category: "Biographies",
    link: "https://www.nike.com/shoe-dog",
    coverImage: "/shoedog.jpg"
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    description: "",
    category: "Philosophy & Life",
    link: "https://www.tolkienestate.com/works/the-hobbit/",
    coverImage: "/thehobbit.jpg"
  },
  {
    title: "Aesthetic Theory",
    author: "Theodor W. Adorno",
    description: "",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/Aesthetic_Theory",
    coverImage: "/aesthetictheory.jpg"
  },
  {
    title: "Zero to One",
    author: "Peter Thiel",
    description: "",
    category: "Startups & Innovation",
    link: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.amazon.com%2FZero-One-Notes-Startups-Future%2Fdp%2F0804139296&psig=AOvVaw1nP4IpQuESPYN-C8n_2_B2&ust=1744484090486000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCMCfjebT0IwDFQAAAAAdAAAAABAE",
    coverImage: "/zerotoone.jpg"
  },
  {
    title: "Steve Jobs",
    author: "Walter Isaacson",
    description: "",
    category: "Biographies",
    link: "https://www.simonandschuster.com/books/Steve-Jobs/Walter-Isaacson/9781451648539",
    coverImage: "/stevejobs.jpg"
  },
  {
    title: "1984",
    author: "George Orwell",
    description: "",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/Nineteen_Eighty-Four",
    coverImage: "/1984.jpg"
  },
  {
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    description: "",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/Crime_and_Punishment",
    coverImage: "/crimeandpunishment.jpeg"
  },
  {
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
    description: "",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy",
    coverImage: "/hithchiker.jpg"
  },
  {
    title: "Ego Is the Enemy",
    author: "Ryan Holiday",
    description: "",
    category: "Philosophy & Life",
    link: "https://ryanholiday.net/ego-is-the-enemy/",
    coverImage: "/egoistheenemy.jpg"
  },
  {
    title: "A Memoir of Friendship and Physics",
    author: "Leonard Mlodinow",
    description: "",
    category: "Biographies",
    link: "https://en.wikipedia.org/wiki/Stephen_Hawking:_A_Memoir_of_Friendship_and_Physics",
    coverImage: "/memoirefriendship.jpg"
  }
];

export const categories = Array.from(new Set(books.map(book => book.category))); 