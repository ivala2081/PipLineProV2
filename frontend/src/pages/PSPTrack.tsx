import { useState } from 'react';
import {
  Building,
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  Filter,
} from 'lucide-react';
import { 
  UnifiedCard, 
  UnifiedButton, 
  UnifiedBadge, 
  UnifiedSection, 
  UnifiedGrid 
} from '../design-system';
import { Breadcrumb } from '../components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

interface PSPTrack {
  id: number;
  pspName: string;
  date: string;
  amount: number;
  withdraw: number;
  commissionRate: number;
  commissionAmount: number;
  difference: number;
  allocation: string;
  createdAt: string;
  updatedAt: string;
}

const mockPSPTracks: PSPTrack[] = [
  {
    id: 1,
    pspName: 'Stripe',
    date: '2024-01-15',
    amount: 50000,
    withdraw: 48000,
    commissionRate: 4.0,
    commissionAmount: 2000,
    difference: 0,
    allocation: 'Primary',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    pspName: 'PayPal',
    date: '2024-01-15',
    amount: 30000,
    withdraw: 28500,
    commissionRate: 5.0,
    commissionAmount: 1500,
    difference: 0,
    allocation: 'Secondary',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 3,
    pspName: 'Square',
    date: '2024-01-14',
    amount: 25000,
    withdraw: 23750,
    commissionRate: 5.0,
    commissionAmount: 1250,
    difference: 0,
    allocation: 'Backup',
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z',
  },
];

