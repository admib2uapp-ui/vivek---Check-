import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Route, Collection, CollectionStatus, PaymentType, CustomerStatus, GlobalSettings, User, LedgerEntry, AuditLog } from './types';
import { LayoutDashboard, Users, Calculator, FileText, Menu, Plus, RefreshCw, BarChart3, Settings as SettingsIcon, Bell, BookOpen, ShieldAlert, LogOut } from 'lucide-react';
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

// Mock Initial Data
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
  },
  {
    customer_id: 'C002',
    customer_name: 'Jane Smith',
    business_name: 'Smith Supermarket',
    address: '45 Lake Rd',
    whatsapp_number: '+1987654321',
    phone_number: '0719876543',
    location: '6.9271, 79.8612',
    credit_limit: 100000,
    credit_period_days: 45,
    route_id: 'R01',
    status: CustomerStatus.ACTIVE
  }
];

const INITIAL_ROUTES: Route[] = [
  { route_id: 'R01', route_name: 'Colombo Central', status: 'Active' },
  { route_id: 'R02', route_name: 'Kandy Line', status: 'Active' }
];

const INITIAL_COLLECTIONS: Collection[] = [
    {
        collection_id: 'CL001',
        customer_id: 'C001',
        payment_type: PaymentType.CASH,
        amount: 5000,
        status: CollectionStatus.RECEIVED,
        collection_date: '2023-10-25',
        created_by: 'U-001'
    }
];

const INITIAL_SETTINGS: GlobalSettings = {
  default_credit_limit: 50000,
  default_credit_period: 30,
  enable_cheque_camera: true
};

