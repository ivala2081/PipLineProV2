import React from 'react';

// Professional Section Header Component
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ''
}) => {
  return (
    <div className={`enterprise-card ${className}`} style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ padding: 'var(--space-4)' }}>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between' style={{ gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              <div 
                className="rounded-md flex items-center justify-center"
                style={{ 
                  width: 'var(--space-6)', 
                  height: 'var(--space-6)',
                  background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-turquoise) 100%)'
                }}
              >
                <div 
                  className="bg-white rounded-sm" 
                  style={{ width: 'var(--space-2)', height: 'var(--space-2)' }}
                />
              </div>
              <h2 className='enterprise-section-header'>
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className='enterprise-body' style={{ marginLeft: 'var(--space-8)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className='flex items-center' style={{ gap: 'var(--space-2)' }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Professional Grid Container Component
interface GridContainerProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const GridContainer: React.FC<GridContainerProps> = ({ 
  children, 
  cols = 4, 
  gap = 'lg', 
  className = '' 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'business-grid-2',
    3: 'business-grid-3',
    4: 'business-grid-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'
  };

  const gridGaps = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-5',
    xl: 'gap-6'
  };

  return (
    <div className={`${gridCols[cols]} ${gridGaps[gap]} ${className}`}>
      {children}
    </div>
  );
};

// Professional Card Grid Component
interface CardGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({ 
  children, 
  cols = 4, 
  gap = 'lg', 
  className = '' 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'
  };

  const gridGaps = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-5',
    xl: 'gap-6'
  };

  return (
    <div className={`grid ${gridCols[cols]} ${gridGaps[gap]} ${className}`}>
      {children}
    </div>
  );
};

// Professional Section Component
interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Section: React.FC<SectionProps> = ({ 
  children, 
  title, 
  subtitle, 
  actions, 
  className = '',
  spacing = 'lg'
}) => {
  const sectionSpacing = {
    sm: 'mb-3',
    md: 'mb-4',
    lg: 'mb-6',
    xl: 'mb-8'
  };

  return (
    <section className={`${sectionSpacing[spacing]} ${className}`}>
      {(title || actions) && (
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 rounded-2xl border border-gray-200/60 shadow-lg backdrop-blur-sm mb-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/3 via-transparent to-purple-600/3" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/8 to-transparent rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-purple-400/8 to-transparent rounded-full translate-y-10 -translate-x-10" />
          
          {/* Content */}
          <div className="relative p-6 lg:p-8">
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div className='space-y-3'>
                {/* Icon and Title */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <div className="w-6 h-6 bg-white/90 rounded-lg flex items-center justify-center">
                      <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm" />
                    </div>
                  </div>
                  <h2 className='text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent tracking-tight'>
                    {title}
                  </h2>
                </div>
                {subtitle && (
                  <p className='text-base lg:text-lg text-gray-600 ml-16 max-w-2xl leading-relaxed'>
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className='flex items-center gap-3'>
                  {actions}
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Accent */}
          <div className="h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />
        </div>
      )}
      
      {/* Content with left accent */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-transparent rounded-full"></div>
        <div className="ml-4">
          {children}
        </div>
      </div>
    </section>
  );
};

// Professional Container Component
interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  size = 'lg', 
  className = '',
  spacing = 'lg'
}) => {
  const containerSizes = {
    sm: 'max-w-3xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none'
  };

  const containerSpacing = {
    sm: 'px-6 py-8',
    md: 'px-8 py-10',
    lg: 'px-10 py-14',
    xl: 'px-12 py-18'
  };

  return (
    <div className={`mx-auto ${containerSizes[size]} ${containerSpacing[spacing]} ${className}`}>
      {children}
    </div>
  );
};

// Professional Row Component
interface RowProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export const Row: React.FC<RowProps> = ({ 
  children, 
  className = '',
  spacing = 'md',
  align = 'start',
  justify = 'start'
}) => {
  const rowSpacing = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-5',
    xl: 'gap-6'
  };

  const rowAlign = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  const rowJustify = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  return (
    <div className={`flex flex-col sm:flex-row ${rowSpacing[spacing]} ${rowAlign[align]} ${rowJustify[justify]} ${className}`}>
      {children}
    </div>
  );
};

