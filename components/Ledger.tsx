import React from 'react';
import { LedgerEntry } from '../types';
import { BookOpen } from 'lucide-react';

interface LedgerProps {
  entries: LedgerEntry[];
}

const Ledger: React.FC<LedgerProps> = ({ entries }) => {
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 h-full overflow-y-auto pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <BookOpen className="mr-3 text-brand-600" />
        General Ledger
      </h1>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Account</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No transactions recorded.</td>
                </tr>
              ) : (
                sortedEntries.map((entry) => (
                  <tr key={entry.entry_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{entry.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.debit_account}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.credit_account}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      ${entry.amount.toFixed(2)}
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

export default Ledger;
