import React, { useState } from 'react';
import { Collection, Customer, Route, PaymentType, CollectionStatus } from '../types';
import { Download, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface ReportsProps {
  collections: Collection[];
  customers: Customer[];
  routes: Route[];
}

type ReportType = 'DAILY_COLLECTION' | 'PENDING_CHEQUES' | 'RETURNED_CHEQUES' | 'ROUTE_SUMMARY';

const Reports: React.FC<ReportsProps> = ({ collections, customers, routes }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('DAILY_COLLECTION');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortKey(key);
      setSortOrder('ASC');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="ml-1 opacity-40" />;
    return sortOrder === 'ASC' ? <ChevronUp size={12} className="ml-1 text-brand-600" /> : <ChevronDown size={12} className="ml-1 text-brand-600" />;
  };

  const renderContent = () => {
    switch(activeReport) {
      case 'DAILY_COLLECTION': {
        const data = [...collections].sort((a, b) => {
          let valA: any = a[sortKey as keyof Collection] || '';
          let valB: any = b[sortKey as keyof Collection] || '';
          
          if (sortKey === 'customer_id') {
            valA = customers.find(c => c.customer_id === a.customer_id)?.business_name || '';
            valB = customers.find(c => c.customer_id === b.customer_id)?.business_name || '';
          }

          if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
          if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
          return 0;
        });

        return (
          <table className="min-w-full divide-y divide-brand-100">
            <thead className="bg-brand-50/50">
              <tr>
                <th onClick={() => toggleSort('collection_date')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                  <div className="flex items-center">Date <SortIcon col="collection_date" /></div>
                </th>
                <th onClick={() => toggleSort('customer_id')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                  <div className="flex items-center">Customer <SortIcon col="customer_id" /></div>
                </th>
                <th onClick={() => toggleSort('payment_type')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                  <div className="flex items-center">Type <SortIcon col="payment_type" /></div>
                </th>
                <th onClick={() => toggleSort('amount')} className="px-6 py-3 text-right text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                  <div className="flex items-center justify-end">Amount <SortIcon col="amount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 bg-white">
              {data.map(c => (
                <tr key={c.collection_id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{c.collection_date}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">{customers.find(cust => cust.customer_id === c.customer_id)?.business_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.payment_type}</td>
                  <td className="px-6 py-4 text-sm text-brand-900 text-right font-bold">${c.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      case 'PENDING_CHEQUES':
      case 'RETURNED_CHEQUES': {
        const targetStatus = activeReport === 'PENDING_CHEQUES' ? CollectionStatus.PENDING : CollectionStatus.RETURNED;
        const data = collections.filter(c => c.payment_type === PaymentType.CHEQUE && c.status === targetStatus)
          .sort((a, b) => {
            let valA: any = a[sortKey as keyof Collection] || '';
            let valB: any = b[sortKey as keyof Collection] || '';
            if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
            if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
            return 0;
          });

        return (
          <table className="min-w-full divide-y divide-brand-100">
            <thead className="bg-brand-50/50">
              <tr>
                <th onClick={() => toggleSort('cheque_number')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center">Cheque No <SortIcon col="cheque_number" /></div>
                </th>
                <th onClick={() => toggleSort('bank')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center">Bank <SortIcon col="bank" /></div>
                </th>
                <th onClick={() => toggleSort('realize_date')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center">Realize Date <SortIcon col="realize_date" /></div>
                </th>
                <th onClick={() => toggleSort('amount')} className="px-6 py-3 text-right text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center justify-end">Amount <SortIcon col="amount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 bg-white">
              {data.map(c => (
                <tr key={c.collection_id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold">{c.cheque_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.bank}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.realize_date}</td>
                  <td className="px-6 py-4 text-sm text-brand-900 text-right font-bold">${c.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      case 'ROUTE_SUMMARY': {
        const summary = routes.map(r => {
            const routeCustomers = customers.filter(c => c.route_id === r.route_id).map(c => c.customer_id);
            const routeCollections = collections.filter(c => routeCustomers.includes(c.customer_id));
            const total = routeCollections.reduce((sum, c) => sum + c.amount, 0);
            return { ...r, total, customerCount: routeCustomers.length };
        }).sort((a, b) => {
          let valA: any = (a as any)[sortKey] || 0;
          let valB: any = (b as any)[sortKey] || 0;
          if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
          if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
          return 0;
        });

        return (
          <table className="min-w-full divide-y divide-brand-100">
            <thead className="bg-brand-50/50">
              <tr>
                <th onClick={() => toggleSort('route_name')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center">Route <SortIcon col="route_name" /></div>
                </th>
                <th onClick={() => toggleSort('customerCount')} className="px-6 py-3 text-left text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center">Customers <SortIcon col="customerCount" /></div>
                </th>
                <th onClick={() => toggleSort('total')} className="px-6 py-3 text-right text-xs font-bold text-brand-700 uppercase cursor-pointer hover:bg-brand-100">
                   <div className="flex items-center justify-end">Total Collected <SortIcon col="total" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 bg-white">
              {summary.map(r => (
                <tr key={r.route_id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold">{r.route_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.customerCount}</td>
                  <td className="px-6 py-4 text-sm text-brand-900 text-right font-extrabold">${r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      default: return null;
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-brand-800">Reports</h1>
        <button className="flex items-center px-4 py-2 bg-white border border-brand-200 rounded-xl shadow-sm text-sm font-bold text-brand-600 hover:bg-brand-50 transition-all">
          <Download size={16} className="mr-2" /> Export PDF
        </button>
      </div>

      <div className="mb-6 flex overflow-x-auto space-x-2 pb-2">
        {[
          { id: 'DAILY_COLLECTION', label: 'Daily Collection' },
          { id: 'PENDING_CHEQUES', label: 'Pending Cheques' },
          { id: 'RETURNED_CHEQUES', label: 'Returned Cheques' },
          { id: 'ROUTE_SUMMARY', label: 'Route Summary' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => { setActiveReport(rep.id as ReportType); setSortKey(''); }}
            className={`whitespace-nowrap px-6 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
              activeReport === rep.id ? 'bg-brand-600 text-white border-brand-600 shadow-md scale-105' : 'bg-white text-brand-600 border-brand-100 hover:bg-brand-50'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-brand-100">
        <div className="overflow-x-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Reports;