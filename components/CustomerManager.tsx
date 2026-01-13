import React, { useState } from 'react';
import { Customer, Route, CustomerStatus } from '../types';
import { MapPin, Edit, Plus, Save, X, Phone, User, Upload, Briefcase, Calendar } from 'lucide-react';
import ImportModal from './ImportModal';

interface CustomerManagerProps {
  customers: Customer[];
  routes: Route[];
  onAddCustomer: (c: Customer) => void;
  onEditCustomer: (c: Customer) => void;
  onAddRoute: (r: Route) => void;
  onImport: (c: Customer[]) => void;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, routes, onAddCustomer, onEditCustomer, onAddRoute, onImport }) => {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'ROUTES'>('CUSTOMERS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    status: CustomerStatus.ACTIVE,
    location: '',
  });

  const [newRouteName, setNewRouteName] = useState('');

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ 
        status: CustomerStatus.ACTIVE, 
        credit_limit: 50000, 
        credit_period_days: 30,
        location: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const customerData = {
      ...formData,
      customer_id: editingCustomer ? editingCustomer.customer_id : `C${Date.now()}`,
    } as Customer;

    if (editingCustomer) onEditCustomer(customerData);
    else onAddCustomer(customerData);
    setIsModalOpen(false);
  };

  const inputClass = "mt-1 block w-full rounded-lg border-2 border-brand-100 p-2 shadow-sm focus:border-brand-500 bg-brand-50 transition-colors outline-none";

  return (
    <div className="p-4 h-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-800">Master Data</h1>
        <div className="flex bg-brand-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('CUSTOMERS')} className={`px-4 py-2 rounded-md font-bold transition-all ${activeTab === 'CUSTOMERS' ? 'bg-brand-600 text-white shadow-sm' : 'text-brand-700'}`}>Customers</button>
          <button onClick={() => setActiveTab('ROUTES')} className={`px-4 py-2 rounded-md font-bold transition-all ${activeTab === 'ROUTES' ? 'bg-brand-600 text-white shadow-sm' : 'text-brand-700'}`}>Routes</button>
        </div>
      </div>

      {activeTab === 'CUSTOMERS' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex justify-end mb-4 space-x-3">
            <button onClick={() => setIsImportOpen(true)} className="flex items-center px-4 py-2 bg-white border-2 border-brand-500 text-brand-600 rounded-xl hover:bg-brand-50 font-bold shadow-sm transition-all">
              <Upload size={18} className="mr-2" /> Import Bulk
            </button>
            <button onClick={() => openModal()} className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-bold shadow-lg transition-all">
              <Plus size={18} className="mr-2" /> Add Customer
            </button>
          </div>
          
          <div className="space-y-3">
            {customers.map(c => (
              <div key={c.customer_id} className="bg-white p-4 rounded-2xl shadow-sm border border-brand-100 hover:border-brand-300 transition-all group flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="bg-brand-100 p-3 rounded-xl">
                        <Briefcase size={24} className="text-brand-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-brand-900 leading-tight">{c.business_name}</h3>
                        <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                            <span className="flex items-center font-medium"><User size={14} className="mr-1 text-brand-400" /> {c.customer_name}</span>
                            <span className="flex items-center font-medium"><Phone size={14} className="mr-1 text-brand-400" /> {c.phone_number}</span>
                            <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-md">Route: {routes.find(r => r.route_id === c.route_id)?.route_name || 'Unassigned'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Credit Status</p>
                        <p className="text-sm font-bold text-green-600">${c.credit_limit} / {c.credit_period_days} Days</p>
                    </div>
                    <button onClick={() => openModal(c)} className="p-2 text-brand-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all">
                        <Edit size={20} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ROUTES' && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-100 mb-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-bold text-brand-700 mb-1">New Route Name</label>
              <input type="text" value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} className={inputClass} placeholder="e.g. Negombo Road" />
            </div>
            <button onClick={() => { if(newRouteName) onAddRoute({ route_id: `R${Date.now()}`, route_name: newRouteName, status: 'Active' }); setNewRouteName(''); }} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-md hover:bg-brand-700 transition-all">Create Route</button>
          </div>
          <div className="bg-white shadow-sm border border-brand-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-brand-50">
              {routes.map(route => (
                <li key={route.route_id} className="px-6 py-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
                  <p className="text-sm font-bold text-brand-800">{route.route_name}</p>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-brand-100 text-brand-700 border border-brand-200">{customers.filter(c => c.route_id === route.route_id).length} Customers</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-900/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-brand-100">
            <div className="flex justify-between items-center p-6 border-b border-brand-50">
              <h3 className="text-xl font-bold text-brand-800">{editingCustomer ? 'Edit Customer Data' : 'Add New Customer'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-400 p-2 hover:bg-brand-50 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-brand-700">Business Name</label><input required type="text" value={formData.business_name || ''} onChange={e => setFormData({...formData, business_name: e.target.value})} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-brand-700">Customer Name</label><input required type="text" value={formData.customer_name || ''} onChange={e => setFormData({...formData, customer_name: e.target.value})} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-brand-700">Phone</label><input required type="text" value={formData.phone_number || ''} onChange={e => setFormData({...formData, phone_number: e.target.value})} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-brand-700">Route</label>
                  <select required value={formData.route_id || ''} onChange={e => setFormData({...formData, route_id: e.target.value})} className={inputClass}>
                    <option value="">Select Route</option>
                    {routes.map(r => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-bold text-brand-700">Credit Limit ($)</label><input type="number" value={formData.credit_limit || ''} onChange={e => setFormData({...formData, credit_limit: Number(e.target.value)})} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-brand-700">Credit Period (Days)</label><input type="number" value={formData.credit_period_days || ''} onChange={e => setFormData({...formData, credit_period_days: Number(e.target.value)})} className={inputClass} /></div>
              </div>
              <div><label className="block text-sm font-bold text-brand-700">Address</label><textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass + " h-20"} /></div>
              <div className="flex justify-end pt-6"><button type="submit" className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all">Save Customer Profile</button></div>
            </form>
          </div>
        </div>
      )}

      {isImportOpen && <ImportModal onImport={(c) => { onImport(c); setIsImportOpen(false); }} onClose={() => setIsImportOpen(false)} />}
    </div>
  );
};

export default CustomerManager;