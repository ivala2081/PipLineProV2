import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  mobilePriority?: 'high' | 'medium' | 'low';
  render?: (value: any, row: any) => React.ReactNode;
  mobileRender?: (value: any, row: any) => React.ReactNode;
}

interface MobileOptimizedTableProps {
  columns: Column[];
  data: any[];
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: any) => void;
  actions?: {
    view?: (row: any) => void;
    edit?: (row: any) => void;
    delete?: (row: any) => void;
  };
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export const MobileOptimizedTable: React.FC<MobileOptimizedTableProps> = ({
  columns,
  data,
  sortable = false,
  onSort,
  onRowClick,
  actions,
  className = '',
  emptyMessage = 'No data available',
  loading = false
}) => {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleSort = (key: string) => {
    if (!sortable || !onSort) return;
    
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort(key, newDirection);
  };

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const getRowId = (row: any, index: number) => row.id || row.key || `row-${index}`;

  const getMobilePriorityColumns = () => {
    return columns.filter(col => col.mobilePriority === 'high');
  };

  const getDesktopColumns = () => {
    return columns.filter(col => col.mobilePriority !== 'low');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-transparent"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {getDesktopColumns().map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    sortable && column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.key === sortKey && 'bg-gray-50'
                  )}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={clsx(
                            'h-3 w-3',
                            sortKey === column.key && sortDirection === 'asc' 
                              ? 'text-gray-600' 
                              : 'text-gray-400'
                          )}
                        />
                        <ChevronDown 
                          className={clsx(
                            'h-3 w-3 -mt-1',
                            sortKey === column.key && sortDirection === 'desc' 
                              ? 'text-gray-600' 
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={getRowId(row, index)}
                className={clsx(
                  'hover:bg-gray-50 transition-colors duration-150',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {getDesktopColumns().map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {actions.view && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.view!(row);
                          }}
                          className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors duration-150"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {actions.edit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.edit!(row);
                          }}
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors duration-150"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {actions.delete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.delete!(row);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.map((row, index) => {
          const rowId = getRowId(row, index);
          const isExpanded = expandedRows.has(rowId);
          const priorityColumns = getMobilePriorityColumns();
          
          return (
            <div
              key={rowId}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Primary Information */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                onClick={() => toggleRowExpansion(rowId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {priorityColumns.map((column) => (
                      <div key={column.key} className="mb-2 last:mb-0">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {column.label}:
                        </span>
                        <div className="text-sm text-gray-900 mt-1">
                          {column.mobileRender 
                            ? column.mobileRender(row[column.key], row)
                            : column.render 
                            ? column.render(row[column.key], row)
                            : row[column.key]
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {columns
                      .filter(col => !priorityColumns.includes(col))
                      .map((column) => (
                        <div key={column.key}>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {column.label}:
                          </span>
                          <div className="text-sm text-gray-900 mt-1">
                            {column.mobileRender 
                              ? column.mobileRender(row[column.key], row)
                              : column.render 
                              ? column.render(row[column.key], row)
                              : row[column.key]
                            }
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Mobile Actions */}
                  {actions && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-3">
                        {actions.view && (
                          <button
                            onClick={() => actions.view!(row)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </button>
                        )}
                        {actions.edit && (
                          <button
                            onClick={() => actions.edit!(row)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-150"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                        )}
                        {actions.delete && (
                          <button
                            onClick={() => actions.delete!(row)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-150"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileOptimizedTable;