type View = 'DASHBOARD' | 'COLLECTIONS' | 'CUSTOMERS' | 'CHEQUES' | 'RECONCILIATION' | 'REPORTS' | 'SETTINGS' | 'LEDGER' | 'AUDIT';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App State
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Data State
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(INITIAL_SETTINGS);

  // Notifications Logic
  const notifications = useMemo(() => {
    const alerts = [];
    // Returned Cheques
    const returned = collections.filter(c => c.status === CollectionStatus.RETURNED);
    if (returned.length > 0) {
      alerts.push({ id: 'RET', message: `${returned.length} Returned Cheques require action.`, type: 'error' });
    }
    // High outstanding check (mock)
    if (collections.length > 0) {
      alerts.push({ id: 'SYNC', message: 'Offline data ready to sync (Simulated).', type: 'info' });
    }
    return alerts;
  }, [collections, customers]);

  // Helpers
  const addAuditLog = (action: string, details: string) => {
    if (!user) return;
    const newLog: AuditLog = {
      log_id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      performed_by: user.name,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addLedgerEntry = (desc: string, debit: string, credit: string, amount: number, refId: string) => {
    const entry: LedgerEntry = {
      entry_id: `LEG-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: desc,
      debit_account: debit,
      credit_account: credit,
      amount: amount,
      reference_id: refId
    };
    setLedger(prev => [entry, ...prev]);
  };

  // Handlers
  const handleLogin = (u: User) => {
    setUser(u);
    addAuditLog('LOGIN', 'User logged into the system');
  };

  const handleLogout = () => {
    addAuditLog('LOGOUT', 'User logged out');
    setUser(null);
    setCurrentView('DASHBOARD');
  };

  const handleSaveCollection = (newCollectionData: Omit<Collection, 'collection_id'>) => {
    const newCollection: Collection = {
      ...newCollectionData,
      collection_id: `CL${Date.now()}`,
      created_by: user?.uid
    };
    
    // 1. Update Collections State
    setCollections(prev => [newCollection, ...prev]);
    setShowCollectionModal(false);

    // 2. Ledger Update (Double Entry)
    const customerAccount = `Customer:${newCollection.customer_id}`;
    let debitAccount = 'CashInHand';
    
    if (newCollection.payment_type === PaymentType.CHEQUE) debitAccount = 'ChequesInHand';
    else if (newCollection.payment_type === PaymentType.CARD) debitAccount = 'BankPending';
    else if (newCollection.payment_type === PaymentType.QR) debitAccount = 'Bank:QR';

    addLedgerEntry(
      `Collection from ${customers.find(c => c.customer_id === newCollection.customer_id)?.business_name} (${newCollection.payment_type})`,
      debitAccount,
      customerAccount,
      newCollection.amount,
      newCollection.collection_id
    );

    // 3. Audit Log
    addAuditLog('CREATE_COLLECTION', `Created collection ${newCollection.collection_id} of $${newCollection.amount}`);
  };

  const handleReconcile = (collectionIds: string[], status: CollectionStatus) => {
    // 1. Update Collections
    setCollections(prev => prev.map(c => {
      if (collectionIds.includes(c.collection_id)) {
        return { ...c, status };
      }
      return c;
    }));

    // 2. Ledger Update based on status
    collectionIds.forEach(id => {
      const col = collections.find(c => c.collection_id === id);
      if (col) {
        if (status === CollectionStatus.REALIZED) {
          // Move from ChequesInHand to Bank
          addLedgerEntry(
            `Cheque Realized: ${col.cheque_number}`,
            'Bank:Main',
            'ChequesInHand',
            col.amount,
            col.collection_id
          );
        } else if (status === CollectionStatus.RETURNED) {
          // Reverse the original collection payment (Debit Customer, Credit ChequesInHand)
          addLedgerEntry(
            `Cheque Returned: ${col.cheque_number}`,
            `Customer:${col.customer_id}`,
            'ChequesInHand',
            col.amount,
            col.collection_id
          );
        }
      }
    });

    // 3. Audit Log
    addAuditLog('RECONCILE', `Updated status of ${collectionIds.length} collections to ${status}`);
  };

  const handleAddCustomer = (c: Customer) => {
    if (!c.credit_limit) c.credit_limit = settings.default_credit_limit;
    if (!c.credit_period_days) c.credit_period_days = settings.default_credit_period;
    setCustomers([...customers, c]);
    addAuditLog('ADD_CUSTOMER', `Added new customer ${c.business_name}`);
  };

  const handleEditCustomer = (c: Customer) => {
    setCustomers(customers.map(cust => cust.customer_id === c.customer_id ? c : cust));
    addAuditLog('EDIT_CUSTOMER', `Updated profile for ${c.business_name}`);
  };

  const handleAddRoute = (r: Route) => {
    setRoutes([...routes, r]);
    addAuditLog('ADD_ROUTE', `Added new route ${r.route_name}`);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const SidebarItem = ({ view, icon: Icon, label, roles }: { view: View; icon: any; label: string; roles?: string[] }) => {
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-brand-600">DistriFin</span>
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{user.role}</span>
        </div>
        <nav className="mt-6 space-y-1">
          <SidebarItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
          
          <SidebarItem view="COLLECTIONS" icon={Calculator} label="Collections" roles={['ADMIN', 'COLLECTOR', 'ACCOUNTS']} />
          <SidebarItem view="CUSTOMERS" icon={Users} label="Master Data" roles={['ADMIN', 'COLLECTOR']} />
          
          <SidebarItem view="CHEQUES" icon={FileText} label="Cheque Manager" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="RECONCILIATION" icon={RefreshCw} label="Reconciliation" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="LEDGER" icon={BookOpen} label="General Ledger" roles={['ADMIN', 'ACCOUNTS']} />
          
          <SidebarItem view="REPORTS" icon={BarChart3} label="Reports" roles={['ADMIN', 'ACCOUNTS']} />
          
          <SidebarItem view="AUDIT" icon={ShieldAlert} label="Audit Logs" roles={['ADMIN']} />
          <SidebarItem view="SETTINGS" icon={SettingsIcon} label="Settings" roles={['ADMIN']} />
        </nav>
        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold mr-3">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={16} className="mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 relative">
          <button onClick={toggleSidebar} className="md:hidden p-2 text-gray-600">
            <Menu size={24} />
          </button>
          <div className="flex-1 px-4">
             <h2 className="text-lg font-semibold text-gray-700 capitalize">
               {currentView.toLowerCase().replace('_', ' ')}
             </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg rounded-md overflow-hidden z-50 border border-gray-200">
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm border-b">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">No new notifications</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notifications.map((note, idx) => (
                        <li key={idx} className={`p-3 text-sm ${note.type === 'error' ? 'text-red-700 bg-red-50' : 'text-gray-700'}`}>
                          {note.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Collection Button only for Allowed Roles */}
            {['ADMIN', 'COLLECTOR'].includes(user.role) && (
              <button 
                onClick={() => setShowCollectionModal(true)}
                className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors shadow-sm"
              >
                <Plus size={18} className="mr-2" />
                <span className="hidden sm:inline">New Collection</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto bg-gray-50 relative">
          {currentView === 'DASHBOARD' && <Dashboard collections={collections} />}
          
          {currentView === 'COLLECTIONS' && (
             <div className="p-4 h-full overflow-y-auto">
                 <h3 className="text-lg font-bold mb-4">Collection History</h3>
                 <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {collections.map(c => {
                                const cust = customers.find(cus => cus.customer_id === c.customer_id);
                                return (
                                    <tr key={c.collection_id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.collection_date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cust?.business_name || 'Unknown'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.payment_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">${c.amount.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
             </div>
          )}

          {currentView === 'CHEQUES' && <ChequeManager collections={collections} />}

          {currentView === 'CUSTOMERS' && (
             <CustomerManager 
                customers={customers} 
                routes={routes} 
                onAddCustomer={handleAddCustomer} 
                onEditCustomer={handleEditCustomer} 
                onAddRoute={handleAddRoute} 
             />
          )}

          {currentView === 'RECONCILIATION' && (
            <Reconciliation collections={collections} onReconcile={handleReconcile} />
          )}

          {currentView === 'REPORTS' && (
            <Reports collections={collections} customers={customers} routes={routes} />
          )}

          {currentView === 'LEDGER' && (
            <Ledger entries={ledger} />
          )}

          {currentView === 'AUDIT' && (
            <AuditLogs logs={auditLogs} />
          )}

          {currentView === 'SETTINGS' && (
            <Settings settings={settings} onSave={setSettings} />
          )}
        </div>

        {/* Modal Overlay */}
        {showCollectionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <CollectionForm 
                  customers={customers} 
                  settings={settings}
                  onSave={handleSaveCollection} 
                  onCancel={() => setShowCollectionModal(false)} 
                />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;