interface BookModalProps {
  book: {
    title: string;
    author: string;
    description: string;
    link?: string;
    category: string;
    yearRead?: number;
    coverImage: string;
  } | null;
  onClose: () => void;
}

export default function BookModal({ book, onClose }: BookModalProps) {
  if (!book) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-6">
          <div className="flex gap-6">
            <img
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              className="w-40 h-56 object-cover rounded-lg shadow-lg"
            />
            <div className="space-y-4 flex-1">
              <h2 className="text-2xl font-medium text-gray-900">{book.title}</h2>
              <p className="text-lg text-gray-600">by {book.author}</p>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {book.category}
                </span>
                {book.yearRead && (
                  <span className="text-sm text-gray-500">Read in {book.yearRead}</span>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 leading-relaxed">{book.description}</p>
          
          {book.link && (
            <a
              href={book.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Learn More
            </a>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
} 