import React, { useState } from 'react';
import { Collection, CollectionStatus, PaymentType, BankStatementEntry } from '../types';
import { Upload, CheckCircle, RefreshCw, FileText, Landmark, Search, AlertCircle, ArrowRight } from 'lucide-react';

interface ReconciliationProps {
  collections: Collection[];
  onReconcile: (collectionIds: string[], status: CollectionStatus) => void;
}

const Reconciliation: React.FC<ReconciliationProps> = ({ collections, onReconcile }) => {
  const [statementData, setStatementData] = useState<BankStatementEntry[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2>(1); // 1: Upload, 2: Review & Match
  const [matchedItems, setMatchedItems] = useState<{collection: Collection, entry: BankStatementEntry}[]>([]);
  const [unmatchedCollections, setUnmatchedCollections] = useState<Collection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate statement parsing
      const mockStatement: BankStatementEntry[] = collections
        .filter(c => c.payment_type === PaymentType.CHEQUE && c.status === CollectionStatus.PENDING)
        .slice(0, 3)
        .map(c => ({
            id: `ST-${Math.random().toString(36).substr(2, 9)}`,
            date: c.realize_date || new Date().toISOString().split('T')[0],
            cheque_number: c.cheque_number || '',
            amount: c.amount,
            status: 'CLEARED' as const
        }));
      
      // Add one unknown entry for testing
      mockStatement.push({
        id: 'ST-UNKNOWN',
        date: new Date().toISOString().split('T')[0],
        cheque_number: '999999',
        amount: 12500,
        status: 'CLEARED'
      });

      setStatementData(mockStatement);
    }
  };

  const runReconciliationProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const matches: {collection: Collection, entry: BankStatementEntry}[] = [];
      const unmatched: Collection[] = [];
      
      const pendingCheques = collections.filter(c => c.payment_type === PaymentType.CHEQUE && c.status === CollectionStatus.PENDING);

      pendingCheques.forEach(col => {
        const match = statementData.find(entry => 
          entry.cheque_number === col.cheque_number && 
          entry.amount === col.amount
        );

        if (match) {
          matches.push({ collection: col, entry: match });
        } else {
          unmatched.push(col);
        }
      });

      setMatchedItems(matches);
      setUnmatchedCollections(unmatched);
      setIsProcessing(false);
      setActiveStep(2);
    }, 1200);
  };

  const confirmReconciliation = () => {
    const clearedIds = matchedItems.filter(m => m.entry.status === 'CLEARED').map(m => m.collection.collection_id);
    const returnedIds = matchedItems.filter(m => m.entry.status === 'RETURNED').map(m => m.collection.collection_id);
    
    if (clearedIds.length > 0) onReconcile(clearedIds, CollectionStatus.REALIZED);
    if (returnedIds.length > 0) onReconcile(returnedIds, CollectionStatus.RETURNED);
    
    setActiveStep(1);
    setStatementData([]);
    setMatchedItems([]);
    alert(`Successfully verified and reconciled ${matchedItems.length} cheques.`);
  };

  return (
    <div className="p-6 h-full overflow-y-auto pb-24 bg-gray-50 dark:bg-slate-950">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-800 dark:text-slate-100 flex items-center gap-2">
          <Landmark className="text-brand-600" /> Bank Reconciliation
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Step {activeStep}: {activeStep === 1 ? 'Import bank statement file' : 'Verify matches and confirm'}</p>
      </div>

      {activeStep === 1 && (
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-4 mb-8">
             <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold">1</div>
                <span className="text-[10px] mt-1 font-bold text-brand-600">UPLOAD</span>
             </div>
             <div className="h-px w-20 bg-gray-200 dark:bg-slate-800"></div>
             <div className="flex flex-col items-center opacity-30">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-800 text-gray-500 flex items-center justify-center font-bold">2</div>
                <span className="text-[10px] mt-1 font-bold">RECONCILE</span>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-sm border-2 border-dashed border-brand-200 dark:border-slate-800 text-center transition-all hover:border-brand-400">
            <div className="mx-auto w-20 h-20 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Upload size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 mb-2">Upload Bank Statement</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">Select your CSV or Excel export from the bank to start checking for realizations.</p>
            
            <input type="file" id="statement-upload" className="hidden" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" />
            
            {!statementData.length ? (
              <label htmlFor="statement-upload" className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-brand-700 transition shadow-xl inline-flex items-center gap-2 active:scale-95">
                <FileText size={20} /> Choose File
              </label>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-5 rounded-2xl flex items-center gap-4 mb-6">
                   <div className="bg-green-500 text-white p-2 rounded-full"><CheckCircle size={20} /></div>
                   <div className="text-left">
                      <p className="text-green-800 dark:text-green-400 font-bold">Statement Loaded</p>
                      <p className="text-xs text-green-600 dark:text-green-500">{statementData.length} entries found in file</p>
                   </div>
                </div>
                <button onClick={() => setStatementData([])} className="text-xs font-bold text-brand-600 hover:underline">Clear and try another file</button>
              </div>
            )}
          </div>

          {statementData.length > 0 && (
            <div className="flex justify-center pt-4">
              <button 
                onClick={runReconciliationProcess}
                disabled={isProcessing}
                className="group px-14 py-5 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 font-extrabold shadow-2xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={24} /> : <RefreshCw size={24} />}
                {isProcessing ? 'Processing Data...' : 'Reconciliation (Verify Matches)'}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
             <button onClick={() => setActiveStep(1)} className="text-sm font-bold text-brand-600 hover:underline flex items-center gap-1">
                ← Back to Upload
             </button>
             <div className="flex gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">
                  {matchedItems.length} Matches Found
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-1 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                  {unmatchedCollections.length} Unmatched
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-brand-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-brand-50 dark:border-slate-800 bg-brand-50/30 dark:bg-slate-800/30">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Search className="text-brand-600" /> Verification Results
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Cheque No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Bank Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {matchedItems.map((match, idx) => (
                    <tr key={idx} className="hover:bg-brand-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-slate-200">{match.collection.cheque_number}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-slate-300">${match.collection.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${match.entry.status === 'CLEARED' ? 'bg-green-100 text-green-700 dark:bg-green-900/40' : 'bg-red-100 text-red-700 dark:bg-red-900/40'}`}>
                          {match.entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
                          {match.entry.status === 'CLEARED' ? 'MOVE TO REALIZED' : 'MARK AS RETURNED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {matchedItems.length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">No matching records found in the uploaded statement.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {unmatchedCollections.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-amber-600 shrink-0 mt-1" size={24} />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-400">Review Pending ({unmatchedCollections.length} Items)</p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  The cheques listed in your system with numbers <strong>{unmatchedCollections.map(c => c.cheque_number).join(', ')}</strong> were not found in this statement. They will remain 'Pending'.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-4 pb-12 pt-4 border-t border-gray-100 dark:border-slate-800">
             <button onClick={() => { setActiveStep(1); setStatementData([]); }} className="px-8 py-4 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition">Discard and Restart</button>
             <button 
                onClick={confirmReconciliation} 
                className="px-12 py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 font-extrabold shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                disabled={matchedItems.length === 0}
             >
                <CheckCircle size={20} />
                Confirm and Save Status Changes
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reconciliation;