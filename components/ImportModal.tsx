import React, { useMemo, useState } from 'react';
import { Customer, CustomerStatus, Route } from '../types';
import { X, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  onImport: (customers: Customer[]) => void;
  onClose: () => void;
  routes?: Route[];
}

const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose, routes = [] }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routeIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of routes) {
      const key = (r.route_name || '').trim().toLowerCase();
      if (key) map.set(key, r.route_id);
    }
    return map;
  }, [routes]);

  const normalizeHeader = (raw: string) => {
    // Normalize to make matching CSV headers resilient (BOM, underscores, extra spaces, punctuation).
    const noBom = raw.replace(/^\uFEFF/, '');
    return noBom
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const guessDelimiter = (headerLine: string) => {
    // Common exports use ',' but some locales use ';'
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semiCount = (headerLine.match(/;/g) || []).length;
    return semiCount > commaCount ? ';' : ',';
  };

  const parseCsvLine = (line: string, delimiter: string) => {
    // Minimal CSV parser: handles quoted fields and escaped quotes.
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const getHeaderIndex = (headers: string[], candidates: string[]) => {
    for (const candidate of candidates) {
      const idx = headers.indexOf(normalizeHeader(candidate));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const getValueAt = (cols: string[], idx: number) => {
    if (idx < 0 || idx >= cols.length) return '';
    return (cols[idx] ?? '').trim();
  };

  const resolveRouteId = (raw: string) => {
    const value = (raw || '').trim();
    if (!value) return '';
    // If CSV already contains a route_id, keep it.
    if (routes.some(r => r.route_id === value)) return value;
    // Otherwise treat it as a route name.
    const byName = routeIdByName.get(value.toLowerCase());
    return byName || value;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcessImport = () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text
          .split(/\r?\n/)
          .map(r => r.trimEnd())
          .filter(row => row.trim() !== '');
        
        if (rows.length < 2) throw new Error("File seems empty or invalid format.");

        const delimiter = guessDelimiter(rows[0]);
        const headers = parseCsvLine(rows[0], delimiter).map(h => normalizeHeader(h));
        const customers: Customer[] = [];

        const businessNameIdx = getHeaderIndex(headers, ['business_name', 'business name', 'shop/business name', 'shop name', 'shop']);
        const customerNameIdx = getHeaderIndex(headers, ['customer_name', 'customer name', 'name']);
        const phoneIdx = getHeaderIndex(headers, ['phone_number', 'phone number', 'phone', 'mobile', 'mobile number']);
        const addressIdx = getHeaderIndex(headers, ['residential address', 'address']);
        const whatsappIdx = getHeaderIndex(headers, ['whatsapp number', 'whatsapp', 'whatsapp_number']);
        const creditLimitIdx = getHeaderIndex(headers, ['credit limit ($)', 'credit limit', 'credit_limit']);
        const creditPeriodIdx = getHeaderIndex(headers, ['credit period (days)', 'credit period', 'credit_period_days']);
        const routeIdx = getHeaderIndex(headers, ['assigned route', 'assigned_route', 'route', 'route id', 'route_id', 'route name']);

        for (let i = 1; i < rows.length; i++) {
          const cols = parseCsvLine(rows[i], delimiter);
          const bizName = getValueAt(cols, businessNameIdx) || getValueAt(cols, 0);
          const custName = getValueAt(cols, customerNameIdx) || getValueAt(cols, 1);
          const phone = getValueAt(cols, phoneIdx) || getValueAt(cols, 3);
          
          if (!bizName || !phone) continue;

          const rawRoute = getValueAt(cols, routeIdx) || getValueAt(cols, 2);
          const route_id = resolveRouteId(rawRoute);

          customers.push({
            customer_id: `C-IMP-${Date.now()}-${i}`,
            customer_name: custName || bizName,
            business_name: bizName,
            address: getValueAt(cols, addressIdx) || getValueAt(cols, 7),
            whatsapp_number: getValueAt(cols, whatsappIdx) || getValueAt(cols, 6),
            phone_number: phone,
            location: '',
            credit_limit: parseFloat(getValueAt(cols, creditLimitIdx)) || 50000,
            credit_period_days: parseInt(getValueAt(cols, creditPeriodIdx)) || 30,
            route_id,
            status: CustomerStatus.ACTIVE
          });
        }

        if (customers.length === 0) throw new Error("No valid customer data found in file.");
        
        onImport(customers);
        setIsUploading(false);
      } catch (err: any) {
        setError(err.message || "Failed to parse CSV file.");
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-900/40 dark:bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-brand-100 dark:border-slate-800">
        <div className="flex justify-between items-center p-6 border-b border-brand-50 dark:border-slate-800">
          <h3 className="text-xl font-bold text-brand-800 dark:text-slate-100">Bulk Import Customers</h3>
          <button onClick={onClose} className="text-brand-400 p-2 hover:bg-brand-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="border-2 border-dashed border-brand-200 dark:border-slate-700 rounded-2xl p-8 text-center bg-brand-50/30 dark:bg-slate-800/30">
            <Upload size={40} className="mx-auto text-brand-300 mb-4" />
            <p className="text-sm font-bold text-brand-700 dark:text-slate-300">Drag and drop your CSV file here</p>
            <p className="text-[10px] text-brand-400 mt-1 mb-4 italic">Format: Shop Name, Customer Name, Route, Phone...</p>
            <input type="file" id="bulk-import" className="hidden" accept=".csv" onChange={handleFileChange} />
            <label htmlFor="bulk-import" className="px-6 py-2 bg-white dark:bg-slate-800 border border-brand-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-600 cursor-pointer hover:bg-brand-100 transition-colors">
              {file ? file.name : 'Choose CSV File'}
            </label>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center text-xs border border-red-100">
              <AlertCircle size={14} className="mr-2 shrink-0" /> {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <button 
              disabled={!file || isUploading}
              onClick={handleProcessImport}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${!file || isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-600 text-white shadow-lg hover:bg-brand-700 active:scale-95'}`}
            >
              {isUploading ? <><Loader2 className="animate-spin mr-2" /> Processing...</> : 'Process Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;