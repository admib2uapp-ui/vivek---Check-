import React, { useState, useMemo } from 'react';
import { LedgerEntry, GlobalSettings } from '../types';
import { BookOpen, Search, Trash2, CheckSquare, Square } from 'lucide-react';
import { formatFullAmount } from '../App';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';

interface LedgerProps {
  entries: LedgerEntry[];
  settings: GlobalSettings;
}

const Ledger: React.FC<LedgerProps> = ({ entries, settings }) => {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = entries.filter(e => 
      e.description.toLowerCase().includes(query.toLowerCase()) || 
      e.reference_id.includes(query)
    );
    
    return result;
  }, [entries, query]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.entry_id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} ledger entries?`)) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'ledger', id));
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center">
          <BookOpen className="mr-3 text-brand-600" /> General Ledger
        </h1>
        <div className="flex gap-4 items-center w-full md:w-auto">
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 font-bold transition-all text-xs">
              <Trash2 size={14} className="mr-2" /> Delete ({selectedIds.size})
            </button>
          )}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search ledger..." value={query} onChange={e => setQuery(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl border-2 border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 w-full" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-brand-500">
                    {selectedIds.size > 0 && selectedIds.size === filtered.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Collector</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No ledger entries found.</td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.entry_id} className={`hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${selectedIds.has(entry.entry_id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleSelect(entry.entry_id)} className="text-brand-500">
                        {selectedIds.has(entry.entry_id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">{entry.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">{entry.collector || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{entry.debit_account}</td>
                    <td className="px-6 py-4 text-right font-bold text-brand-700 dark:text-brand-400 font-mono whitespace-nowrap">{formatFullAmount(entry.amount, settings.currency_code)}</td>
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

export default Ledger;