export default function PSPTrack() {
  const [pspTracks, setPSPTracks] = useState<PSPTrack[]>(mockPSPTracks);
  const [searchTerm, setSearchTerm] = useState('');
  const [pspFilter, setPSPFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const filteredPSPTracks = pspTracks.filter(track => {
    const matchesSearch = track.pspName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesPSP = pspFilter === 'all' || track.pspName === pspFilter;
    const matchesDate = dateFilter === 'all' || track.date === dateFilter;

    return matchesSearch && matchesPSP && matchesDate;
  });

  const totalAmount = filteredPSPTracks.reduce(
    (sum, track) => sum + track.amount,
    0
  );
  const totalWithdraw = filteredPSPTracks.reduce(
    (sum, track) => sum + track.withdraw,
    0
  );
  const totalCommission = filteredPSPTracks.reduce(
    (sum, track) => sum + track.commissionAmount,
    0
  );
  const uniquePSPs = [
    ...new Set(filteredPSPTracks.map(track => track.pspName)),
  ];

  return (
    <>
      <div className="p-6">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/' },
              { label: 'PSP Tracking', current: true }
            ]} 
          />
        </div>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-600" />
              PSP Tracking
            </h1>
            <p className="text-gray-600">Monitor Payment Service Provider transactions and commissions</p>
          </div>
          <div className="flex items-center gap-3">
            <UnifiedButton
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              iconPosition="left"
            >
              Import
            </UnifiedButton>
            <UnifiedButton
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              iconPosition="left"
            >
              Export
            </UnifiedButton>
              <UnifiedButton
                variant="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                iconPosition="left"
              >
                Add PSP Track
              </UnifiedButton>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards Section */}
        <UnifiedCard variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance Overview
            </CardTitle>
            <CardDescription>
              Key metrics for PSP operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className='card'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <DollarSign className='h-6 w-6 text-blue-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Total Amount
                  </dt>
                  <dd className='text-2xl font-semibold text-gray-900'>
                    ${totalAmount.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <TrendingUp className='h-6 w-6 text-green-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Total Withdraw
                  </dt>
                  <dd className='text-2xl font-semibold text-gray-900'>
                    ${totalWithdraw.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <BarChart3 className='h-6 w-6 text-yellow-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Total Commission
                  </dt>
                  <dd className='text-2xl font-semibold text-gray-900'>
                    ${totalCommission.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <Building className='h-6 w-6 text-purple-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Active PSPs
                  </dt>
                  <dd className='text-2xl font-semibold text-gray-900'>
                    {uniquePSPs.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
            </div>
          </CardContent>
        </UnifiedCard>

      {/* Filters and Search Section */}
      <UnifiedCard variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Find specific PSP tracks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='Search PSPs...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>
            </div>

            <div className='flex gap-3'>
              <select
                value={pspFilter}
                onChange={e => setPSPFilter(e.target.value)}
                className='border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              >
                <option value='all'>All PSPs</option>
                {uniquePSPs.map(psp => (
                  <option key={psp} value={psp}>
                    {psp}
                  </option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className='border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              >
                <option value='all'>All Dates</option>
                {[...new Set(pspTracks.map(track => track.date))].map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </UnifiedCard>

      {/* PSP Tracks Table Section */}
      <UnifiedCard variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            PSP Tracks
          </CardTitle>
          <CardDescription>
            Detailed view of all PSP transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    PSP Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Withdraw
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Commission Rate
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Commission Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Difference
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Allocation
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredPSPTracks.map(track => (
                  <tr key={track.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center'>
                          <Building className='h-5 w-5 text-primary-600' />
                        </div>
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900'>
                            {track.pspName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {new Date(track.date).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      ${track.amount.toLocaleString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      ${track.withdraw.toLocaleString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {track.commissionRate}%
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      ${track.commissionAmount.toLocaleString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      ${track.difference.toLocaleString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          track.allocation === 'Primary'
                            ? 'bg-blue-100 text-blue-800'
                            : track.allocation === 'Secondary'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {track.allocation}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex gap-2'>
                        <button className='text-primary-600 hover:text-primary-900'>
                          <Eye className='h-4 w-4' />
                        </button>
                        <button className='text-blue-600 hover:text-blue-900'>
                          <Edit className='h-4 w-4' />
                        </button>
                        <button className='text-red-600 hover:text-red-900'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPSPTracks.length === 0 && (
            <div className='text-center py-12'>
              <Building className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>
                No PSP tracks found
              </h3>
              <p className='mt-1 text-sm text-gray-500'>
                {searchTerm || pspFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding your first PSP track.'}
              </p>
              <div className='mt-6'>
                <button className='btn-primary'>
                  <Plus className='h-4 w-4 mr-2' />
                  Add PSP Track
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </UnifiedCard>

      {/* PSP Analytics Summary Section */}
      <UnifiedCard variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Analytics & Insights
          </CardTitle>
          <CardDescription>
            Performance overview and recent activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              PSP Performance
            </h3>
            <div className='space-y-4'>
              {uniquePSPs.map(psp => {
                const pspTracks = filteredPSPTracks.filter(
                  track => track.pspName === psp
                );
                const totalAmount = pspTracks.reduce(
                  (sum, track) => sum + track.amount,
                  0
                );
                const totalCommission = pspTracks.reduce(
                  (sum, track) => sum + track.commissionAmount,
                  0
                );
                const avgCommissionRate =
                  pspTracks.reduce(
                    (sum, track) => sum + track.commissionRate,
                    0
                  ) / pspTracks.length;

                return (
                  <div
                    key={psp}
                    className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'
                  >
                    <div>
                      <h4 className='font-medium text-gray-900'>{psp}</h4>
                      <p className='text-sm text-gray-500'>
                        {pspTracks.length} transactions
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='font-medium text-gray-900'>
                        ${totalAmount.toLocaleString()}
                      </p>
                      <p className='text-sm text-gray-500'>
                        {avgCommissionRate.toFixed(1)}% avg rate
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Recent Activity
            </h3>
            <div className='space-y-4'>
              {filteredPSPTracks.slice(0, 5).map(track => (
                <div
                  key={track.id}
                  className='flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0'
                >
                  <div className='flex items-center'>
                    <div className='w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
                      <Building className='h-4 w-4 text-primary-600' />
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm font-medium text-gray-900'>
                        {track.pspName}
                      </p>
                      <p className='text-sm text-gray-500'>
                        {new Date(track.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-medium text-gray-900'>
                      ${track.amount.toLocaleString()}
                    </p>
                    <p className='text-sm text-gray-500'>
                      {track.commissionRate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </CardContent>
      </UnifiedCard>
      </div>
    </>
  );
}
