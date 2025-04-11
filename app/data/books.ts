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
    title: "Zero to One",
    author: "Peter Thiel",
    description: "Notes on startups, or how to build the future. A contrarian view on innovation and what it takes to build something truly new.",
    category: "Startups & Innovation",
    link: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.amazon.com%2FZero-One-Notes-Startups-Future%2Fdp%2F0804139296&psig=AOvVaw1nP4IpQuESPYN-C8n_2_B2&ust=1744484090486000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCMCfjebT0IwDFQAAAAAdAAAAABAE",
    coverImage: "/zerotoone.jpg"
  },
  {
    title: "Hackers & Painters",
    author: "Paul Graham",
    description: "Big ideas from the computer age. Essays on programming, startups, and the nature of technology by Y Combinator's founder.",
    category: "Startups & Innovation",
    link: "http://www.paulgraham.com/hackpaint.html",
    coverImage: "/hackersandpainters.jpg"
  },
  {
    title: "Surely You're Joking, Mr. Feynman!",
    author: "Richard P. Feynman",
    description: "Adventures of a curious character. A brilliant physicist's account of his extraordinary life and the joy of discovery.",
    category: "Biographies",
    link: "https://en.wikipedia.org/wiki/Surely_You%27re_Joking,_Mr._Feynman!",
    coverImage: "/35167685.jpg"
  },
  {
    title: "Shoe Dog",
    author: "Phil Knight",
    description: "A memoir by the creator of Nike. A candid and riveting story of turning an idea and $50 into a global icon.",
    category: "Biographies",
    link: "https://www.nike.com/shoe-dog",
    coverImage: "/shoedog.jpg"
  },
  {
    title: "Steve Jobs",
    author: "Walter Isaacson",
    description: "The exclusive biography of the innovative founder of Apple, based on more than forty interviews with Steve Jobs himself.",
    category: "Biographies",
    link: "https://www.simonandschuster.com/books/Steve-Jobs/Walter-Isaacson/9781451648539",
    coverImage: "/stevejobs.jpg"
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    description: "A masterful tale of adventure that has enchanted readers for generations, following Bilbo Baggins on an unexpected journey that will change his life forever.",
    category: "Philosophy & Life",
    link: "https://www.tolkienestate.com/works/the-hobbit/",
    coverImage: "/thehobbit.jpg"
  },
  {
    title: "1984",
    author: "George Orwell",
    description: "A dystopian masterpiece that explores surveillance, truth, and power in a totalitarian society. More relevant than ever.",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/Nineteen_Eighty-Four",
    coverImage: "/1984.jpg"
  },
  {
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    description: "A psychological thriller about morality, redemption, and the human condition. One of literature's supreme achievements.",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/Crime_and_Punishment",
    coverImage: "/crimeandpunishment.jpeg"
  },
  {
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
    description: "The hilarious and philosophical adventure through space that answers the ultimate question of life, the universe, and everything.",
    category: "Philosophy & Life",
    link: "https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy",
    coverImage: "/hithchiker.jpg"
  },
  {
    title: "Ego Is the Enemy",
    author: "Ryan Holiday",
    description: "Drawing on stories from history and literature, a meditation on the perilous nature of ego in an era that rewards it.",
    category: "Philosophy & Life",
    link: "https://ryanholiday.net/ego-is-the-enemy/",
    coverImage: "/egoistheenemy.jpg"
  },
  {
    title: "A Memoir of Friendship and Physics",
    author: "Leonard Mlodinow",
    description: "A touching portrait of Stephen Hawking by his collaborator and friend, revealing the human side of a scientific genius.",
    category: "Biographies",
    link: "https://en.wikipedia.org/wiki/Stephen_Hawking:_A_Memoir_of_Friendship_and_Physics",
    coverImage: "/memoirefriendship.jpg"
  }
];

export const categories = Array.from(new Set(books.map(book => book.category))); 