// Professional Column Component
interface ColumnProps {
  children: React.ReactNode;
  size?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
  responsive?: boolean;
}

export const Column: React.FC<ColumnProps> = ({ 
  children, 
  size = 12, 
  className = '',
  responsive = true
}) => {
  const columnSizes = {
    1: 'w-full sm:w-1/12',
    2: 'w-full sm:w-2/12',
    3: 'w-full sm:w-3/12',
    4: 'w-full sm:w-4/12',
    5: 'w-full sm:w-5/12',
    6: 'w-full sm:w-6/12',
    7: 'w-full sm:w-7/12',
    8: 'w-full sm:w-8/12',
    9: 'w-full sm:w-9/12',
    10: 'w-full sm:w-10/12',
    11: 'w-full sm:w-11/12',
    12: 'w-full'
  };

  if (!responsive) {
    return (
      <div className={`${columnSizes[size]} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`${columnSizes[size]} ${className}`}>
      {children}
    </div>
  );
};

// Professional Divider Component
interface DividerProps {
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'solid' | 'dashed' | 'dotted';
}

export const Divider: React.FC<DividerProps> = ({ 
  className = '',
  spacing = 'lg',
  variant = 'solid'
}) => {
  const dividerSpacing = {
    sm: 'my-6',
    md: 'my-8',
    lg: 'my-10',
    xl: 'my-14'
  };

  const dividerVariants = {
    solid: 'border-t border-gray-200',
    dashed: 'border-t border-dashed border-gray-300',
    dotted: 'border-t border-dotted border-gray-300'
  };

  return (
    <div className={`${dividerSpacing[spacing]} ${dividerVariants[variant]} ${className}`} />
  );
};

// Professional Spacer Component
interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export const Spacer: React.FC<SpacerProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const spacerSizes = {
    xs: 'h-3',
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
    '2xl': 'h-20',
    '3xl': 'h-28'
  };

  return (
    <div className={`${spacerSizes[size]} ${className}`} />
  );
};

// Professional Page Header Component
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  breadcrumbs, 
  actions, 
  className = '' 
}) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/40 rounded-2xl border border-gray-200/60 shadow-lg backdrop-blur-sm ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/3 via-transparent to-purple-600/3" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-400/8 to-transparent rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-purple-400/8 to-transparent rounded-full translate-y-14 -translate-x-14" />
      
      {/* Content */}
      <div className="relative p-6 lg:p-8">
        {breadcrumbs && (
          <div className='mb-6'>
            {breadcrumbs}
          </div>
        )}
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
          <div className='space-y-4'>
            {/* Icon and Title */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm" />
                </div>
              </div>
              <div>
                <h1 className='text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent tracking-tight'>
                  {title}
                </h1>
                {subtitle && (
                  <p className='text-lg lg:text-xl text-gray-600 mt-2 max-w-3xl leading-relaxed'>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          {actions && (
            <div className='flex items-center gap-3'>
              {actions}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Accent */}
      <div className="h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />
    </div>
  );
};

// Professional Content Area Component
interface ContentAreaProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ContentArea: React.FC<ContentAreaProps> = ({ 
  children, 
  className = '',
  spacing = 'lg'
}) => {
  const contentSpacing = {
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-5',
    xl: 'space-y-6'
  };

  return (
    <div className={`${contentSpacing[spacing]} ${className}`}>
      {children}
    </div>
  );
};

export default {
  SectionHeader,
  GridContainer,
  CardGrid,
  Section,
  Container,
  Row,
  Column,
  Divider,
  Spacer,
  PageHeader,
  ContentArea
};
