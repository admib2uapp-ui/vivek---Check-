import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Route, Collection, CollectionStatus, PaymentType, CustomerStatus, GlobalSettings, User, LedgerEntry, AuditLog, UserRole } from './types';
import { LayoutDashboard, Users, Calculator, FileText, Menu, Plus, RefreshCw, BarChart3, Settings as SettingsIcon, Bell, BookOpen, ShieldAlert, LogOut, UserPlus } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CollectionForm from './components/CollectionForm';
import ChequeManager from './components/ChequeManager';
import CustomerManager from './components/CustomerManager';
import Reconciliation from './components/Reconciliation';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Login from './components/Login';
import Ledger from './components/Ledger';
import AuditLogs from './components/AuditLogs';
import UserManager from './components/UserManager';

const INITIAL_CUSTOMERS: Customer[] = [
  {
    customer_id: 'C001',
    customer_name: 'John Doe',
    business_name: 'City Grocers',
    address: '123 Main St',
    whatsapp_number: '+1234567890',
    phone_number: '0771234567',
    location: '6.9271, 79.8612',
    credit_limit: 50000,
    credit_period_days: 30,
    route_id: 'R01',
    status: CustomerStatus.ACTIVE
  }
];

const INITIAL_ROUTES: Route[] = [
  { route_id: 'R01', route_name: 'Colombo Central', status: 'Active' }
];

const INITIAL_USERS: User[] = [
  { uid: 'U-001', name: 'System Admin', email: 'admin@distrifin.com', role: 'ADMIN' },
  { uid: 'U-002', name: 'Finance Manager', email: 'accounts@distrifin.com', role: 'ACCOUNTS' }
];

type View = 'DASHBOARD' | 'COLLECTIONS' | 'CUSTOMERS' | 'CHEQUES' | 'RECONCILIATION' | 'REPORTS' | 'SETTINGS' | 'LEDGER' | 'AUDIT' | 'USERS';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ default_credit_limit: 50000, default_credit_period: 30, enable_cheque_camera: true });
  const [usersList, setUsersList] = useState<User[]>(INITIAL_USERS);

  const addAuditLog = (action: string, details: string) => {
    if (!user) return;
    setAuditLogs(prev => [{
      log_id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      performed_by: user.name,
      details
    }, ...prev]);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    addAuditLog('LOGIN', 'User logged into the system');
  };

  const handleLogout = () => {
    addAuditLog('LOGOUT', 'User logged out');
    setUser(null);
    setCurrentView('DASHBOARD');
  };

  const handleAddUser = (newUser: User) => {
    setUsersList([...usersList, newUser]);
    addAuditLog('CREATE_USER', `Created user ${newUser.name} as ${newUser.role}`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsersList(usersList.map(u => u.uid === updatedUser.uid ? updatedUser : u));
    addAuditLog('UPDATE_USER', `Updated user ${updatedUser.name}`);
  };

  const handleDeleteUser = (uid: string) => {
    const userToDelete = usersList.find(u => u.uid === uid);
    setUsersList(usersList.filter(u => u.uid !== uid));
    if (userToDelete) addAuditLog('DELETE_USER', `Deleted user ${userToDelete.name}`);
  };

  const handleImportCustomers = (imported: Customer[]) => {
    setCustomers(prev => [...prev, ...imported]);
    addAuditLog('IMPORT_CUSTOMERS', `Imported ${imported.length} customers via bulk upload`);
  };

  const SidebarItem = ({ view, icon: Icon, label, roles }: { view: View; icon: any; label: string; roles?: UserRole[] }) => {
    if (roles && user && !roles.includes(user.role)) return null;
    return (
      <button
        onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
        className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
          currentView === view ? 'bg-brand-50 text-brand-600 border-r-4 border-brand-600' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Icon size={20} className="mr-3" />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gray-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-brand-600">DistriFin</span>
        </div>
        <nav className="mt-6 space-y-1">
          <SidebarItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem view="COLLECTIONS" icon={Calculator} label="Collections" />
          <SidebarItem view="CUSTOMERS" icon={Users} label="Master Data" />
          <SidebarItem view="CHEQUES" icon={FileText} label="Cheque Manager" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="RECONCILIATION" icon={RefreshCw} label="Reconciliation" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="LEDGER" icon={BookOpen} label="General Ledger" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="REPORTS" icon={BarChart3} label="Reports" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="USERS" icon={UserPlus} label="User Management" roles={['ADMIN']} />
          <SidebarItem view="AUDIT" icon={ShieldAlert} label="Audit Logs" roles={['ADMIN']} />
          <SidebarItem view="SETTINGS" icon={SettingsIcon} label="Settings" roles={['ADMIN']} />
        </nav>
        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
            <LogOut size={16} className="mr-2" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-600"><Menu size={24} /></button>
          <h2 className="text-lg font-semibold text-gray-700 capitalize">{currentView.toLowerCase().replace('_', ' ')}</h2>
          
          {/* New Collection button only visible in Collections view */}
          {currentView === 'COLLECTIONS' && ['ADMIN', 'COLLECTOR'].includes(user.role) && (
            <button onClick={() => setShowCollectionModal(true)} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 shadow-sm font-bold">
              <Plus size={18} className="mr-2" /> New Collection
            </button>
          )}
        </header>

        <div className="flex-1 overflow-auto bg-gray-50">
          {currentView === 'DASHBOARD' && <Dashboard collections={collections} />}
          {currentView === 'COLLECTIONS' && (
             <div className="p-8 text-center">
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-brand-100 max-w-lg mx-auto">
                    <Calculator size={48} className="mx-auto text-brand-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">No active turn</h3>
                    <p className="text-gray-500 mt-2 mb-6">Click the button below to start recording new collections for this session.</p>
                    <button onClick={() => setShowCollectionModal(true)} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg">Start New Collection</button>
                </div>
             </div>
          )}
          {currentView === 'CUSTOMERS' && (
            <CustomerManager 
              customers={customers} 
              routes={routes} 
              onAddCustomer={(c) => setCustomers([...customers, c])} 
              onEditCustomer={(c) => setCustomers(customers.map(cu => cu.customer_id === c.customer_id ? c : cu))} 
              onAddRoute={(r) => setRoutes([...routes, r])} 
              onImport={handleImportCustomers} 
            />
          )}
          {currentView === 'USERS' && <UserManager users={usersList} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
          {currentView === 'CHEQUES' && <ChequeManager collections={collections} />}
          {currentView === 'REPORTS' && <Reports collections={collections} customers={customers} routes={routes} />}
          {currentView === 'AUDIT' && <AuditLogs logs={auditLogs} />}
          {currentView === 'LEDGER' && <Ledger entries={ledger} />}
          {currentView === 'SETTINGS' && <Settings settings={settings} onSave={setSettings} />}
        </div>

        {showCollectionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <CollectionForm customers={customers} settings={settings} onSave={(c) => { setCollections([...collections, { ...c, collection_id: `CL${Date.now()}` }]); setShowCollectionModal(false); }} onCancel={() => setShowCollectionModal(false)} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;