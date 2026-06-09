'use client';

const MESSAGES = [
  'Flipping through the pages...',
  'Finding the right chapter...',
  'Almost there...',
  'Loading your content...',
  'Preparing your lesson...',
];

export default function BookLoader({ message, size = 'md' }) {
  const displayMessage = message || MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const sizeClasses = {
    sm: { book: 'w-10 h-12', text: 'text-xs mt-3' },
    md: { book: 'w-14 h-16', text: 'text-sm mt-4' },
    lg: { book: 'w-20 h-24', text: 'text-base mt-5' },
  };
  const s = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${s.book} relative`}>
        <div className="book-loader">
          <div className="book-page book-page-1" />
          <div className="book-page book-page-2" />
          <div className="book-page book-page-3" />
          <div className="book-spine" />
        </div>
      </div>
      {displayMessage && (
        <p className={`${s.text} text-slate-500 dark:text-slate-400 font-medium animate-pulse`}>
          {displayMessage}
        </p>
      )}

      <style jsx>{`
        .book-loader {
          position: relative;
          width: 100%;
          height: 100%;
          perspective: 600px;
        }

        .book-spine {
          position: absolute;
          left: 0;
          top: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(135deg, var(--brand, #4f6df5), var(--brand-600, #3b5de7));
          border-radius: 4px 0 0 4px;
          transform-origin: right center;
          box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.15);
        }

        .book-page {
          position: absolute;
          right: 0;
          top: 2px;
          width: 50%;
          height: calc(100% - 4px);
          background: white;
          border-radius: 0 4px 4px 0;
          transform-origin: left center;
          animation: page-flip 1.8s ease-in-out infinite;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        :global(.dark) .book-page {
          background: #cbd5e1;
        }

        .book-page::after {
          content: '';
          position: absolute;
          top: 15%;
          left: 15%;
          right: 15%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          box-shadow:
            0 12px 0 #e2e8f0,
            0 24px 0 #e2e8f0,
            0 36px 0 #e2e8f0;
        }

        :global(.dark) .book-page::after {
          background: #94a3b8;
          box-shadow:
            0 12px 0 #94a3b8,
            0 24px 0 #94a3b8,
            0 36px 0 #94a3b8;
        }

        .book-page-1 {
          animation-delay: 0s;
          z-index: 3;
        }
        .book-page-2 {
          animation-delay: 0.3s;
          z-index: 2;
        }
        .book-page-3 {
          animation-delay: 0.6s;
          z-index: 1;
        }

        @keyframes page-flip {
          0%, 100% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(-160deg);
          }
        }
      `}</style>
    </div>
  );
}
