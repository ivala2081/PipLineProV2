import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check,
  ExternalLink,
  FileText,
  BarChart3,
  TrendingUp,
  PieChart
} from 'lucide-react';

// ===== CHART LIBRARY INTEGRATION EXAMPLES =====
// These show exactly how to apply our business styles to different chart libraries

interface CodeExampleProps {
  title: string;
  description: string;
  code: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  library: string;
  libraryUrl: string;
}

function CodeExample({ title, description, code, language, library, libraryUrl }: CodeExampleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h4 className="business-chart-title text-lg">{title}</h4>
          <p className="business-chart-subtitle text-sm">{description}</p>
        </div>
        <div className="business-chart-actions">
          <a
            href={libraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="business-chart-filter-button"
            title={`Visit ${library} documentation`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute top-2 right-2">
          <button
            onClick={handleCopy}
            className="business-chart-filter-button text-xs"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ===== CHART.JS INTEGRATION EXAMPLE =====
export function ChartJsIntegration() {
  const chartJsCode = `// Chart.js with Business Styles
import { Line } from 'react-chartjs-2';

const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{
    label: 'Revenue',
    data: [12000, 19000, 15000, 25000, 22000, 30000],
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    fill: true,
    tension: 0.4
  }]
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false // We'll use our custom legend
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#E5E7EB',
        borderColor: '#D1D5DB'
      }
    },
    x: {
      grid: {
        color: '#E5E7EB',
        borderColor: '#D1D5DB'
      }
    }
  }
};

function RevenueChart() {
  return (
    <BusinessChartContainer
      title="Revenue Trends"
      subtitle="Monthly revenue performance"
      variant="elevated"
    >
      <div className="business-chart-responsive h-64">
        <Line data={chartData} options={chartOptions} />
      </div>
      
      <BusinessChartLegend
        items={[
          { label: 'Revenue', value: '₺123K', color: '#3B82F6' },
          { label: 'Growth', value: '+25%', color: '#10B981' }
        ]}
        className="mt-6"
      />
    </BusinessChartContainer>
  );
}`;

  return (
    <CodeExample
      title="Chart.js Integration"
      description="Professional line chart with Chart.js using our business styles"
      code={chartJsCode}
      language="tsx"
      library="Chart.js"
      libraryUrl="https://www.chartjs.org/"
    />
  );
}

// ===== RECHARTS INTEGRATION EXAMPLE =====
export function RechartsIntegration() {
  const rechartsCode = `// Recharts with Business Styles
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', revenue: 12000, transactions: 150 },
  { month: 'Feb', revenue: 19000, transactions: 220 },
  { month: 'Mar', revenue: 15000, transactions: 180 },
  { month: 'Apr', revenue: 25000, transactions: 300 },
  { month: 'May', revenue: 22000, transactions: 280 },
  { month: 'Jun', revenue: 30000, transactions: 350 }
];

function RevenueChart() {
  return (
    <BusinessChartContainer
      title="Revenue & Transactions"
      subtitle="Monthly performance metrics"
      variant="interactive"
    >
      <div className="business-chart-responsive h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#E5E7EB"
              strokeOpacity={0.5}
            />
            <XAxis 
              dataKey="month" 
              stroke="#6B7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
              tickFormatter={(value) => \`₺\${(value / 1000).toFixed(0)}K\`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="transactions" 
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <BusinessChartLegend
        items={[
          { label: 'Revenue', value: '₺123K', color: '#3B82F6' },
          { label: 'Transactions', value: '1,480', color: '#10B981' }
        ]}
        className="mt-6"
      />
    </BusinessChartContainer>
  );
}`;

  return (
    <CodeExample
      title="Recharts Integration"
      description="Professional line chart with Recharts using our business styles"
      code={rechartsCode}
      language="tsx"
      library="Recharts"
      libraryUrl="https://recharts.org/"
    />
  );
}

// ===== D3.JS INTEGRATION EXAMPLE =====
export function D3JsIntegration() {
  const d3Code = `// D3.js with Business Styles
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  month: string;
  value: number;
}

function D3BarChart({ data }: { data: DataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([height, 0]);

    const g = svg.append('g')
      .attr('transform', \`translate(\${margin.left},\${margin.top})\`);

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .style('stroke', '#E5E7EB')
      .style('stroke-opacity', 0.3);

    // Add bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.month) || 0)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .style('fill', '#3B82F6')
      .style('opacity', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .style('fill', '#2563EB');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .style('opacity', 0.8)
          .style('fill', '#3B82F6');
      });

    // Add axes
    g.append('g')
      .attr('transform', \`translate(0,\${height})\`)
      .call(d3.axisBottom(x))
      .style('color', '#6B7280')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(y))
      .style('color', '#6B7280')
      .style('font-size', '12px');

  }, [data]);

  return (
    <BusinessChartContainer
      title="Custom D3.js Chart"
      subtitle="Bar chart with custom D3.js implementation"
      variant="elevated"
    >
      <div className="business-chart-responsive h-64 flex items-center justify-center">
        <svg
          ref={svgRef}
          width="600"
          height="300"
          className="max-w-full h-auto"
        />
      </div>
    </BusinessChartContainer>
  );
}`;

  return (
    <CodeExample
      title="D3.js Integration"
      description="Custom bar chart with D3.js using our business styles"
      code={d3Code}
      language="tsx"
      library="D3.js"
      libraryUrl="https://d3js.org/"
    />
  );
}

// ===== CSS CONFIGURATION GUIDE =====
export function CSSConfigurationGuide() {
  const cssConfigCode = `/* CSS Configuration for Chart Libraries */

/* 1. Chart.js Customization */
.chartjs-render-monitor {
  @apply business-chart-responsive;
}

.chartjs-tooltip {
  @apply business-chart-tooltip;
}

.chartjs-legend {
  @apply business-chart-legend;
}

/* 2. Recharts Customization */
.recharts-wrapper {
  @apply business-chart-responsive;
}

.recharts-tooltip-wrapper {
  @apply business-chart-tooltip;
}

.recharts-legend-wrapper {
  @apply business-chart-legend;
}

/* 3. D3.js Customization */
.d3-chart {
  @apply business-chart-responsive;
}

.d3-tooltip {
  @apply business-chart-tooltip;
}

.d3-axis text {
  @apply text-gray-600 text-sm;
}

.d3-axis line {
  @apply stroke-gray-300;
}

.d3-axis path {
  @apply stroke-gray-400;
}

/* 4. Global Chart Styling */
.chart-container {
  @apply business-chart-container;
}

.chart-title {
  @apply business-chart-title;
}

.chart-subtitle {
  @apply business-chart-subtitle;
}

.chart-legend {
  @apply business-chart-legend;
}

.chart-filters {
  @apply business-chart-filters;
}`;

  return (
    <CodeExample
      title="CSS Configuration Guide"
      description="CSS rules to apply our business styles to any chart library"
      code={cssConfigCode}
      language="typescript"
      library="CSS"
      libraryUrl="#"
    />
  );
}

// ===== MAIN INTEGRATION SHOWCASE =====
export function ChartLibraryIntegrationShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Chart Library Integration Examples
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          See exactly how to apply our business chart styles to popular chart libraries. 
          Each example includes complete, working code that you can copy and use immediately.
        </p>
      </div>

      {/* Integration Examples */}
      <div className="space-y-8">
        <ChartJsIntegration />
        <RechartsIntegration />
        <D3JsIntegration />
        <CSSConfigurationGuide />
      </div>

      {/* Quick Start Guide */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">
          🚀 Quick Start Guide
        </h3>
        <div className="text-green-800 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="bg-green-200 rounded-full w-6 h-6 flex items-center justify-center text-green-800 text-xs font-bold mt-0.5">1</div>
            <div>
              <strong>Choose your chart library:</strong> Pick from Chart.js, Recharts, D3.js, or any other library
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-200 rounded-full w-6 h-6 flex items-center justify-center text-green-800 text-xs font-bold mt-0.5">2</div>
            <div>
              <strong>Wrap with BusinessChartContainer:</strong> Use our wrapper component for consistent styling
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-200 rounded-full w-6 h-6 flex items-center justify-center text-green-800 text-xs font-bold mt-0.5">3</div>
            <div>
              <strong>Apply CSS classes:</strong> Use our business-chart-* classes for styling
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-200 rounded-full w-6 h-6 flex items-center justify-center text-green-800 text-xs font-bold mt-0.5">4</div>
            <div>
              <strong>Add legends and filters:</strong> Use our BusinessChartLegend and BusinessChartFilters components
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4">
          <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Code className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Easy Integration</h4>
          <p className="text-sm text-gray-600">Works with any chart library without modification</p>
        </div>
        <div className="text-center p-4">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Consistent Styling</h4>
          <p className="text-sm text-gray-600">All charts look professional and cohesive</p>
        </div>
        <div className="text-center p-4">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Future Proof</h4>
          <p className="text-sm text-gray-600">Styles work with new chart libraries automatically</p>
        </div>
      </div>
    </div>
  );
}

export default ChartLibraryIntegrationShowcase;
