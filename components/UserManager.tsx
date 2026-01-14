import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Plus, User as UserIcon, Shield, Mail, X, Save, Edit, Trash2, AlertTriangle, Key, Loader2, CheckCircle, CheckSquare, Square } from 'lucide-react';
import { createAuthUserAndSendPasswordResetEmail, resetUserPassword } from '../services/firebase';

interface UserManagerProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (uid: string) => void;
}

const PAGE_OPTIONS = [
  { id: 'DASHBOARD', label: 'Dashboard' },
  { id: 'COLLECTIONS', label: 'Collections' },
  { id: 'CUSTOMERS', label: 'Customers' },
  { id: 'CHEQUES', label: 'Cheque Manager' },
  { id: 'RECONCILIATION', label: 'Reconciliation' },
  { id: 'LEDGER', label: 'General Ledger' },
  { id: 'REPORTS', label: 'Reports' },
  { id: 'USERS', label: 'User Management' },
  { id: 'AUDIT', label: 'Audit Logs' },
  { id: 'SETTINGS', label: 'Settings' }
];

const UserManager: React.FC<UserManagerProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: 'COLLECTOR' as UserRole,
    permissions: [] as string[]
  });
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions || [] 
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'COLLECTOR', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (id: string) => {
    setFormData(prev => {
      const next = [...prev.permissions];
      const index = next.indexOf(id);
      if (index > -1) next.splice(index, 1);
      else next.push(id);
      return { ...prev, permissions: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await onUpdateUser({
        ...editingUser,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions
      });
      setIsModalOpen(false);
      return;
    }

    setIsCreatingUser(true);
    try {
      const { uid } = await createAuthUserAndSendPasswordResetEmail(formData.email);
      await onAddUser({
        uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Failed to create user', error);
      alert(error?.message || 'Failed to create user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDeleteUser(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSendReset = async (userEmail: string, uid: string) => {
    setResettingId(uid);
    try {
      await resetUserPassword(userEmail);
      setSuccessId(uid);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (error) {
      console.error("Failed to send reset email", error);
      alert("Error sending reset email.");
    } finally {
      setResettingId(null);
    }
  };

  const inputClass = "mt-1 block w-full rounded-xl border-2 border-brand-100 dark:border-slate-700 p-3 bg-brand-50 dark:bg-slate-800 text-brand-900 dark:text-slate-100 shadow-sm focus:border-brand-500 outline-none transition-colors";

  return (
    <div className="p-4 h-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-800 dark:text-slate-100">User Management</h1>
          <p className="text-sm text-brand-500 dark:text-slate-400">Control access levels and manage security credentials</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg transition-all active:scale-95">
          <Plus size={18} className="mr-2" /> Create User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-brand-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-50 dark:divide-slate-800">
            <thead className="bg-brand-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-brand-700 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-brand-50 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-brand-100 dark:bg-slate-800 p-2 rounded-lg mr-3">
                        <UserIcon size={16} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <span className="font-bold text-gray-800 dark:text-slate-200">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 
                      u.role === 'ACCOUNTS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleSendReset(u.email, u.uid)} disabled={resettingId === u.uid} className="p-2 rounded-lg transition-colors text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800">
                        {resettingId === u.uid ? <Loader2 size={16} className="animate-spin" /> : successId === u.uid ? <CheckCircle size={16} className="text-green-500" /> : <Key size={16} />}
                      </button>
                      <button onClick={() => handleOpenModal(u)} className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><Edit size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(u.uid)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-900/40 dark:bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-brand-100 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-brand-50 dark:border-slate-800">
              <h3 className="text-xl font-bold text-brand-800 dark:text-slate-100">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-700 dark:text-slate-400">Full Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 dark:text-slate-400">Email Address</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-700 dark:text-slate-400">System Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className={inputClass}>
                  <option value="COLLECTOR">Collector</option>
                  <option value="ACCOUNTS">Accounts</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {formData.role !== 'ADMIN' && (
                <div>
                  <label className="block text-sm font-bold text-brand-700 dark:text-slate-400 mb-3">Page Access Permissions</label>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-brand-50 dark:bg-slate-800 rounded-xl border border-brand-100 dark:border-slate-700">
                    {PAGE_OPTIONS.map(opt => (
                      <button 
                        key={opt.id} 
                        type="button" 
                        onClick={() => togglePermission(opt.id)}
                        className="flex items-center text-sm gap-2 text-gray-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                      >
                        {formData.permissions.includes(opt.id) ? (
                          <CheckSquare size={18} className="text-brand-600" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button type="submit" disabled={isCreatingUser} className="w-full flex justify-center items-center py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-60">
                  {isCreatingUser ? <Loader2 size={20} className="mr-2 animate-spin" /> : <Save size={20} className="mr-2" />} {editingUser ? 'Update Account' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-brand-900/40 dark:bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-brand-100 dark:border-slate-800">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-bold dark:text-slate-100">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 text-gray-500 dark:text-slate-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95">Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;