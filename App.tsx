import React, { useState, useEffect } from 'react';
import { Customer, Route, Collection, CollectionStatus, PaymentType, CustomerStatus, GlobalSettings, User, LedgerEntry, AuditLog, UserRole } from './types';
import { LayoutDashboard, Users, Calculator, FileText, Menu, Plus, RefreshCw, BarChart3, Settings as SettingsIcon, BookOpen, ShieldAlert, LogOut, UserPlus, Moon, Sun, ExternalLink } from 'lucide-react';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc, 
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './services/firebase';

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

type View = 'DASHBOARD' | 'COLLECTIONS' | 'CUSTOMERS' | 'CHEQUES' | 'RECONCILIATION' | 'REPORTS' | 'SETTINGS' | 'LEDGER' | 'AUDIT' | 'USERS';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Firestore Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ default_credit_limit: 50000, default_credit_period: 30, enable_cheque_camera: true });
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        let role: UserRole = 'COLLECTOR';
        if (email === 'absiraiva@gmail.com' || email.includes('admin')) {
          role = 'ADMIN';
        } else if (email.includes('accounts')) {
          role = 'ACCOUNTS';
        }

        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: role
        });
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubCollections = onSnapshot(query(collection(db, 'collections'), orderBy('collection_date', 'desc')), (snapshot) => {
      setCollections(snapshot.docs.map(d => ({ ...d.data(), collection_id: d.id } as Collection)));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ ...d.data(), customer_id: d.id } as Customer)));
    });

    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
      setRoutes(snapshot.docs.map(d => ({ ...d.data(), route_id: d.id } as Route)));
    });

    const unsubSettings = onSnapshot(doc(db, 'system', 'settings'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as GlobalSettings);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User)));
    });

    const unsubAudit = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      setAuditLogs(snapshot.docs.map(d => ({ ...d.data(), log_id: d.id } as AuditLog)));
    });

    return () => {
      unsubCollections(); unsubCustomers(); unsubRoutes(); unsubSettings(); unsubUsers(); unsubAudit();
    };
  }, [user]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const addAuditLog = async (action: string, details: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        action,
        performedBy: user.uid,
        userName: user.name,
        details
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  };

  const handleReconcile = async (ids: string[], newStatus: CollectionStatus) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const ref = doc(db, 'collections', id);
        batch.update(ref, { status: newStatus });
      });
      await batch.commit();
      await addAuditLog('RECONCILE', `Batch updated ${ids.length} collections to ${newStatus}`);
    } catch (e) {
      console.error("Reconciliation save failed", e);
      alert("Failed to save reconciliation results.");
    }
  };

  const handleLogout = async () => {
    await addAuditLog('LOGOUT', 'User logged out');
    await signOut(auth);
    setUser(null);
    setCurrentView('DASHBOARD');
  };

  const handleSaveCollection = async (c: Omit<Collection, 'collection_id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'collections'), {
        ...c,
        createdBy: user.uid
      });
      await addAuditLog('CREATE_COLLECTION', `Recorded payment from customer ${c.customer_id}`);
      setShowCollectionModal(false);
    } catch (e: any) {
      console.error("Save collection failed:", e);
      alert(`Permission Denied: ${e.message}`);
    }
  };

  const handleAddCustomer = async (c: Customer) => {
    if (!user) return;
    const { customer_id, ...data } = c;
    try {
      await setDoc(doc(db, 'customers', customer_id), {
        ...data,
        createdBy: user.uid
      });
      await addAuditLog('CREATE_CUSTOMER', `Created customer ${c.business_name}`);
    } catch (e: any) {
      console.error("Add customer failed:", e);
    }
  };

  const handleUpdateCustomer = async (c: Customer) => {
    if (!user) return;
    const { customer_id, ...data } = c;
    try {
      await updateDoc(doc(db, 'customers', customer_id), data as any);
      await addAuditLog('UPDATE_CUSTOMER', `Updated customer ${c.business_name}`);
    } catch (e) {
      console.error("Update customer failed:", e);
    }
  };

  const handleAddRoute = async (r: Route) => {
    if (!user) return;
    const { route_id, ...data } = r;
    try {
      await setDoc(doc(db, 'routes', route_id), data);
      await addAuditLog('CREATE_ROUTE', `Created route ${r.route_name}`);
    } catch (e) {
      console.error("Route add failed:", e);
    }
  };

  const handleAddUser = async (newUser: User) => {
    if (!user) return;
    const { uid, ...data } = newUser;
    try {
      await setDoc(doc(db, 'users', uid), { ...data, id: uid });
      await sendPasswordResetEmail(auth, newUser.email);
      await addAuditLog('CREATE_USER', `Created user account for ${newUser.name}`);
    } catch (err) {
      console.error("User creation failed", err);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!user) return;
    const { uid, ...data } = updatedUser;
    try {
      await updateDoc(doc(db, 'users', uid), { ...data, id: uid } as any);
      await addAuditLog('UPDATE_USER', `Updated user ${updatedUser.name}`);
    } catch (e) {
       console.error("User update failed", e);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      await addAuditLog('DELETE_USER', `Deleted user with ID ${uid}`);
    } catch (e) {
       console.error("User deletion failed", e);
    }
  };

  const handleSaveSettings = async (s: GlobalSettings) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'system', 'settings'), s);
      await addAuditLog('UPDATE_SETTINGS', 'System settings updated');
      alert("Settings saved successfully.");
    } catch (e) {
      console.error("Settings update failed:", e);
    }
  };

  const SidebarItem = ({ view, icon: Icon, label, roles }: { view: View; icon: any; label: string; roles?: UserRole[] }) => {
    if (roles && user && !roles.includes(user.role)) return null;
    return (
      <button
        onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
        className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
          currentView === view ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 border-r-4 border-brand-600' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
        }`}
      >
        <Icon size={20} className="mr-3" />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-50 dark:bg-slate-950">
        <RefreshCw className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-slate-800">
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
        <div className="absolute bottom-0 w-full border-t border-gray-200 dark:border-slate-800 p-4">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors font-bold">
            <LogOut size={16} className="mr-2" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-slate-400"><Menu size={24} /></button>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-200 capitalize">{currentView.toLowerCase().replace('_', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {currentView === 'COLLECTIONS' && ['ADMIN', 'COLLECTOR'].includes(user.role) && (
              <button onClick={() => setShowCollectionModal(true)} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 shadow-sm font-bold transition-all active:scale-95">
                <Plus size={18} className="mr-2" /> New Collection
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
          {currentView === 'DASHBOARD' && <Dashboard collections={collections} />}
          {currentView === 'COLLECTIONS' && (
             <div className="p-8 text-center">
                <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl shadow-sm border border-brand-100 dark:border-slate-800 max-w-lg mx-auto">
                    <Calculator size={48} className="mx-auto text-brand-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200">No active turn</h3>
                    <p className="text-gray-500 dark:text-slate-400 mt-2 mb-6">Click the button below to start recording new collections for this session.</p>
                    <button onClick={() => setShowCollectionModal(true)} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg">Start New Collection</button>
                </div>
             </div>
          )}
          {currentView === 'CUSTOMERS' && (
            <CustomerManager 
              customers={customers} 
              routes={routes} 
              onAddCustomer={handleAddCustomer} 
              onEditCustomer={handleUpdateCustomer} 
              onAddRoute={handleAddRoute} 
              onImport={(list) => list.forEach(handleAddCustomer)} 
            />
          )}
          {currentView === 'USERS' && <UserManager users={usersList} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
          {currentView === 'CHEQUES' && <ChequeManager collections={collections} />}
          {currentView === 'RECONCILIATION' && <Reconciliation collections={collections} onReconcile={handleReconcile} />}
          {currentView === 'REPORTS' && <Reports collections={collections} customers={customers} routes={routes} />}
          {currentView === 'AUDIT' && <AuditLogs logs={auditLogs} />}
          {currentView === 'LEDGER' && <Ledger entries={ledger} />}
          {currentView === 'SETTINGS' && (
            <Settings settings={settings} onSave={handleSaveSettings} />
          )}
        </div>

        {showCollectionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <CollectionForm customers={customers} settings={settings} onSave={handleSaveCollection} onCancel={() => setShowCollectionModal(false)} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;