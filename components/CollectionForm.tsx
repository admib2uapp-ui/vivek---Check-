import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Customer, Route, PaymentType, Collection, CollectionStatus, GlobalSettings } from '../types';
import { Camera, Loader2, MapPin, User, Calendar } from 'lucide-react';
import { analyzeChequeImage } from '../services/geminiService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatFullAmount } from '../App';

const SRI_LANKAN_BANKS = [
  "Amana Bank PLC (7463)", "Bank of Ceylon (7010)", "Cargills Bank PLC", "Citibank, N.A. (7047)", 
  "Commercial Bank of Ceylon PLC (7056)", "Deutsche Bank AG (7205)", "DFCC Bank PLC (7454)", 
  "Habib Bank Ltd (7074)", "Hatton National Bank PLC (7083)", "Indian Bank (7108)", 
  "Indian Overseas Bank (7117)", "MCB Bank Ltd (7269)", "National Development Bank PLC (7214)", 
  "Nations Trust Bank PLC (7162)", "Pan Asia Banking Corporation PLC (7311)", "Peoples Bank (7135)", 
  "Public Bank (7296)", "Sampath Bank PLC (7278)", "Seylan Bank PLC (7287)", 
  "Standard Chartered Bank (7038)", "State Bank of India (7144)", "Union Bank of Colombo PLC (7302)"
];

interface CollectionFormProps {
  customers: Customer[];
  settings?: GlobalSettings;
  onSave: (collection: Omit<Collection, 'collection_id'>) => void;
  onCancel: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ customers, settings, onSave, onCancel }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [amount, setAmount] = useState('');
  
  const [chequeNumber, setChequeNumber] = useState('');
  const [bank, setBank] = useState('');
  const [branch, setBranch] = useState('');
  const [realizeDate, setRealizeDate] = useState('');
  const [chequeImage, setChequeImage] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStep, setSaveStep] = useState<'IDLE' | 'CONFIRMING'>('IDLE');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'routes'), (snapshot) => {
      setRoutes(snapshot.docs.map(d => ({ ...d.data(), route_id: d.id } as Route)));
    });
    return () => unsub();
  }, []);

  const handleDatePicker = () => {
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch (e) {
        dateInputRef.current.focus();
      }
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => !selectedRouteId || c.route_id === selectedRouteId)
      .sort((a, b) => a.business_name.localeCompare(b.business_name));
  }, [customers, selectedRouteId]);

  const compressImage = (base64String: string, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1200;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = base64String;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64 = reader.result as string;
      
      // Compress image to keep file size under 500KB
      base64 = await compressImage(base64, 0.7);
      
      setChequeImage(base64);
      setIsAnalyzing(true);
      setError(null);
      const data = await analyzeChequeImage(base64);
      setIsAnalyzing(false);

      if (data) {
        if (data.cheque_number) setChequeNumber(data.cheque_number);
        if (data.bank) setBank(data.bank);
        if (data.branch) setBranch(data.branch);
        if (data.amount) setAmount(data.amount.toString());
        if (data.date) setRealizeDate(data.date);
      } else {
        setError("AI could not scan details. Please enter manually.");
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) {
      setError("Valid Customer and Amount are required.");
      return false;
    }
    if (paymentType === PaymentType.CHEQUE) {
      if (!chequeNumber || !bank || !realizeDate) {
        setError("Cheque details are incomplete.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    if (saveStep === 'IDLE') {
      setSaveStep('CONFIRMING');
      return;
    }

    const isPending = paymentType === PaymentType.CARD || paymentType === PaymentType.CHEQUE;
    onSave({
      customer_id: selectedCustomerId,
      payment_type: paymentType,
      amount: parseFloat(amount),
      status: isPending ? CollectionStatus.PENDING : CollectionStatus.RECEIVED,
      collection_date: new Date().toISOString().split('T')[0],
      cheque_number: chequeNumber || "",
      bank: bank || "",
      branch: branch || "",
      realize_date: realizeDate || "",
      cheque_image_base64: chequeImage || ""
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl max-w-2xl mx-auto border border-brand-100 dark:border-slate-800">
      <h2 className="text-2xl font-bold mb-6 text-brand-700 dark:text-brand-400">Record Payment</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-1 flex items-center gap-1"><MapPin size={14}/> Route</label>
            <select value={selectedRouteId} onChange={(e) => { setSelectedRouteId(e.target.value); setSelectedCustomerId(''); }} className="w-full rounded-xl p-3 bg-brand-50 dark:bg-slate-800 dark:text-slate-100">
              <option value="">All Routes</option>
              {routes.map(r => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-1 flex items-center gap-1"><User size={14}/> Customer</label>
            <select required value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-xl p-3 bg-brand-50 dark:bg-slate-800 dark:text-slate-100">
              <option value="">Select Customer</option>
              {filteredCustomers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.business_name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-1">Amount</label>
          <div className="relative">
            <input type="number" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setSaveStep('IDLE'); }} className="w-full rounded-xl p-3 font-mono text-lg bg-brand-50 dark:bg-slate-800 dark:text-slate-100 pr-24" placeholder="0.00" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 font-bold text-xs pointer-events-none">
              {amount ? `$ ${formatFullAmount(parseFloat(amount))}` : ""}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {Object.values(PaymentType).map(type => (
            <button key={type} type="button" onClick={() => setPaymentType(type)} className={`flex-1 p-2 text-sm font-bold rounded-xl border-2 ${paymentType === type ? 'bg-brand-500 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-slate-800 text-brand-600 dark:text-slate-400 border-brand-100 dark:border-slate-700'}`}>
              {type}
            </button>
          ))}
        </div>

        {paymentType === PaymentType.CHEQUE && (
          <div className="p-4 bg-brand-50 dark:bg-slate-800/50 rounded-2xl border border-brand-100 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-brand-700 dark:text-brand-400 uppercase">Cheque Scan</h3>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center text-sm font-bold text-brand-600 bg-white px-3 py-1 rounded-lg border border-brand-200">
                <Camera size={16} className="mr-2" /> Use Camera
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
            </div>
            {chequeImage && (
              <div className="relative h-32 bg-white rounded-xl overflow-hidden border">
                <img src={chequeImage} className="h-full w-full object-contain" alt="Scan" />
                {isAnalyzing && <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="p-2 text-sm border rounded dark:bg-slate-800" placeholder="Cheque No" />
              <div className="relative cursor-pointer" onClick={handleDatePicker}>
                <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-400 pointer-events-none" />
                <input ref={dateInputRef} type="date" value={realizeDate} onChange={e => setRealizeDate(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 cursor-pointer" onClick={(e) => e.stopPropagation()} />
              </div>
              <select value={bank} onChange={e => setBank(e.target.value)} className="p-2 text-sm border rounded dark:bg-slate-800 col-span-2">
                <option value="">Select Bank</option>
                {SRI_LANKAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="text" value={branch} onChange={e => setBranch(e.target.value)} className="p-2 text-sm border rounded dark:bg-slate-800 col-span-2" placeholder="Branch" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-3 text-sm font-bold text-gray-500 dark:text-slate-400">Cancel</button>
          <button type="submit" className={`px-10 py-3 rounded-xl shadow-lg transition-all font-bold ${saveStep === 'CONFIRMING' ? 'bg-amber-500 text-white' : 'bg-brand-600 text-white'}`}>
            {saveStep === 'CONFIRMING' ? 'Confirm & Save' : 'Save Collection'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CollectionForm;