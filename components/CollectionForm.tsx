import React, { useState, useRef, useEffect } from 'react';
import { Customer, PaymentType, Collection, CollectionStatus, GlobalSettings } from '../types';
import { Camera, Loader2, Upload, AlertCircle } from 'lucide-react';
import { analyzeChequeImage } from '../services/geminiService';

interface CollectionFormProps {
  customers: Customer[];
  settings?: GlobalSettings;
  onSave: (collection: Omit<Collection, 'collection_id'>) => void;
  onCancel: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ customers, settings, onSave, onCancel }) => {
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
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
        setError("Could not auto-extract details. Please enter manually.");
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    if (!selectedCustomerId || !amount) {
      setError("Customer and Amount are required.");
      return false;
    }
    
    if (paymentType === PaymentType.CHEQUE) {
      if (!chequeNumber || !bank || !realizeDate) {
        setError("Cheque details incomplete.");
        return false;
      }
      
      if (selectedCustomer) {
         const today = new Date();
         const rDate = new Date(realizeDate);
         const diffTime = Math.abs(rDate.getTime() - today.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         
         if (rDate > today && diffDays > selectedCustomer.credit_period_days) {
            setError(`Cheque date exceeds allowed credit period of ${selectedCustomer.credit_period_days} days.`);
            return false;
         }
      }
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    const isPending = paymentType === PaymentType.CARD || paymentType === PaymentType.CHEQUE;

    onSave({
      customer_id: selectedCustomerId,
      payment_type: paymentType,
      amount: parseFloat(amount),
      status: isPending ? CollectionStatus.PENDING : CollectionStatus.RECEIVED,
      collection_date: new Date().toISOString().split('T')[0],
      cheque_number: paymentType === PaymentType.CHEQUE ? chequeNumber : undefined,
      bank: paymentType === PaymentType.CHEQUE ? bank : undefined,
      branch: paymentType === PaymentType.CHEQUE ? branch : undefined,
      realize_date: paymentType === PaymentType.CHEQUE ? realizeDate : undefined,
      cheque_image_base64: chequeImage || undefined
    });
  };

  const cameraEnabled = settings ? settings.enable_cheque_camera : true;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl mx-auto my-4 border border-brand-100">
      <h2 className="text-2xl font-bold mb-6 text-brand-700">New Collection</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center border border-red-100">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="mt-1 block w-full rounded-xl border-2 border-brand-100 p-3 bg-brand-50/30 text-gray-800 shadow-sm focus:border-brand-500 focus:ring-brand-500 outline-none transition-all"
          >
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.business_name} ({c.customer_name})
              </option>
            ))}
          </select>
          {selectedCustomer && (
             <p className="text-xs text-brand-600 mt-2 ml-1 font-medium">
               Credit Limit: ${selectedCustomer.credit_limit} | Period: {selectedCustomer.credit_period_days} days
             </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
          <div className="grid grid-cols-4 gap-3">
            {Object.values(PaymentType).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setPaymentType(type)}
                className={`p-3 text-sm font-bold rounded-xl border-2 transition-all ${paymentType === type ? 'bg-brand-500 text-white border-brand-500 shadow-lg scale-105' : 'bg-white text-brand-600 border-brand-100 hover:bg-brand-50'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-xl border-2 border-brand-100 p-3 bg-brand-50/30 text-gray-800 shadow-sm focus:border-brand-500 focus:ring-brand-500 outline-none transition-all font-mono text-lg"
            placeholder="0.00"
          />
        </div>

        {paymentType === PaymentType.CHEQUE && (
          <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-brand-700 uppercase tracking-wider">Cheque Details</h3>
              {cameraEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center text-sm font-bold text-brand-600 hover:text-brand-700 bg-white px-3 py-1 rounded-lg border border-brand-200"
                  >
                    <Camera size={16} className="mr-2" />
                    Scan
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>

            {chequeImage && (
              <div className="relative h-48 w-full bg-white rounded-xl overflow-hidden border-2 border-brand-100 shadow-inner">
                <img src={chequeImage} alt="Cheque" className="h-full w-full object-contain" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-brand-500/30 backdrop-blur-sm flex items-center justify-center text-white">
                    <div className="bg-white/90 p-4 rounded-2xl flex items-center text-brand-700 shadow-xl">
                      <Loader2 className="animate-spin mr-3" /> <span className="font-bold">AI Analyzing...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-600 mb-1">Cheque Number</label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="block w-full rounded-lg border border-brand-200 p-2 text-sm bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-600 mb-1">Realize Date</label>
                <input
                  type="date"
                  value={realizeDate}
                  onChange={(e) => setRealizeDate(e.target.value)}
                  className="block w-full rounded-lg border border-brand-200 p-2 text-sm bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-600 mb-1">Bank</label>
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="block w-full rounded-lg border border-brand-200 p-2 text-sm bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-600 mb-1">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="block w-full rounded-lg border border-brand-200 p-2 text-sm bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 border-t border-brand-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-brand-600 text-white rounded-xl shadow-lg hover:bg-brand-700 active:scale-95 transition-all font-bold"
          >
            Save Collection
          </button>
        </div>
      </form>
    </div>
  );
};

export default CollectionForm;