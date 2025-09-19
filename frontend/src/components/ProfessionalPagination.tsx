import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  loading?: boolean;
  className?: string;
  showItemsPerPage?: boolean;
  showJumpToPage?: boolean;
  itemsPerPageOptions?: number[];
}

export const ProfessionalPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
  className = '',
  showItemsPerPage = true,
  showJumpToPage = true,
  itemsPerPageOptions = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
}) => {
  const [jumpToPage, setJumpToPage] = useState('');
  const [showJumpInput, setShowJumpInput] = useState(false);
  const jumpInputRef = useRef<HTMLInputElement>(null);

  // Calculate display range
  const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Show first 5 pages + ellipsis + last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Show first page + ellipsis + last 5 pages
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + ellipsis + current page range + ellipsis + last page
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Handle jump to page
  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
      setShowJumpInput(false);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showJumpInput && jumpInputRef.current === document.activeElement) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleJumpToPage();
        } else if (e.key === 'Escape') {
          setShowJumpInput(false);
          setJumpToPage('');
        }
      } else if (!showJumpInput) {
        // Enhanced keyboard shortcuts
        if (e.key === 'ArrowLeft' && currentPage > 1) {
          e.preventDefault();
          onPageChange(currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
          e.preventDefault();
          onPageChange(currentPage + 1);
        } else if (e.key === 'Home' && currentPage > 1) {
          e.preventDefault();
          onPageChange(1);
        } else if (e.key === 'End' && currentPage < totalPages) {
          e.preventDefault();
          onPageChange(totalPages);
        } else if (e.key === 'PageUp' && currentPage > 1) {
          e.preventDefault();
          onPageChange(Math.max(1, currentPage - 5));
        } else if (e.key === 'PageDown' && currentPage < totalPages) {
          e.preventDefault();
          onPageChange(Math.min(totalPages, currentPage + 5));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, showJumpInput, onPageChange]);

  // Focus jump input when shown
  useEffect(() => {
    if (showJumpInput && jumpInputRef.current) {
      jumpInputRef.current.focus();
    }
  }, [showJumpInput]);

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div className={`flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-gray-50/80 to-white border-t border-gray-200/60 shadow-sm ${className}`}>
      {/* Results Summary - Enhanced */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-sm w-full sm:w-auto">
        <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-gray-200/60 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">Showing</span>
          <span className="font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded-md">{startItem.toLocaleString()}</span>
          <span className="text-gray-500">to</span>
          <span className="font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded-md">{endItem.toLocaleString()}</span>
          <span className="text-gray-500">of</span>
          <span className="font-semibold text-gray-900 bg-green-50 px-2 py-1 rounded-md">{totalItems.toLocaleString()}</span>
          <span className="text-gray-600">results</span>
        </div>
        
        {/* Items per page selector - Enhanced with Quick Presets */}
        {showItemsPerPage && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-3 rounded-lg border border-gray-200/60 shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600 font-medium">Show:</span>
            </div>
            
            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1">
              {[25, 100, 500, 1000].map(preset => (
                <button
                  key={preset}
                  onClick={() => onItemsPerPageChange(preset)}
                  disabled={loading}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ease-out ${
                    itemsPerPage === preset
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {preset}
                </button>
              ))}
            </div>
            
            {/* Custom Selector */}
            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
                disabled={loading}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:border-gray-400 transition-all duration-200 ease-out"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>
                    {option.toLocaleString()}
                  </option>
                ))}
              </select>
              <span className="text-gray-500 font-medium text-sm">per page</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls - Enhanced */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-3 rounded-xl border border-gray-200/60 shadow-sm w-full sm:w-auto">
          {/* First Page - Enhanced */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            className="h-9 w-9 p-0 rounded-lg border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed group"
            title="First page (Home)"
          >
            <ChevronsLeft className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
          </Button>

          {/* Previous Page - Enhanced */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="h-9 w-9 p-0 rounded-lg border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed group"
            title="Previous page (←)"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 mx-2 flex-wrap justify-center">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-3 py-2 text-sm text-gray-400 font-medium">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    disabled={loading}
                    className={`h-9 w-9 p-0 rounded-lg font-semibold transition-all duration-200 ease-out ${
                      currentPage === page 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105' 
                        : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:scale-105'
                    }`}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next Page - Enhanced */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="h-9 w-9 p-0 rounded-lg border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed group"
            title="Next page (→)"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
          </Button>

          {/* Last Page - Enhanced */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="h-9 w-9 p-0 rounded-lg border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed group"
            title="Last page (End)"
          >
            <ChevronsRight className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
          </Button>

          {/* Jump to Page - Enhanced */}
          {showJumpToPage && totalPages > 10 && (
            <div className="flex items-center gap-3 ml-0 sm:ml-4 pl-0 sm:pl-4 border-l-0 sm:border-l border-gray-200/60 w-full sm:w-auto justify-center sm:justify-start">
              {!showJumpInput ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJumpInput(true)}
                  className="text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 ease-out"
                >
                  <span className="font-medium">Jump to page</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50/80 px-3 py-2 rounded-lg border border-gray-200/60">
                  <span className="text-sm text-gray-600 font-medium">Go to:</span>
                  <Input
                    ref={jumpInputRef}
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleJumpToPage();
                      } else if (e.key === 'Escape') {
                        setShowJumpInput(false);
                        setJumpToPage('');
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowJumpInput(false);
                        setJumpToPage('');
                      }, 200);
                    }}
                    className="w-16 h-8 text-sm font-medium border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 rounded-md"
                    placeholder="Page"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleJumpToPage}
                    disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                    className="h-8 px-3 text-xs font-medium border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 ease-out"
                  >
                    Go
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator - Enhanced */}
      {loading && (
        <div className="flex items-center gap-3 bg-blue-50/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-blue-200/60 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
          </div>
          <span className="text-sm font-medium text-blue-700">Loading...</span>
        </div>
      )}

      {/* Keyboard Shortcuts Help - Only show on larger screens */}
      {totalPages > 1 && !loading && (
        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 bg-gray-50/80 px-3 py-2 rounded-lg border border-gray-200/60">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
          <span className="font-medium">Shortcuts:</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">←</kbd>
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">→</kbd>
            <span className="text-gray-400">•</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">Home</kbd>
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">End</kbd>
            <span className="text-gray-400">•</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">PgUp</kbd>
            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">PgDn</kbd>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalPagination;
