import React, { useState } from 'react';
import { GlobalSettings } from '../types';
import { Save } from 'lucide-react';

interface SettingsProps {
  settings: GlobalSettings;
  onSave: (s: GlobalSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<GlobalSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    alert('Settings Saved Successfully');
  };

  const inputClass = "mt-1 block w-full rounded-xl border-2 border-brand-100 p-3 shadow-sm focus:border-brand-500 bg-brand-50 transition-all outline-none font-medium text-brand-900";

  return (
    <div className="p-4 max-w-2xl mx-auto mt-8 pb-20">
      <h1 className="text-2xl font-bold text-brand-800 mb-6">System Settings</h1>
      
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-brand-100">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div>
            <h3 className="text-lg font-bold text-brand-700 mb-4 border-b border-brand-50 pb-2">Credit Configuration</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Default Credit Limit ($)</label>
                <input
                  type="number"
                  value={formData.default_credit_limit}
                  onChange={(e) => setFormData({...formData, default_credit_limit: Number(e.target.value)})}
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-brand-500 italic">Applied automatically when creating new customers.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Default Credit Period (Days)</label>
                <input
                  type="number"
                  value={formData.default_credit_period}
                  onChange={(e) => setFormData({...formData, default_credit_period: Number(e.target.value)})}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-brand-700 mb-4 border-b border-brand-50 pb-2">Device Features</h3>
            <div className="flex items-center justify-between p-4 bg-brand-50/50 rounded-xl border border-brand-100">
              <span className="flex-grow flex flex-col">
                <span className="text-sm font-bold text-brand-900">Enable Cheque Capture</span>
                <span className="text-sm text-brand-500">Allow using camera to scan cheques via Gemini AI</span>
              </span>
              <button
                type="button"
                onClick={() => setFormData({...formData, enable_cheque_camera: !formData.enable_cheque_camera})}
                className={`${formData.enable_cheque_camera ? 'bg-brand-600' : 'bg-brand-200'} relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-offset-2 focus:ring-2 focus:ring-brand-500`}
              >
                <span
                  aria-hidden="true"
                  className={`${formData.enable_cheque_camera ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center rounded-xl border border-transparent bg-brand-600 py-3 px-8 text-sm font-extrabold text-white shadow-xl hover:bg-brand-700 focus:outline-none transition-all active:scale-95"
            >
              <Save size={18} className="mr-2" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;