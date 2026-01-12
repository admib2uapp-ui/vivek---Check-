import React from 'react';
import { User, UserRole } from '../types';
import { Shield, User as UserIcon, Briefcase } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleRoleSelect = (role: UserRole) => {
    // Simulate login
    const mockUser: User = {
      uid: `U-${Date.now()}`,
      name: role === 'ADMIN' ? 'System Admin' : role === 'ACCOUNTS' ? 'Finance Manager' : 'Field Collector',
      email: `${role.toLowerCase()}@distrifin.com`,
      role: role
    };
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">DistriFin</h1>
          <p className="text-gray-500 mt-2">Select a role to simulate login</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect('COLLECTOR')}
            className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-brand-50 hover:border-brand-500 transition-all group"
          >
            <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-200">
              <UserIcon className="text-blue-600" size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800">Collector</h3>
              <p className="text-sm text-gray-500">Add collections, view customers</p>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('ACCOUNTS')}
            className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-brand-50 hover:border-brand-500 transition-all group"
          >
            <div className="bg-green-100 p-3 rounded-full mr-4 group-hover:bg-green-200">
              <Briefcase className="text-green-600" size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800">Accounts</h3>
              <p className="text-sm text-gray-500">Reconciliation, Ledger, Reports</p>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('ADMIN')}
            className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-brand-50 hover:border-brand-500 transition-all group"
          >
            <div className="bg-purple-100 p-3 rounded-full mr-4 group-hover:bg-purple-200">
              <Shield className="text-purple-600" size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800">Admin</h3>
              <p className="text-sm text-gray-500">Full Access, Audit Logs, Settings</p>
            </div>
          </button>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          Secure Firebase Authentication Simulation
        </div>
      </div>
    </div>
  );
};

export default Login;
