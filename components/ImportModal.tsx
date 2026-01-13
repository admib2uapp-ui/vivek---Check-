import React, { useState } from 'react';
import { Customer, CustomerStatus } from '../types';
import { X, Upload, FileType, CheckCircle, Loader2 } from 'lucide-react';

interface ImportModalProps {
  onImport: (customers: Customer[]) => void;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleProcessImport = () => {
    if (!file) return;
    setIsUploading(true);
    
    // Simulate parsing delay
    setTimeout(() => {
      // Mocked parsed data from the file
      const mockImport: Customer[] = [
        {
          customer_id: `C-IMP-${Date.now()}-1`,
          customer_name: 'Imported Customer 1',
          business_name: 'Imported Biz A',
          address: 'Import Address 1',
          whatsapp_number: '',
          phone_number: '0770000001',
          location: '',
          credit_limit: 50000,
          credit_period_days: 30,
          route_id: 'R01',
          status: CustomerStatus.ACTIVE
        }
      ];
      onImport(mockImport);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-brand-100">
        <div className="flex justify-between items-center p-6 border-b border-brand-50">
          <h3 className="text-xl font-bold text-brand-800">Bulk Import Customers</h3>
          <button onClick={onClose} className="text-brand-400 p-2"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="border-2 border-dashed border-brand-200 rounded-2xl p-8 text-center bg-brand-50/30">
            <Upload size={40} className="mx-auto text-brand-300 mb-4" />
            <p className="text-sm font-bold text-brand-700">Drag and drop your file here</p>
            <p className="text-xs text-brand-400 mt-1 mb-4">Supported: PDF, CSV, Excel (.xlsx, .xls)</p>
            <input type="file" id="bulk-import" className="hidden" accept=".csv,.pdf,.xlsx,.xls" onChange={handleFileChange} />
            <label htmlFor="bulk-import" className="px-4 py-2 bg-white border border-brand-200 rounded-lg text-sm font-bold text-brand-600 cursor-pointer hover:bg-brand-100">
              {file ? file.name : 'Select File'}
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <div className="p-4 bg-brand-50 rounded-xl flex items-start">
              <CheckCircle size={16} className="text-brand-500 mr-2 mt-0.5" />
              <p className="text-xs text-brand-600">Ensure your file contains Business Name, Contact Name, and Phone Number as minimum requirements.</p>
            </div>
            
            <button 
              disabled={!file || isUploading}
              onClick={handleProcessImport}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${!file || isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-600 text-white shadow-lg hover:bg-brand-700'}`}
            >
              {isUploading ? <><Loader2 className="animate-spin mr-2" /> Processing...</> : 'Import Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;