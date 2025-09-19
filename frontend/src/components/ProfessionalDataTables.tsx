import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  SortAsc,
  SortDesc,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// ===== PROFESSIONAL DATA TABLE COMPONENTS =====
// These provide business-ready data display with advanced functionality

// ===== TABLE HEADER COMPONENT =====
interface TableHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  onAdd?: () => void;
  onExport?: () => void;
}

export function TableHeader({ 
  title, 
  subtitle, 
  actions, 
  onRefresh, 
  onAdd, 
  onExport 
}: TableHeaderProps) {
  return (
    <div className="business-chart-header">
      <div>
        <h3 className="business-chart-title">{title}</h3>
        {subtitle && <p className="business-chart-subtitle">{subtitle}</p>}
      </div>
      <div className="business-chart-actions space-x-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="business-chart-filter-button"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="business-chart-filter-button bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Add new item"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="business-chart-filter-button"
            title="Export data"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}

// ===== SEARCH & FILTER COMPONENT =====
interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[];
}

export function SearchFilter({ 
  searchValue, 
  onSearchChange, 
  placeholder = "Search...",
  filters = []
}: SearchFilterProps) {
  return (
    <div className="business-chart-filters">
      {/* Search Input */}
      <div className="business-chart-filter-group">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="business-chart-filter-select pl-10"
          />
        </div>
      </div>

      {/* Additional Filters */}
      {filters.map((filter, index) => (
        <div key={index} className="business-chart-filter-group">
          <label className="business-chart-filter-label">{filter.label}</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="business-chart-filter-select"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ===== SORTABLE TABLE HEADER =====
interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  onSort, 
  className = '' 
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const isAsc = currentSort.direction === 'asc';

  return (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronUp 
            className={`w-3 h-3 ${isActive && isAsc ? 'text-gray-600' : 'text-gray-300'}`} 
          />
          <ChevronDown 
            className={`w-3 h-3 ${isActive && !isAsc ? 'text-gray-600' : 'text-gray-300'}`} 
          />
        </div>
      </div>
    </th>
  );
}

// ===== PAGINATION COMPONENT =====
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage 
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
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

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="business-chart-filter-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`
              px-3 py-1 text-sm rounded-md transition-colors
              ${page === currentPage
                ? 'bg-blue-600 text-white'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="business-chart-filter-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ===== DATA TABLE COMPONENT =====
interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  paginated?: boolean;
  itemsPerPage?: number;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  onAdd?: () => void;
  onExport?: () => void;
  filters?: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[];
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  sortable = true,
  searchable = true,
  filterable = true,
  paginated = true,
  itemsPerPage = 10,
  title,
  subtitle,
  onRefresh,
  onAdd,
  onExport,
  filters = [],
  actions
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const [currentSort, setCurrentSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: '',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search
    if (searchValue) {
      result = result.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (currentSort.key) {
      result = [...result].sort((a, b) => {
        const aVal = a[currentSort.key];
        const bVal = b[currentSort.key];
        
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchValue, currentSort]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage, paginated]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSort = (key: string) => {
    if (!sortable) return;
    
    setCurrentSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="business-chart-container-elevated">
      {/* Table Header */}
      {(title || onRefresh || onAdd || onExport) && (
        <TableHeader
          title={title || 'Data Table'}
          subtitle={subtitle}
          onRefresh={onRefresh}
          onAdd={onAdd}
          onExport={onExport}
        />
      )}

      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="px-6 pb-4">
          <SearchFilter
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
            placeholder="Search all columns..."
            filters={filters}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                column.sortable ? (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    sortKey={column.key}
                    currentSort={currentSort}
                    onSort={handleSort}
                    className={column.className}
                  />
                ) : (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  >
                    {column.label}
                  </th>
                )
              ))}
              {actions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}>
                    {column.render 
                      ? column.render(item[column.key], item)
                      : item[column.key]
                    }
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {actions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
        />
      )}

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">
            {searchValue ? 'Try adjusting your search or filters.' : 'No data available.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ===== DEMO DATA TABLE =====
export function DemoDataTable() {
  const [data] = useState([
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'Manager',
      department: 'Sales',
      status: 'Active',
      lastActive: '2024-01-15',
      salary: 75000
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Developer',
      department: 'Engineering',
      status: 'Active',
      lastActive: '2024-01-14',
      salary: 85000
    },
    {
      id: 3,
      name: 'Michael Brown',
      email: 'michael.brown@company.com',
      role: 'Analyst',
      department: 'Marketing',
      status: 'Inactive',
      lastActive: '2024-01-10',
      salary: 65000
    },
    {
      id: 4,
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      role: 'Designer',
      department: 'Design',
      status: 'Active',
      lastActive: '2024-01-15',
      salary: 70000
    },
    {
      id: 5,
      name: 'David Wilson',
      email: 'david.wilson@company.com',
      role: 'Developer',
      department: 'Engineering',
      status: 'Active',
      lastActive: '2024-01-13',
      salary: 90000
    }
  ]);

  const columns = [
    { key: 'id', label: 'ID', sortable: true, className: 'w-16' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    { key: 'lastActive', label: 'Last Active', sortable: true },
    { 
      key: 'salary', 
      label: 'Salary', 
      sortable: true,
      render: (value: number) => `₺${value.toLocaleString()}`
    }
  ];

  const filters = [
    {
      label: 'Department',
      value: '',
      options: [
        { value: '', label: 'All Departments' },
        { value: 'Sales', label: 'Sales' },
        { value: 'Engineering', label: 'Engineering' },
        { value: 'Marketing', label: 'Marketing' },
        { value: 'Design', label: 'Design' }
      ],
      onChange: () => {}
    },
    {
      label: 'Status',
      value: '',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
      ],
      onChange: () => {}
    }
  ];

  const actions = (item: any) => (
    <div className="flex items-center space-x-2">
      <button className="text-gray-600 hover:text-gray-800" title="View">
        <Eye className="w-4 h-4" />
      </button>
      <button className="text-green-600 hover:text-green-800" title="Edit">
        <Edit className="w-4 h-4" />
      </button>
      <button className="text-red-600 hover:text-red-800" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      title="Employee Management"
      subtitle="Manage company employees and their information"
      searchable={true}
      filterable={true}
      sortable={true}
      paginated={true}
      itemsPerPage={3}
      onRefresh={() => alert('Refresh functionality would be implemented here')}
      onAdd={() => alert('Add functionality would be implemented here')}
      onExport={() => alert('Export functionality would be implemented here')}
      filters={filters}
      actions={actions}
    />
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalDataTablesShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Data Tables & Grids
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Business-ready data tables with advanced features like sorting, filtering, 
          pagination, and responsive design. Perfect for displaying large datasets professionally.
        </p>
      </div>

      {/* Demo Data Table */}
      <DemoDataTable />

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <SortAsc className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smart Sorting</h4>
          <p className="text-sm text-gray-600">Click any column header to sort data ascending or descending</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Advanced Search</h4>
          <p className="text-sm text-gray-600">Search across all columns with real-time filtering</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Filter className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Custom Filters</h4>
          <p className="text-sm text-gray-600">Add dropdown filters for specific columns</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Pagination</h4>
          <p className="text-sm text-gray-600">Navigate through large datasets with smart pagination</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Download className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Export & Actions</h4>
          <p className="text-sm text-gray-600">Export data and perform actions on individual rows</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Eye className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Responsive Design</h4>
          <p className="text-sm text-gray-600">Works perfectly on all devices and screen sizes</p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use Professional Data Tables
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Define Columns:</strong> Create column definitions with sorting, rendering, and styling options</p>
          <p><strong>2. Configure Features:</strong> Enable/disable search, filtering, sorting, and pagination as needed</p>
          <p><strong>3. Add Actions:</strong> Include row actions like view, edit, delete with custom icons</p>
          <p><strong>4. Custom Styling:</strong> Use our business CSS classes for consistent professional appearance</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalDataTablesShowcase;
