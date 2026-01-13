import React, { useState } from 'react';
import { Collection, CollectionStatus, PaymentType } from '../types';
import { Calendar, ArrowUpDown, Landmark, ChevronUp, ChevronDown } from 'lucide-react';

interface ChequeManagerProps {
  collections: Collection[];
}

type SortKey = 'status' | 'cheque_number' | 'bank' | 'realize_date' | 'amount';

const ChequeManager: React.FC<ChequeManagerProps> = ({ collections }) => {
  const [filter, setFilter] = useState<'ALL' | 'DEPOSIT_READY'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('realize_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  let cheques = collections.filter(c => c.payment_type === PaymentType.CHEQUE);

  if (filter === 'DEPOSIT_READY') {
    cheques = cheques.filter(c => c.status === CollectionStatus.PENDING);
  }

  cheques.sort((a, b) => {
    let valA: any = a[sortKey as keyof Collection];
    let valB: any = b[sortKey as keyof Collection];

    // Special handling for nested or derived values
    if (sortKey === 'bank') valA = a.bank || '';
    if (sortKey === 'bank') valB = b.bank || '';

    if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
    if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortKey(key);
      setSortOrder('ASC');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="ml-1 opacity-40" />;
    return sortOrder === 'ASC' ? <ChevronUp size={12} className="ml-1 text-brand-600" /> : <ChevronDown size={12} className="ml-1 text-brand-600" />;
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-brand-800">Cheque Management</h1>
        <div className="flex p-1 bg-brand-100 rounded-xl space-x-1">
           <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filter === 'ALL' ? 'bg-brand-500 text-white shadow-sm' : 'text-brand-700 hover:bg-brand-200'}`}
          >
            All Cheques
          </button>
          <button
            onClick={() => setFilter('DEPOSIT_READY')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center ${filter === 'DEPOSIT_READY' ? 'bg-brand-500 text-white shadow-sm' : 'text-brand-700 hover:bg-brand-200'}`}
          >
            <Landmark size={14} className="mr-1" />
            Bank Deposit
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-50">
            <thead className="bg-brand-50/50">
              <tr>
                <th onClick={() => toggleSort('status')} className="px-6 py-4 text-left text-xs font-bold text-brand-700 uppercase tracking-wider cursor-pointer hover:bg-brand-100 transition-colors">
                  <div className="flex items-center">Status <SortIcon col="status" /></div>
                </th>
                <th onClick={() => toggleSort('cheque_number')} className="px-6 py-4 text-left text-xs font-bold text-brand-700 uppercase tracking-wider cursor-pointer hover:bg-brand-100 transition-colors">
                  <div className="flex items-center">Cheque No <SortIcon col="cheque_number" /></div>
                </th>
                <th onClick={() => toggleSort('bank')} className="px-6 py-4 text-left text-xs font-bold text-brand-700 uppercase tracking-wider cursor-pointer hover:bg-brand-100 transition-colors">
                  <div className="flex items-center">Bank/Branch <SortIcon col="bank" /></div>
                </th>
                <th onClick={() => toggleSort('realize_date')} className="px-6 py-4 text-left text-xs font-bold text-brand-700 uppercase tracking-wider cursor-pointer hover:bg-brand-100 transition-colors">
                  <div className="flex items-center">Realize Date <SortIcon col="realize_date" /></div>
                </th>
                <th onClick={() => toggleSort('amount')} className="px-6 py-4 text-right text-xs font-bold text-brand-700 uppercase tracking-wider cursor-pointer hover:bg-brand-100 transition-colors">
                  <div className="flex items-center justify-end">Amount <SortIcon col="amount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-50">
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-brand-400 font-medium italic">No cheques matching the criteria.</td>
                </tr>
              ) : (
                cheques.map((c) => (
                  <tr key={c.collection_id} className="hover:bg-brand-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm
                        ${c.status === CollectionStatus.RECEIVED || c.status === CollectionStatus.REALIZED ? 'bg-green-100 text-green-700' : 
                          c.status === CollectionStatus.PENDING ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{c.cheque_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.bank} <span className="text-gray-300 mx-1">|</span> {c.branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <div className="flex items-center text-brand-600">
                            <Calendar size={14} className="mr-2 opacity-60" />
                            {c.realize_date}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-700 text-right font-bold">
                      ${c.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChequeManager;