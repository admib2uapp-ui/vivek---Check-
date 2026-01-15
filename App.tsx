import React, { useState, useEffect } from 'react';
import { Customer, Route, Collection, CollectionStatus, PaymentType, GlobalSettings, User, LedgerEntry, AuditLog, UserRole } from './types';
import { LayoutDashboard, Users, Calculator, FileText, Menu, Plus, RefreshCw, BarChart3, Settings as SettingsIcon, BookOpen, ShieldAlert, LogOut, UserPlus, Moon, Sun, UserCircle } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  getDoc,
  updateDoc
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

export const formatFullAmount = (num: number, currency = '$'): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  return `${currency} ${formatted}`;
};

export const formatAmount = (num: number, currency = '$'): string => {
  let val = '';
  if (num >= 1000000000) {
    val = (num / 1000000000).toFixed(1) + 'Bn';
  } else if (num >= 1000000) {
    val = (num / 1000000).toFixed(1) + 'Mn';
  } else {
    return formatFullAmount(num, currency);
  }
  return `${currency} ${val}`;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ 
    default_credit_limit: 50000, 
    default_credit_period: 30, 
    enable_cheque_camera: true,
    currency_code: 'Rs.',
    country: 'Sri Lanka'
  });
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnapshot = await getDoc(userDocRef);
        let role: UserRole = 'COLLECTOR';
        let name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        let permissions: string[] = [];
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          role = userData.role as UserRole;
          name = userData.name || name;
          permissions = userData.permissions || [];
        }
        setUser({ uid: firebaseUser.uid, name, email: firebaseUser.email || '', role, permissions });
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
    const unsubLedger = onSnapshot(query(collection(db, 'ledger'), orderBy('date', 'desc')), (snapshot) => {
      setLedger(snapshot.docs.map(d => ({ ...d.data(), entry_id: d.id } as LedgerEntry)));
    });
    const unsubSettings = onSnapshot(doc(db, 'system', 'settings'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as GlobalSettings;
        setSettings({
          ...data,
          currency_code: data.currency_code || 'Rs.',
          country: data.country || 'Sri Lanka'
        });
      }
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User)));
    });
    const unsubAudit = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      setAuditLogs(snapshot.docs.map(d => ({ ...d.data(), log_id: d.id } as AuditLog)));
    });
    return () => {
      unsubCollections(); unsubCustomers(); unsubRoutes(); unsubSettings(); unsubUsers(); unsubAudit(); unsubLedger();
    };
  }, [user]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleSaveCollection = async (c: Omit<Collection, 'collection_id'>) => {
    if (!user) return;
    try {
      const colRef = await addDoc(collection(db, 'collections'), { ...c, createdBy: user.uid });
      const ledgerPayload: Omit<LedgerEntry, 'entry_id'> = {
        date: c.collection_date,
        description: `Collection from ${customers.find(cust => cust.customer_id === c.customer_id)?.business_name || 'Customer'}`,
        reference_id: colRef.id,
        collector: user.name,
        debit_account: c.payment_type === PaymentType.CHEQUE ? 'Cheques in Hand' : 'Cash',
        credit_account: `Customer: ${c.customer_id}`,
        amount: c.amount
      };
      await addDoc(collection(db, 'ledger'), ledgerPayload);
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        action: 'CREATE_COLLECTION',
        performedBy: user.uid,
        userName: user.name,
        details: `Saved ${c.payment_type} collection of ${c.amount} for customer ${c.customer_id}`
      });
      setShowCollectionModal(false);
    } catch (e: any) {
      console.error("Save collection failed:", e);
      alert(`Error: ${e.message}`);
    }
  };

  const SidebarItem = ({ view, icon: Icon, label, roles }: { view: View; icon: any; label: string; roles?: UserRole[] }) => {
    if (user?.role !== 'ADMIN') {
      const isAllowed = user?.permissions?.includes(view);
      if (!isAllowed) return null;
    } else if (roles && !roles.includes(user.role)) {
      return null;
    }
    
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

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-brand-50 dark:bg-slate-950"><RefreshCw className="animate-spin text-brand-600" size={48} /></div>;
  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-slate-800"><span className="text-xl font-bold text-brand-600">DistriFin</span></div>
        <nav className="mt-6 space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)]">
          <SidebarItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem view="COLLECTIONS" icon={Calculator} label="Collections" />
          <SidebarItem view="CUSTOMERS" icon={Users} label="Customer" />
          <SidebarItem view="CHEQUES" icon={FileText} label="Cheque Manager" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="RECONCILIATION" icon={RefreshCw} label="Reconciliation" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="LEDGER" icon={BookOpen} label="General Ledger" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="REPORTS" icon={BarChart3} label="Reports" roles={['ADMIN', 'ACCOUNTS']} />
          <SidebarItem view="USERS" icon={UserPlus} label="User Management" roles={['ADMIN']} />
          <SidebarItem view="AUDIT" icon={ShieldAlert} label="Audit Logs" roles={['ADMIN']} />
          <SidebarItem view="SETTINGS" icon={SettingsIcon} label="Settings" roles={['ADMIN']} />
        </nav>
        <div className="absolute bottom-0 w-full border-t border-gray-200 dark:border-slate-800 p-4">
          <button onClick={() => signOut(auth)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 rounded-md transition-colors"><LogOut size={16} className="mr-2" /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-slate-400"><Menu size={24} /></button>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-200 capitalize">{currentView.toLowerCase().replace('_', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4 relative">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <UserCircle size={24} />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-200 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 leading-tight capitalize">{user.role.toLowerCase()}</p>
                </div>
              </button>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 dark:border-slate-800">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account</p>
                      <p className="text-sm font-semibold truncate dark:text-slate-200">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => { setCurrentView('SETTINGS'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <SettingsIcon size={14} /> Profile Settings
                    </button>
                    <button 
                      onClick={() => signOut(auth)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 border-t border-gray-50 dark:border-slate-800"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
            {currentView === 'COLLECTIONS' && (user.role === 'ADMIN' || user.permissions?.includes('COLLECTIONS')) && (
              <button onClick={() => setShowCollectionModal(true)} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-md font-bold hover:bg-brand-700 shadow-sm transition-all active:scale-95"><Plus size={18} className="mr-2" /> New Collection</button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
          {currentView === 'DASHBOARD' && <Dashboard collections={collections} settings={settings} />}
          {currentView === 'COLLECTIONS' && (
            <div className="p-8 text-center">
              <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl shadow-sm border border-brand-100 dark:border-slate-800 max-w-lg mx-auto">
                <Calculator size={48} className="mx-auto text-brand-300 mb-4" />
                <h3 className="text-xl font-bold dark:text-slate-100">Ready to Collect</h3>
                <p className="text-gray-500 dark:text-slate-400 mt-2 mb-6">Click to record a new customer payment.</p>
                <button onClick={() => setShowCollectionModal(true)} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg">Start New Collection</button>
              </div>
            </div>
          )}
          {currentView === 'CUSTOMERS' && (
            <CustomerManager customers={customers} routes={routes} onAddCustomer={async(c)=>{const {customer_id,...d}=c;await setDoc(doc(db,'customers',customer_id),d)}} onEditCustomer={async(c)=>{const {customer_id,...d}=c;await updateDoc(doc(db,'customers',customer_id),d as any)}} onImport={(list)=>list.forEach(async(c)=>await setDoc(doc(db,'customers',c.customer_id),c))} />
          )}
          {currentView === 'CHEQUES' && <ChequeManager collections={collections} settings={settings} />}
          {currentView === 'RECONCILIATION' && <Reconciliation collections={collections} onReconcile={async (ids, status) => { const batch = writeBatch(db); ids.forEach(id => batch.update(doc(db, 'collections', id), { status })); await batch.commit(); }} />}
          {currentView === 'REPORTS' && <Reports collections={collections} customers={customers} routes={routes} settings={settings} />}
          {currentView === 'LEDGER' && <Ledger entries={ledger} settings={settings} />}
          {currentView === 'AUDIT' && <AuditLogs logs={auditLogs} />}
          {currentView === 'USERS' && <UserManager users={usersList} onAddUser={async(u)=>{const{uid,...d}=u;await setDoc(doc(db,'users',uid),{...d})}} onUpdateUser={async(u)=>await updateDoc(doc(db,'users',u.uid),u as any)} onDeleteUser={async(id)=>await deleteDoc(doc(db,'users',id))} />}
          {currentView === 'SETTINGS' && (
            <Settings 
              settings={settings} 
              routes={routes} 
              onSave={async(s)=>await setDoc(doc(db,'system','settings'),s)} 
              onAddRoute={async(r)=>{const {route_id,...d}=r;await setDoc(doc(db,'routes',route_id),d)}}
            />
          )}
        </div>

        {showCollectionModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl"><CollectionForm customers={customers} settings={settings} onSave={handleSaveCollection} onCancel={() => setShowCollectionModal(false)} /></div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;