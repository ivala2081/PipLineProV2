import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, SortAsc, SortDesc } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'transaction' | 'user' | 'report' | 'setting';
  url: string;
}

interface MobileSearchBarProps {
  onSearch: (query: string) => void;
  onFilter?: () => void;
  onSort?: () => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  showSort?: boolean;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  onSearch,
  onFilter,
  onSort,
  placeholder = 'Search...',
  className = '',
  showFilters = true,
  showSort = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock search results - replace with actual search logic
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: 'Transaction #12345',
          description: 'Payment received from Client A',
          type: 'transaction' as const,
          url: '/transactions/12345'
        },
        {
          id: '2',
          title: 'User: John Doe',
          description: 'Administrator account',
          type: 'user' as const,
          url: '/users/john-doe'
        },
        {
          id: '3',
          title: 'Monthly Report',
          description: 'Financial summary for January 2025',
          type: 'report' as const,
          url: '/reports/monthly'
        }
      ].filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      handleSearch(value);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowResults(false);
      setIsExpanded(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Navigate to result
    window.location.href = result.url;
    setShowResults(false);
    setIsExpanded(false);
    setQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return '💰';
      case 'user':
        return '👤';
      case 'report':
        return '📊';
      case 'setting':
        return '⚙️';
      default:
        return '📄';
    }
  };

  return (
    <div ref={searchRef} className={clsx('relative', className)}>
      {/* Search Bar */}
      <div className={clsx(
        'flex items-center bg-white border border-gray-300 rounded-xl transition-all duration-300',
        isExpanded ? 'shadow-lg border-gray-500' : 'hover:border-gray-400'
      )}>
        {/* Search Icon */}
        <div className="pl-4 pr-2">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder={placeholder}
            className="w-full py-3 px-2 text-base bg-transparent border-none outline-none placeholder-gray-400"
          />
        </form>

        {/* Action Buttons */}
        <div className="flex items-center pr-2 space-x-1">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
                inputRef.current?.focus();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showFilters && onFilter && (
            <button
              onClick={onFilter}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}

          {showSort && onSort && (
            <button
              onClick={onSort}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
            >
              <SortAsc className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-transparent mx-auto mb-2"></div>
              <p className="text-gray-500">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getTypeIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() && (
            <div className="p-4 text-center text-gray-500">
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileSearchBar;
