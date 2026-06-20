'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { auth, googleAuthProvider, signInWithPopup, signOut } from '@/lib/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';

// Interfaces
interface Interaction {
  id: string;
  type: 'call' | 'mail' | 'meet' | 'note' | 'contract';
  title: string;
  timestamp: string;
  description: string;
}

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  status: 'Lead' | 'Customer' | 'Inactive' | 'Negotiation';
  leadSource?: string;
  dealValue?: number;
  dealProgress?: number; // 0 - 100
  dealNextStep?: string;
  avatarUrl?: string;
  initials: string;
  timeline: Interaction[];
}

interface Activity {
  id: string;
  type: 'call' | 'meet' | 'task';
  title: string;
  subtitle: string;
  time: string;
  status?: string;
  completed?: boolean;
}

// Initial Data
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Alex Danvers',
    company: 'L-Corp Dynamics',
    email: 'alex.danvers@lcorpdynamics.com',
    phone: '+1 (555) 728-1992',
    address: '100 Science Parkway, National City, CA',
    status: 'Lead',
    leadSource: 'Website Inquiry',
    dealValue: 12000,
    dealProgress: 20,
    dealNextStep: 'Initial outreach call scheduled.',
    initials: 'AD',
    timeline: [
      { id: 'i1', type: 'note', title: 'Lead Captured', timestamp: '3 days ago', description: 'Web form inquiry regarding custom pipeline reporting.' }
    ]
  },
  {
    id: 'c2',
    name: 'Arthur Morgan',
    company: 'Blackwater Imports',
    email: 'arthur@blackwaterimports.com',
    phone: '+1 (555) 902-1200',
    address: '1899 Frontier Blvd, Saint Denis, LA',
    status: 'Customer',
    leadSource: 'Referral',
    dealValue: 65000,
    dealProgress: 100,
    dealNextStep: 'Deal closed. Supporting roll-out stage.',
    initials: 'AM',
    timeline: [
      { id: 'i2a', type: 'meet', title: 'Onboarding Session', timestamp: '5 days ago', description: 'Completed setup guidelines with Arthur.' },
      { id: 'i2b', type: 'note', title: 'Contract Signed', timestamp: '1 week ago', description: 'Standard enterprise tier terms accepted.' }
    ]
  },
  {
    id: 'c3',
    name: 'Bethany Ross',
    company: 'Ross & Associates',
    email: 'b.ross@associates.com',
    phone: '+1 (555) 700-1928',
    address: '742 Executive Way, Seattle, WA',
    status: 'Inactive',
    leadSource: 'Industry Event',
    dealValue: 0,
    dealProgress: 0,
    dealNextStep: 'Inactive account.',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKSJjmro5AKe5RELiL0XiQDT9jgmXn13mlH46QLTOMj-OipplzibgawOdK3dZ5DNFERgIrhEpzhY5-2ZY-uHgPH1CzrnYzcOQVj17NCvJVyvHIQs02W0guv42m3tSAigF9Rv635Gr7OcmGcVq7iSxP9cxomDDIh2eGdEUdt-G7IalwgAymrk20tPXX2yTxTqKdZgdd2-qhxEEA9cMTNVF3vpfZuT4FaPIMnaNIgGr0qacDufZpjz1QwxLWOpZyQSQHGzCnvlykzxB1',
    initials: 'BR',
    timeline: [
      { id: 'i3', type: 'mail', title: 'Follow-up Email', timestamp: 'Oct 24', description: 'Checked in on Q2 budgeting requests. No reply received.' }
    ]
  },
  {
    id: 'c4',
    name: 'Clark Kent',
    company: 'Daily Planet Media',
    email: 'ckent@dailyplanet.com',
    phone: '+1 (555) 234-9000',
    address: '222 Metropolis Ave, Floor 14, Metropolis, NY',
    status: 'Customer',
    leadSource: 'LinkedIn',
    dealValue: 24000,
    dealProgress: 100,
    dealNextStep: 'Active subscriber support.',
    initials: 'CK',
    timeline: [
      { id: 'i4', type: 'call', title: 'Support Handshake', timestamp: '2 weeks ago', description: 'Assisted in configuration of daily alert integrations.' }
    ]
  },
  {
    id: 'c5',
    name: 'Alex Martinez',
    company: 'TechLogistics Corp',
    email: 'a.martinez@techlogistics.com',
    phone: '+1 (555) 012-3456',
    address: '452 Innovation Way, Suite 1200, Austin, TX',
    status: 'Negotiation',
    leadSource: 'Website Inquiry',
    dealValue: 45000,
    dealProgress: 75,
    dealNextStep: 'Contract finalization with legal team.',
    initials: 'AM',
    timeline: [
      { id: 'i5a', type: 'meet', title: 'Meeting Notes', timestamp: '2h ago', description: 'Discussed Q4 expansion plans. Alex is interested in our enterprise tier package.' },
      { id: 'i5b', type: 'call', title: 'Outbound Call', timestamp: 'Yesterday', description: 'Duration: 12m 45s. Follow-up regarding the technical documentation sent last week.' },
      { id: 'i5c', type: 'contract', title: 'Contract Sent', timestamp: 'Oct 12', description: 'Initial draft of the service agreement delivered via DocuSign.' }
    ]
  }
];

const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'act1', type: 'call', title: 'Call John Doe', subtitle: 'Follow up on Enterprise Deal', time: '10:30 AM', status: 'Overdue', completed: false },
  { id: 'act2', type: 'meet', title: 'Meeting with Acme Corp', subtitle: 'Quarterly Review Session', time: '02:00 PM', status: 'High', completed: false },
  { id: 'act3', type: 'task', title: 'Send Proposal', subtitle: 'TechStart Inc. Integration', time: 'Tomorrow', completed: false }
];

const formatNumber = (val: number | undefined | null): string => {
  if (val === undefined || val === null) return "0";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function Page() {
  // Navigation State
  // 'dashboard' | 'customers' | 'activities' | 'settings' | 'customer-details' | 'add-customer'
  const [view, setView] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('c5');

  // Success indicator toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast manager
  const triggerToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, [setToastMessage]);

  // Firebase auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core Data State
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);

  // Save setters
  const saveCustomersData = (updatedCustomers: Customer[]) => {
    setCustomers(updatedCustomers);
    localStorage.setItem('crm_pro_customers', JSON.stringify(updatedCustomers));
  };

  const saveActivitiesData = (updatedActivities: Activity[]) => {
    setActivities(updatedActivities);
    localStorage.setItem('crm_pro_activities', JSON.stringify(updatedActivities));
  };

  // Safe Cloud Synchronization
  const fetchCloudData = async (user: User) => {
    setIsSyncing(true);
    try {
      const token = await user.getIdToken();
      const customersRes = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (customersRes.ok) {
        const data = await customersRes.json();
        if (data.length === 0) {
          const seedRes = await fetch('/api/db/reset', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (seedRes.ok) {
            const seedDataRes = await fetch('/api/customers', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const seedData = await seedDataRes.json();
            setCustomers(seedData);
          }
        } else {
          setCustomers(data);
        }
      }

      const activitiesRes = await fetch('/api/activities', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        setActivities(actData);
      }
    } catch (e) {
      console.error('Error syncing database:', e);
      triggerToast('Sincronização falhou.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch or fall back whenever auth status changes
  useEffect(() => {
    let active = true;

    async function sync() {
      if (!currentUser) return;
      setIsSyncing(true);
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/customers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (data.length === 0) {
            const seedRes = await fetch('/api/db/reset', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (seedRes.ok && active) {
              const seedDataRes = await fetch('/api/customers', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const seedData = await seedDataRes.json();
              if (active) setCustomers(seedData);
            }
          } else {
            if (active) setCustomers(data);
          }
        }

        const actRes = await fetch('/api/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (actRes.ok && active) {
          const actData = await actRes.json();
          setActivities(actData);
        }
      } catch (err) {
        console.error(err);
        if (active) triggerToast('Sincronização falhou.');
      } finally {
        if (active) setIsSyncing(false);
      }
    }

    if (currentUser) {
      sync();
    } else {
      if (typeof window !== 'undefined') {
        const savedCust = localStorage.getItem('crm_pro_customers');
        const savedAct = localStorage.getItem('crm_pro_activities');
        if (savedCust) {
          try {
            setCustomers(JSON.parse(savedCust));
          } catch (e) {
            setCustomers(INITIAL_CUSTOMERS);
          }
        } else {
          setCustomers(INITIAL_CUSTOMERS);
        }
        if (savedAct) {
          try {
            setActivities(JSON.parse(savedAct));
          } catch (e) {
            setActivities(INITIAL_ACTIVITIES);
          }
        } else {
          setActivities(INITIAL_ACTIVITIES);
        }
      }
    }

    return () => {
      active = false;
    };
  }, [currentUser, triggerToast]);

  // Auth Action Handlers
  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
      triggerToast('Sessão iniciada na cloud!');
    } catch (e) {
      console.error('Google Sign In error:', e);
      triggerToast('Erro de autenticação Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      await signOut(auth);
      triggerToast('Sessão terminada.');
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      setAuthLoading(false);
    }
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Call simulation sheet
  const [activeCallCustomer, setActiveCallCustomer] = useState<Customer | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Interaction Logging modals
  const [isNewInteractionOpen, setIsNewInteractionOpen] = useState(false);
  const [newInteractionType, setNewInteractionType] = useState<'call' | 'mail' | 'meet' | 'note' | 'contract'>('note');
  const [newInteractionTitle, setNewInteractionTitle] = useState('');
  const [newInteractionDesc, setNewInteractionDesc] = useState('');

  // New Quick Task dialog state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubtitle, setNewTaskSubtitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('Standard');

  // Add Customer form state
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSource, setFormSource] = useState('Website Inquiry');
  const [formDealValue, setFormDealValue] = useState('25000');
  const [formNextStep, setFormNextStep] = useState('Schedule an exploratory meeting.');
  const [formNameError, setFormNameError] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Call duration counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCallCustomer) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCallCustomer]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initiate call simulator
  const handleCallClient = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCallDuration(0);
    setActiveCallCustomer(customer);
  };

  const handleHangUp = () => {
    if (!activeCallCustomer) return;
    
    // Auto log call to customer timeline
    const durationStr = formatDuration(callDuration);
    const newInteraction: Interaction = {
      id: 'i_' + Date.now(),
      type: 'call',
      title: 'Outbound Call Completed',
      timestamp: 'Just now',
      description: `Spoke for ${durationStr}. Contacted at ${activeCallCustomer.phone}.`
    };

    const updatedCustomers = customers.map((c) => {
      if (c.id === activeCallCustomer.id) {
        return {
          ...c,
          timeline: [newInteraction, ...c.timeline]
        };
      }
      return c;
    });

    saveCustomersData(updatedCustomers);
    triggerToast(`Call logged to ${activeCallCustomer.name}'s timeline!`);
    setActiveCallCustomer(null);
  };

  // Statistics calculation helpers
  const totalRevenueSum = customers.reduce((sum, c) => {
    if (c.status !== 'Inactive' && c.dealValue) {
      return sum + c.dealValue;
    }
    return sum;
  }, 0);

  const activeDealsCount = customers.filter(c => c.status === 'Negotiation' || c.status === 'Customer').length;
  const newLeadsCount = customers.filter(c => c.status === 'Lead').length;

  // Render helpers
  const getStatusChipStyle = (status: Customer['status']) => {
    switch (status) {
      case 'Lead':
        return 'bg-amber-400/15 text-amber-300 border border-amber-400/30 font-medium';
      case 'Customer':
        return 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 font-medium';
      case 'Negotiation':
        return 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 font-medium';
      case 'Inactive':
        return 'bg-white/5 text-white/50 border border-white/10 font-medium';
      default:
        return 'bg-white/5 text-white/70 border border-white/15';
    }
  };

  // Add customer submission handling
  const handleAddCustomerSubmit = async () => {
    if (!formName.trim()) {
      setFormNameError(true);
      return;
    }
    setFormNameError(false);
    setIsSubmitLoading(true);

    const nameParts = formName.trim().split(' ');
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameParts[0].substring(0, 2).toUpperCase();

    const newCust: any = {
      id: 'c_' + Date.now(),
      name: formName.trim(),
      company: formCompany.trim() || 'Independent Professional',
      email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: formPhone.trim() || '+1 (555) 000-0000',
      status: 'Lead',
      leadSource: formSource,
      dealValue: Number(formDealValue) || 15000,
      dealProgress: 10,
      dealNextStep: formNextStep,
      initials: initials,
    };

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newCust),
        });
        if (res.ok) {
          const created = await res.json();
          setCustomers([created, ...customers]);
          triggerToast(`Adicionado ${newCust.name} à base de dados!`);
        } else {
          throw new Error('Cloud submission failed');
        }
      } catch (e) {
        console.error(e);
        triggerToast('Back-end falhou, guardado em cache.');
        const withLocalTimeline = {
          ...newCust,
          timeline: [
            {
              id: 'i_c_' + Date.now(),
              type: 'note',
              title: 'Lead Created',
              timestamp: 'Just now',
              description: `Pipeline initialized from source: ${formSource}. Next milestone: ${formNextStep}`
            }
          ]
        };
        saveCustomersData([withLocalTimeline, ...customers]);
      }
    } else {
      const withLocalTimeline = {
        ...newCust,
        timeline: [
          {
            id: 'i_c_' + Date.now(),
            type: 'note',
            title: 'Lead Created',
            timestamp: 'Just now',
            description: `Pipeline initialized from source: ${formSource}. Next milestone: ${formNextStep}`
          }
        ]
      };
      saveCustomersData([withLocalTimeline, ...customers]);
      triggerToast(`Adicionado ${newCust.name} localmente!`);
    }

    setIsSubmitLoading(false);
    // Reset fields
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormSource('Website Inquiry');
    setView('customers');
  };

  // Interaction sub-form log
  const handleLogInteraction = async () => {
    if (!newInteractionTitle.trim()) return;

    const newInt: any = {
      id: 'int_' + Date.now(),
      type: newInteractionType,
      title: newInteractionTitle.trim(),
      timestamp: 'Just now',
      description: newInteractionDesc.trim() || 'Logged without specific detailed annotations.'
    };

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`/api/customers/${selectedCustomerId}/timeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newInt)
        });

        if (res.ok) {
          const savedInt = await res.json();
          
          // Also update customer status on the backend if type was contract (to Negotiation)
          let updatedStatus = undefined;
          if (newInteractionType === 'contract') {
            updatedStatus = 'Negotiation';
            await fetch(`/api/customers/${selectedCustomerId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'Negotiation' })
            });
          }

          // Update local memory
          const updated = customers.map((c) => {
            if (c.id === selectedCustomerId) {
              return {
                ...c,
                status: updatedStatus || c.status,
                timeline: [savedInt, ...c.timeline]
              };
            }
            return c;
          });
          setCustomers(updated);
          triggerToast('Interação guardada na Cloud!');
        } else {
          throw new Error('Cloud timeline insertion failed');
        }
      } catch (e) {
        console.error(e);
        triggerToast('Back-end falhou, guardado em cache.');
        const updated = customers.map((c) => {
          if (c.id === selectedCustomerId) {
            let updatedStatus = c.status;
            if (newInteractionType === 'contract') {
              updatedStatus = 'Negotiation';
            }
            return {
              ...c,
              status: updatedStatus,
              timeline: [newInt, ...c.timeline]
            };
          }
          return c;
        });
        saveCustomersData(updated);
      }
    } else {
      const updated = customers.map((c) => {
        if (c.id === selectedCustomerId) {
          let updatedStatus = c.status;
          if (newInteractionType === 'contract') {
            updatedStatus = 'Negotiation';
          }
          return {
            ...c,
            status: updatedStatus,
            timeline: [newInt, ...c.timeline]
          };
        }
        return c;
      });
      saveCustomersData(updated);
      triggerToast('Interação registada localmente.');
    }

    setIsNewInteractionOpen(false);
    setNewInteractionTitle('');
    setNewInteractionDesc('');
  };

  // Add new activity log
  const handleAddNewTask = async () => {
    if (!newTaskTitle.trim()) return;

    const newAct: any = {
      id: 'act_' + Date.now(),
      type: 'task',
      title: newTaskTitle.trim(),
      subtitle: newTaskSubtitle.trim() || 'Quick Action Item',
      time: newTaskTime.trim() || 'Today',
      status: newTaskStatus,
      completed: false
    };

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newAct)
        });
        if (res.ok) {
          const created = await res.json();
          setActivities([created, ...activities]);
          triggerToast('Tarefa adicionada à Cloud!');
        } else {
          throw new Error('Cloud activity addition failed');
        }
      } catch (e) {
        console.error(e);
        triggerToast('Sem ligação à Cloud, guardado em cache.');
        saveActivitiesData([newAct, ...activities]);
      }
    } else {
      saveActivitiesData([newAct, ...activities]);
      triggerToast('Tarefa registada localmente.');
    }

    setIsNewTaskOpen(false);
    setNewTaskTitle('');
    setNewTaskSubtitle('');
    setNewTaskTime('');
  };

  // Toggle activity checkbox
  const toggleActivityComplete = async (id: string) => {
    const act = activities.find(a => a.id === id);
    if (!act) return;

    const newCompletedState = !act.completed;

    // Update memory immediately for responsive feel
    const updated = activities.map((a) => {
      if (a.id === id) {
        return { ...a, completed: newCompletedState };
      }
      return a;
    });
    setActivities(updated);

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`/api/activities/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ completed: newCompletedState })
        });
        if (res.ok) {
          triggerToast('Estado atualizado na Cloud!');
        } else {
          throw new Error('Cloud activity status update failed');
        }
      } catch (e) {
        console.error(e);
        triggerToast('Erro na Cloud, atualizado localmente.');
        saveActivitiesData(updated);
      }
    } else {
      saveActivitiesData(updated);
      triggerToast('Atividade atualizada.');
    }
  };

  // Filter & group customers alphabetically
  const filteredCustomers = customers.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.leadSource && c.leadSource.toLowerCase().includes(term))
    );
  });

  // Unique sorted first letters of customers
  const alphabet = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

  // Groups
  const groupedCustomers: { [key: string]: Customer[] } = {};
  filteredCustomers.forEach((c) => {
    const letter = c.name.trim()[0].toUpperCase();
    if (!groupedCustomers[letter]) {
      groupedCustomers[letter] = [];
    }
    groupedCustomers[letter].push(c);
  });

  const sortedLetters = Object.keys(groupedCustomers).sort();

  return (
    <div id="app-root" className="w-full max-w-md mx-auto min-h-screen bg-slate-950/40 backdrop-blur-3xl flex flex-col relative shadow-[0_0_80px_rgba(0,0,0,0.6)] border-x border-white/15 overflow-x-hidden select-none text-white">
      
      {/* Toast Notifier */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            id="toast-message"
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-white/15 backdrop-blur-xl border border-white/25 text-white text-xs px-4 py-2.5 rounded-full flex items-center gap-2 shadow-2xl"
          >
            <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
            <span className="font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header id="top-app-bar" className="bg-white/10 backdrop-blur-2xl sticky top-0 z-45 border-b border-white/15 px-4 h-16 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {view === 'customer-details' || view === 'add-customer' ? (
            <button
              id="back-button"
              onClick={() => setView(view === 'customer-details' ? 'customers' : 'dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
          ) : (
            <div 
              onClick={() => setView('settings')}
              className="w-9 h-9 rounded-full overflow-hidden border border-white/25 cursor-pointer active:scale-95 transition-transform"
            >
              {currentUser && currentUser.photoURL ? (
                <Image
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "User Settings"}
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : currentUser ? (
                <div className="w-full h-full bg-cyan-600/50 flex items-center justify-center text-[10px] font-black text-cyan-200">
                  {currentUser.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'US'}
                </div>
              ) : (
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1N6bhLttuzvOrvLV5waXCIZjDnoJ6_SWt0sSIr-HBAe6bVcgTcOBItdORALJMOjFLu0eT9M0P_THsqostrXPhrRgJv07gQjVbXpwHWa_qlozAcsERjcDKdo98Y_hXsHdqP3RQmooxsjnWFJWEOT3QVRY-b72fWF78h-D-BrEHys-Cl2OU9qCCuWQGd942c9UIs_qwrgphqjSBEkQxGc_CjX5ZmjywFrs0U6Q-niy9F6Jb60dzGDT88jwCMOyq7XexoSA569J03xrN"
                  alt="Executive Portrait"
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )}

          <h1 id="app-title" className="font-black text-lg tracking-tight text-white">
            {view === 'customer-details' && 'Customer Details'}
            {view === 'add-customer' && 'Add Customer'}
            {view === 'dashboard' && 'Gestor de Clientes'}
            {view === 'customers' && 'Gestor de Clientes'}
            {view === 'activities' && 'Upcoming Activities'}
            {view === 'settings' && 'System Settings'}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {view !== 'add-customer' && (
            <button
              id="search-icon-btn"
              onClick={() => {
                setView('customers');
                setTimeout(() => {
                  document.getElementById('search-input')?.focus();
                }, 100);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          )}
          {view === 'add-customer' && (
            <span className="material-symbols-outlined text-white/40">help_outline</span>
          )}
        </div>
      </header>

      {/* Main Container Core */}
      <main id="main-scrollable-content" className="flex-1 overflow-y-auto pb-24">
        
        {/* VIEW 1: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="p-4 space-y-5">
            {/* Revenue Widget */}
            <div id="revenue-card" className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl relative overflow-hidden">
              <div className="absolute -top-3 -right-3 opacity-10 rotate-12">
                <span className="material-symbols-outlined text-white text-8xl">trending_up</span>
              </div>

              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[11px] font-bold text-blue-200 uppercase tracking-widest leading-none mb-1">Total Revenue</p>
                  <h2 className="text-3xl font-black tracking-tight text-white mt-1">${formatNumber(totalRevenueSum)}</h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full flex items-center border border-emerald-500/30">
                  <span className="material-symbols-outlined text-xs mr-0.5 font-bold">arrow_upward</span>
                  12%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden mt-4">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(6,182,212,0.4)]" 
                  style={{ width: `${Math.min(100, (totalRevenueSum / 200000) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <p className="text-[11px] text-white/60 font-semibold">
                  {Math.round((totalRevenueSum / 200000) * 100)}% of quarterly goal reached
                </p>
                <p className="text-[11px] text-white font-bold">$200,000 Target</p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3" id="dashboard-stats-grid">
              <div 
                id="active-deals-stat"
                onClick={() => setView('customers')}
                className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl cursor-pointer hover:border-white/30 active:scale-95 transition-all flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 mb-4">
                  <span className="material-symbols-outlined">handshake</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Active Deals</p>
                  <h3 className="text-3xl font-black text-white">{activeDealsCount}</h3>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-1">+3 incremental</p>
                </div>
              </div>

              <div 
                id="new-leads-stat"
                onClick={() => setView('customers')}
                className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl cursor-pointer hover:border-white/30 active:scale-95 transition-all flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mb-4">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">New Leads</p>
                  <h3 className="text-3xl font-black text-white">{newLeadsCount}</h3>
                  <p className="text-[10px] text-white/50 font-semibold mt-1">Steady growth rate</p>
                </div>
              </div>
            </div>

            {/* Upcoming Activities */}
            <div id="upcoming-activities-section" className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black text-blue-200 uppercase tracking-wider">Upcoming Activities</h2>
                <button onClick={() => setView('activities')} className="text-xs font-bold text-cyan-300 hover:underline">
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {activities.slice(0, 3).map((act) => (
                  <div
                    key={act.id}
                    onClick={() => toggleActivityComplete(act.id)}
                    className={cn(
                      "backdrop-blur-md border rounded-2xl p-3.5 flex items-center gap-3.5 shadow-md hover:bg-white/10 transition-all cursor-pointer",
                      act.completed 
                        ? "bg-white/5 border-white/5 opacity-40" 
                        : "bg-white/5 border-white/10 hover:border-white/25"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      act.type === 'call' && 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                      act.type === 'meet' && 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                      act.type === 'task' && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    )}>
                      <span className="material-symbols-outlined">
                        {act.type === 'call' && 'call'}
                        {act.type === 'meet' && 'groups'}
                        {act.type === 'task' && 'description'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "text-xs font-bold text-white truncate",
                        act.completed && "line-through text-white/40"
                      )}>{act.title}</h4>
                      <p className="text-[11px] text-white/60 truncate mt-0.5">{act.subtitle}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-white/80">{act.time}</p>
                      {act.status && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 inline-block border",
                          act.status === 'Overdue' && 'bg-red-500/20 text-red-300 border-red-500/20',
                          act.status === 'High' && 'bg-orange-500/20 text-orange-300 border-orange-500/20'
                        )}>
                          {act.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div id="quick-actions-section" className="space-y-3">
              <h2 className="text-xs font-black text-blue-200 uppercase tracking-wider">Quick Actions</h2>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setView('add-customer')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 active:scale-95 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-lg active:scale-95 duration-150">
                    <span className="material-symbols-outlined text-lg">person_add</span>
                  </div>
                  <span className="text-[9px] font-semibold text-white/80 mt-1 leading-tight">New Lead</span>
                </button>

                <button
                  onClick={() => setIsNewTaskOpen(true)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 active:scale-95 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-lg active:scale-95 duration-150">
                    <span className="material-symbols-outlined text-lg">add_task</span>
                  </div>
                  <span className="text-[9px] font-semibold text-white/80 mt-1 leading-tight">Add Task</span>
                </button>

                <button
                  onClick={() => {
                    setView('customer-details');
                    setSelectedCustomerId('c5');
                    setTimeout(() => setIsNewInteractionOpen(true), 200);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 active:scale-95 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-lg active:scale-95 duration-150">
                    <span className="material-symbols-outlined text-lg">post_add</span>
                  </div>
                  <span className="text-[9px] font-semibold text-white/80 mt-1 leading-tight">Add Note</span>
                </button>

                <button
                  onClick={() => setView('settings')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 active:scale-95 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-lg active:scale-95 duration-150">
                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                  </div>
                  <span className="text-[9px] font-semibold text-white/80 mt-1 leading-tight">Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMERS (Search / Filter / Alphabetic index) */}
        {view === 'customers' && (
          <div className="flex flex-col min-h-full">
            {/* Sticky Search bar */}
            <div className="p-4 bg-transparent sticky top-0 z-30">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 text-lg">
                  search
                </span>
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients, companies..."
                  className="w-full bg-white/10 backdrop-blur-md text-white content-center pl-10 pr-4 h-12 rounded-xl text-xs font-semibold placeholder-white/30 border border-white/20 outline-none focus:border-white/35 focus:ring-1 focus:ring-white/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-md">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Letters fast scroll & filters */}
            <div className="flex px-4 items-center justify-between pb-1 shrink-0">
              <span className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">
                Showing {filteredCustomers.length} contact records
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-bold text-cyan-300 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Alphabetic index bar (Floating Right aligned overlay) */}
            <div 
              id="alphabet-scrollbar" 
              className="fixed right-2 top-36 bottom-24 flex flex-col justify-around items-center py-2.5 text-[10px] font-bold text-white/30 select-none z-40 bg-white/10 backdrop-blur-md px-1.5 rounded-full border border-white/15"
            >
              {alphabet.map((letter) => {
                const hasContacts = groupedCustomers[letter] && groupedCustomers[letter].length > 0;
                return (
                  <button
                    key={letter}
                    disabled={!hasContacts}
                    onClick={() => {
                      const el = document.getElementById(`letter-group-${letter}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        triggerToast(`Scrolled directly to ${letter}`);
                      }
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[9px] hover:bg-white/10 transition-colors",
                      hasContacts ? "text-cyan-300 font-extrabold cursor-pointer" : "text-white/10 pointer-events-none"
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            {/* Interactive Groups of Customer cards */}
            <div className="px-4 pr-10 pb-16 space-y-5">
              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center text-white/50">
                  <span className="material-symbols-outlined text-4xl text-white/30 mb-2">person_off</span>
                  <p className="text-xs font-semibold">No customers correspond to your query.</p>
                  <button
                    onClick={() => {
                      setView('add-customer');
                      setFormName(searchQuery);
                    }}
                    className="text-[11px] font-bold mt-2.5 text-cyan-300 bg-white/10 border border-white/15 hover:bg-white/15 p-2 rounded-xl"
                  >
                    + Create record &quot;{searchQuery}&quot;
                  </button>
                </div>
              ) : (
                sortedLetters.map((letter) => (
                  <div key={letter} id={`letter-group-${letter}`} className="scroll-mt-24">
                    {/* Header letter label */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-extrabold text-cyan-300 tracking-widest">{letter}</span>
                      <div className="h-[1px] flex-grow bg-white/15" />
                    </div>

                    <div className="space-y-2.5">
                      {groupedCustomers[letter].map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomerId(customer.id);
                            setView('customer-details');
                          }}
                          className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between shadow-lg active:scale-[0.98] hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Avatar */}
                            {customer.avatarUrl ? (
                              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shrink-0">
                                <Image
                                  src={customer.avatarUrl}
                                  alt={customer.name}
                                  width={48}
                                  height={48}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className={cn(
                                "w-12 h-11 rounded-full flex items-center justify-center font-bold shrink-0 text-xs tracking-wider border",
                                customer.status === 'Lead' 
                                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/30' 
                                  : 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30'
                              )}>
                                {customer.initials}
                              </div>
                            )}

                            <div className="min-w-0 leading-normal">
                              <p className="text-xs font-bold text-white truncate">{customer.name}</p>
                              <p className="text-[10px] text-white/50 truncate mt-0.5">{customer.company}</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={cn(
                                  "text-[8.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full",
                                  getStatusChipStyle(customer.status)
                                )}>
                                  {customer.status}
                                </span>
                                {customer.dealValue ? (
                                  <span className="text-[9px] text-white/60 font-bold font-sans">
                                    • ${formatNumber(customer.dealValue || 0)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Quick call dial launch button */}
                          <button
                            onClick={(e) => handleCallClient(customer, e)}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 hover:scale-105 active:scale-90 text-white flex items-center justify-center transition-all shrink-0 shadow-lg shadow-cyan-500/20"
                          >
                            <span className="material-symbols-outlined text-sm font-semibold">call</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: CUSTOMER DETAILS TIMELINE & METADATA */}
        {view === 'customer-details' && (
          (() => {
            const customer = customers.find(c => c.id === selectedCustomerId) || customers[0];
            if (!customer) return <div className="p-4">Customer database record not found.</div>;

            return (
              <div className="p-4 space-y-4">
                {/* Profile header card */}
                <div id="profile-header-card" className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 flex flex-col items-center text-center shadow-xl relative">
                  <div className="relative mb-3.5">
                    {customer.avatarUrl ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 shadow-lg shrink-0">
                        <Image
                          src={customer.avatarUrl}
                          alt={customer.name}
                          width={80}
                          height={80}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-cyan-300 border border-white/20 shadow-lg shrink-0">
                        {customer.initials}
                      </div>
                    )}

                    <button 
                      onClick={() => triggerToast("Dynamic image file upload triggers from Settings.")}
                      className="absolute bottom-0 right-0 bg-gradient-to-br from-cyan-400 to-blue-500 hover:scale-105 active:scale-95 text-white p-1.5 rounded-full border border-white/20 shadow-md flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">edit</span>
                    </button>
                  </div>

                  <h2 className="text-lg font-black text-white">{customer.name}</h2>
                  <p className="text-[11px] text-white/50 font-semibold mt-0.5">{customer.company}</p>
                  
                  {/* Badge */}
                  <span className={cn(
                    "mt-2 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block",
                    getStatusChipStyle(customer.status)
                  )}>
                    {customer.status}
                  </span>

                  {/* Immediate Action Row icons */}
                  <div className="grid grid-cols-4 gap-2.5 w-full border-t border-white/15 pt-3.5 mt-4">
                    <button
                      onClick={() => handleCallClient(customer)}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] font-semibold">call</span>
                      </div>
                      <span className="text-[9px] font-bold text-white/60">Call</span>
                    </button>

                    <button
                      onClick={() => {
                        window.location.href = `mailto:${customer.email}`;
                        triggerToast(`Launching system application to email ${customer.name}`);
                      }}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] font-semibold">mail</span>
                      </div>
                      <span className="text-[9px] font-bold text-white/60">Email</span>
                    </button>

                    <button
                      onClick={() => {
                        triggerToast(`Opening custom instant messaging tunnel to ${customer.name}...`);
                      }}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] font-semibold">chat_bubble</span>
                      </div>
                      <span className="text-[9px] font-bold text-white/60">Chat</span>
                    </button>

                    <button
                      onClick={() => {
                        triggerToast(`Opening location waypoint: ${customer.address || "HQ Map Location"}`);
                      }}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] font-semibold">location_on</span>
                      </div>
                      <span className="text-[9px] font-bold text-white/60">Map</span>
                    </button>
                  </div>
                </div>

                {/* Deal Status Card info */}
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Current Deal Status</h3>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                      customer.status === 'Customer' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    )}>
                      {customer.status === 'Customer' ? 'Closed Won' : 'Under Negotiation'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-lg font-black text-white font-sans">
                        ${formatNumber(customer.dealValue || 15000)}.00
                      </span>
                      <span className="text-[10px] font-bold text-white/60">
                        {customer.dealProgress || 10}% Complete
                      </span>
                    </div>

                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                        style={{ width: `${customer.dealProgress || 10}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-white/70 italic mt-1 leading-snug">
                      Next step: {customer.dealNextStep || 'Ongoing follow-up protocol.'}
                    </p>
                  </div>
                </div>

                {/* Recent Activities Timeline ledger */}
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-white/15 flex justify-between items-center">
                    <h3 className="text-xs font-black text-blue-200 uppercase tracking-wider">Recent Activity</h3>
                    <button 
                      onClick={() => triggerToast(`Visualizing entire chronological record of ${customer.timeline.length} logs.`)}
                      className="text-xs font-bold text-cyan-300 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {customer.timeline.length === 0 ? (
                      <p className="text-[11px] text-white/40 text-center py-4">No logged records associated with this lead.</p>
                    ) : (
                      customer.timeline.map((item, index) => (
                        <div key={item.id} className="flex gap-3 relative">
                          {/* Thread Line node visual */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                              item.type === 'call' && 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                              item.type === 'mail' && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                              item.type === 'meet' && 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                              item.type === 'contract' && 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                              item.type === 'note' && 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            )}>
                              <span className="material-symbols-outlined text-[15px] font-bold">
                                {item.type === 'call' && 'call'}
                                {item.type === 'mail' && 'mail'}
                                {item.type === 'meet' && 'groups'}
                                {item.type === 'contract' && 'description'}
                                {item.type === 'note' && 'post_add'}
                              </span>
                            </div>
                            {index < customer.timeline.length - 1 && (
                              <div className="w-[1.5px] bg-white/15 flex-grow min-h-[25px] mt-2.5" />
                            )}
                          </div>

                          <div className="flex-1 pb-2">
                            <div className="flex justify-between items-start">
                              <h4 className="text-[11px] font-extrabold text-white">{item.title}</h4>
                              <span className="text-[10px] text-white/50 font-medium">{item.timestamp}</span>
                            </div>
                            <p className="text-[10px] text-white/70 mt-1 leading-snug">{item.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Secondary metadata contact card */}
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-300">alternate_email</span>
                    <div>
                      <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Primary Email</p>
                      <p className="text-xs font-bold text-white">{customer.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-300">phone_iphone</span>
                    <div>
                      <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Mobile Number</p>
                      <p className="text-xs font-bold text-white">{customer.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-300">apartment</span>
                    <div>
                      <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">HQ Address</p>
                      <p className="text-xs font-bold text-white">
                        {customer.address || "Not specified."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary blue interaction CTA button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsNewInteractionOpen(true);
                      setNewInteractionTitle('');
                      setNewInteractionDesc('');
                    }}
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105 hover:brightness-110 text-white py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    New Interaction
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* VIEW 4: ACTIVITIES */}
        {view === 'activities' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">
                {activities.filter(a => !a.completed).length} pending itemized protocols
              </span>
              <button
                onClick={() => setIsNewTaskOpen(true)}
                className="text-xs font-bold text-cyan-300 hover:underline"
              >
                + New Activity
              </button>
            </div>

            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className={cn(
                    "backdrop-blur-md border rounded-[24px] p-4 flex items-center gap-4 shadow-xl hover:bg-white/10 transition-all cursor-pointer relative",
                    act.completed 
                      ? "bg-white/5 border-white/5 opacity-40" 
                      : "bg-white/5 border-white/10 hover:border-white/25"
                  )}
                  onClick={() => toggleActivityComplete(act.id)}
                >
                  <button className="shrink-0 text-white/55 hover:text-cyan-300 focus:outline-none">
                    <span className="material-symbols-outlined text-[22px] font-bold">
                      {act.completed ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-xs font-bold text-white truncate",
                      act.completed && "line-through text-white/40"
                    )}>{act.title}</h4>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">{act.subtitle}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[9px] text-white/70 font-bold bg-white/10 px-2 py-0.5 rounded-full inline-block border border-white/10">
                        {act.time}
                      </span>
                      {act.status && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                          act.status === 'Overdue' && 'bg-red-500/20 text-red-300 border-red-500/20',
                          act.status === 'High' && 'bg-orange-500/20 text-orange-300 border-orange-500/20',
                          act.status === 'Standard' && 'bg-blue-500/20 text-blue-300 border-blue-500/20'
                        )}>
                          {act.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Proceed to delete task item?")) {
                        const updated = activities.filter(a => a.id !== act.id);
                        setActivities(updated);

                        if (currentUser) {
                          try {
                            const token = await currentUser.getIdToken();
                            const res = await fetch(`/api/activities/${act.id}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            if (res.ok) {
                              triggerToast("Atividade eliminada da Cloud!");
                            } else {
                              throw new Error('Cloud activity delete failed');
                            }
                          } catch (err) {
                            console.error(err);
                            triggerToast("Eliminado localmente. Cloud falhou.");
                            saveActivitiesData(updated);
                          }
                        } else {
                          saveActivitiesData(updated);
                          triggerToast("Activity entry purged.");
                        }
                      }
                    }}
                    className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-300 flex items-center justify-center transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: ADD NEW CUSTOMER PILELINE FORM */}
        {view === 'add-customer' && (
          <div className="p-4 space-y-4">
            <div className="mb-4">
              <h2 className="text-lg font-black text-white">New Connection</h2>
              <p className="text-[11px] text-white/50 font-semibold mt-0.5">
                Fill in the professional details to initialize the relationship pipeline.
              </p>
            </div>

            {/* Input Form Fields Container */}
            <div id="add-customer-form-container" className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl space-y-4">
              {/* Full Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (e.target.value.trim()) setFormNameError(false);
                  }}
                  placeholder="e.g. Jonathan Ive"
                  className={cn(
                    "w-full bg-white/5 border text-xs font-bold p-3 rounded-xl outline-none text-white placeholder-white/30 focus:bg-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all",
                    formNameError ? 'border-red-400/40 bg-red-500/10 focus:ring-red-400 focus:border-red-400' : 'border-white/15'
                  )}
                />
                {formNameError && (
                  <p id="nameError" className="text-[10px] text-red-300 font-semibold mt-1">
                    Name is required to create a record.
                  </p>
                )}
              </div>

              {/* Company field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Company</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-white/5 border border-white/15 text-xs font-bold p-3 rounded-xl outline-none text-white placeholder-white/30 focus:bg-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Email Address</label>
                <input
                  type="text"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="jonathan@acme.com"
                  className="w-full bg-white/5 border border-white/15 text-xs font-bold p-3 rounded-xl outline-none text-white placeholder-white/30 focus:bg-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white/5 border border-white/15 text-xs font-bold p-3 rounded-xl outline-none text-white placeholder-white/30 focus:bg-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                />
              </div>

              {/* Lead Source */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Lead Source</label>
                <div className="relative">
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 text-xs font-bold p-3 rounded-xl outline-none text-white focus:bg-slate-900 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Website Inquiry" className="bg-slate-900 text-white">Website Inquiry</option>
                    <option value="Referral" className="bg-slate-900 text-white">Referral</option>
                    <option value="LinkedIn" className="bg-slate-900 text-white">LinkedIn</option>
                    <option value="Cold Outreach" className="bg-slate-900 text-white">Cold Outreach</option>
                    <option value="Industry Event" className="bg-slate-900 text-white">Industry Event</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Projected Deal size */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Projected Deal Value ($)</label>
                <input
                  type="number"
                  value={formDealValue}
                  onChange={(e) => setFormDealValue(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full bg-white/5 border border-white/15 text-xs font-bold p-3 rounded-xl outline-none text-white placeholder-white/30 focus:bg-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                />
              </div>

              {/* Next physical milestone step */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">Deal Next Step milestone</label>
                <input
                  type="text"
                  value={formNextStep}
                  onChange={(e) => setFormNextStep(e.target.value)}
                  placeholder="e.g. Share architectural specifications."
                  className="w-full bg-white/5 border border-white/15 text-xs font-bold p-3 rounded-xl outline-none text-white placeholder-white/30 focus:bg-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                />
              </div>

              {/* Info contextual warning */}
              <div className="flex items-center gap-2.5 p-3.5 bg-blue-500/10 text-cyan-300 rounded-2xl border border-blue-500/25">
                <span className="material-symbols-outlined text-[16px] shrink-0 font-bold">info</span>
                <span className="text-[10px] font-semibold leading-relaxed">This customer will be tagged as &quot;New Lead&quot; status by default.</span>
              </div>
            </div>

            {/* Bottom Actions Layer Cancel/Save */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Any unsaved edits will be discarded. Proceed?")) {
                    setView('customers');
                  }
                }}
                className="py-3 px-4 border border-white/20 text-white/80 rounded-2xl hover:bg-white/5 active:scale-95 transition-all text-xs font-bold font-sans"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAddCustomerSubmit}
                disabled={isSubmitLoading}
                className="py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-white rounded-2xl text-xs font-black active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5"
              >
                {isSubmitLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Saving...
                  </>
                ) : (
                  'Save Customer'
                )}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 6: SETTINGS TAB OPTIONS */}
        {view === 'settings' && (
          <div className="p-4 space-y-4">
            {/* Logged profile banner */}
            <div className="bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-slate-900 border border-white/15 text-white p-5 rounded-2xl relative shadow-xl overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-5">
                <span className="material-symbols-outlined text-7xl">database</span>
              </div>
              {currentUser ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shrink-0">
                      {currentUser.photoURL ? (
                        <Image
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || "User"}
                          width={48}
                          height={48}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-cyan-600/30 flex items-center justify-center text-xs font-black text-cyan-300">
                          {currentUser.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'US'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-black text-white truncate">{currentUser.displayName || 'Gestor Admin'}</h3>
                      <p className="text-[10px] text-white/50 font-semibold truncate">{currentUser.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[7.5px] bg-emerald-400/25 border border-emerald-400/30 text-emerald-300 py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">
                          Cloud SQL Ligado
                        </span>
                        {isSyncing && (
                          <span className="text-[7px] text-cyan-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            Sincronizando...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="mt-2 text-left self-start px-3 py-1.5 text-[9px] font-black text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[11px]">logout</span>
                    Terminar Sessão
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-300 text-lg">cloud_off</span>
                    <h3 className="text-xs font-black text-white">Sessão Local (Offline)</h3>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Sincronize com a base de dados relacional Cloud SQL em <strong>europe-west2</strong> para armazenar os seus leads e tarefas de forma segura.
                  </p>
                  <button
                    onClick={handleSignIn}
                    className="mt-2 self-start px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105 hover:brightness-110 active:scale-95 text-white font-black text-[10px] rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-xs">login</span>
                    Entrar com o Google
                  </button>
                </div>
              )}
            </div>

            {/* Simulated preferences settings list */}
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-5 shadow-xl space-y-5">
              <h3 className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Interface Preferences</h3>

              {/* Simulated push notification toggle toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Mobile Push Alerts</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Receive reminders for overdue interactions.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-white/20 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-400 peer-checked:to-blue-500" />
                </label>
              </div>

              {/* Live search dynamic filter preference */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Strict Verification Checks</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Enforce mandatory full name check validation rules.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-white/20 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-400 peer-checked:to-blue-500" />
                </label>
              </div>

              {/* Data wipe action */}
              <div className="border-t border-white/15 pt-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-500">Reset Local Database Cache</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Purges all dynamic entries and loads defaults.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Está prestes a repor a base de dados para o estado inicial por defeito. Tem a certeza?")) {
                      if (currentUser) {
                        try {
                          setIsSyncing(true);
                          const token = await currentUser.getIdToken();
                          const res = await fetch('/api/db/reset', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          if (res.ok) {
                            // Reload
                            await fetchCloudData(currentUser);
                            triggerToast("Base de dados Cloud SQL reposta com sucesso!");
                          } else {
                            throw new Error('Cloud database reset failed');
                          }
                        } catch (e) {
                          console.error(e);
                          triggerToast("Falha na Cloud, a repor dados locais.");
                          localStorage.removeItem('crm_pro_customers');
                          localStorage.removeItem('crm_pro_activities');
                          setCustomers(INITIAL_CUSTOMERS);
                          setActivities(INITIAL_ACTIVITIES);
                        } finally {
                          setIsSyncing(false);
                        }
                      } else {
                        localStorage.removeItem('crm_pro_customers');
                        localStorage.removeItem('crm_pro_activities');
                        setCustomers(INITIAL_CUSTOMERS);
                        setActivities(INITIAL_ACTIVITIES);
                        triggerToast("Database local reposta para os valores originais.");
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold text-red-300 bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 rounded-xl transition-all active:scale-95"
                >
                  Clear Database
                </button>
              </div>
            </div>

            {/* Application Information */}
            <div className="text-center py-6 text-[10px] font-semibold text-white/40 space-y-1">
              <p>Gestor de Clientes Dashboard Engine • v1.4.2</p>
              <p>Designed and Built securely for Google AI Studio Web Portal</p>
            </div>
          </div>
        )}
      </main>

      {/* FLOAT ACTION BUTTON (+) */}
      {view !== 'add-customer' && view !== 'customer-details' && (
        <button
          onClick={() => setView('add-customer')}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 hover:scale-105 active:scale-95 text-white rounded-2xl shadow-xl shadow-cyan-500/20 flex items-center justify-center transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[32px]">add</span>
        </button>
      )}

      {/* BOTTOM NAVIGATION TAB BAR */}
      <nav id="bottom-navbar" className="fixed bottom-0 w-full max-w-md h-20 bg-slate-900/40 backdrop-blur-2xl border-t border-white/15 flex justify-around items-center z-40 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        {/* Dashboard Menu tab */}
        <button
          onClick={() => setView('dashboard')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all duration-150 min-w-[68px] border",
            view === 'dashboard' 
              ? "bg-white/12 text-cyan-300 border-white/10 font-bold scale-95" 
              : "text-white/40 hover:text-white/70 border-transparent scale-90"
          )}
        >
          <span className="material-symbols-outlined text-[20px]" style={view === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            dashboard
          </span>
          <span className="text-[10px] font-bold leading-none tracking-tight">Dashboard</span>
        </button>

        {/* Customers Menu tab */}
        <button
          onClick={() => setView('customers')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all duration-150 min-w-[68px] border",
            view === 'customers' || view === 'customer-details'
              ? "bg-white/12 text-cyan-300 border-white/10 font-bold scale-95" 
              : "text-white/40 hover:text-white/70 border-transparent scale-90"
          )}
        >
          <span className="material-symbols-outlined text-[20px]" style={view === 'customers' || view === 'customer-details' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            group
          </span>
          <span className="text-[10px] font-bold leading-none tracking-tight">Customers</span>
        </button>

        {/* Activities Menu tab */}
        <button
          onClick={() => setView('activities')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all duration-150 min-w-[68px] border",
            view === 'activities'
              ? "bg-white/12 text-cyan-300 border-white/10 font-bold scale-95" 
              : "text-white/40 hover:text-white/70 border-transparent scale-90"
          )}
        >
          <span className="material-symbols-outlined text-[20px]" style={view === 'activities' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            event_note
          </span>
          <span className="text-[10px] font-bold leading-none tracking-tight">Activities</span>
        </button>

        {/* Settings Menu tab */}
        <button
          onClick={() => setView('settings')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all duration-150 min-w-[68px] border",
            view === 'settings'
              ? "bg-white/12 text-cyan-300 border-white/10 font-bold scale-95" 
              : "text-white/40 hover:text-white/70 border-transparent scale-90"
          )}
        >
          <span className="material-symbols-outlined text-[20px]" style={view === 'settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            settings
          </span>
          <span className="text-[10px] font-bold leading-none tracking-tight">Settings</span>
        </button>
      </nav>

      {/* CALL DIALING RING SHEET OVERLAY */}
      <AnimatePresence>
        {activeCallCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/45 dark:bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#000666] text-white w-full max-w-sm mx-4 rounded-[32px] p-6 text-center space-y-6 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full p-2 text-center text-white/30 text-[9px] font-black uppercase tracking-wider">
                CRM PRO outbound Voice Channel
              </div>

              <div className="space-y-3 pt-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20 relative">
                  {/* Ripple pulse visual */}
                  <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
                  {activeCallCustomer.avatarUrl ? (
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <Image
                        src={activeCallCustomer.avatarUrl}
                        alt="Calling client avatar"
                        width={80}
                        height={80}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-white tracking-widest">{activeCallCustomer.initials}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold">{activeCallCustomer.name}</h3>
                  <p className="text-xs text-white/40">{activeCallCustomer.company}</p>
                  <p className="text-xs text-blue-300 font-medium mt-1">{activeCallCustomer.phone}</p>
                </div>
              </div>

              {/* Status timer indicator */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-green-300 tracking-wider uppercase">Connected Voice Call</p>
                <p className="text-sm font-sans tracking-widest text-slate-300 bg-white/5 inline-block py-1 px-4 rounded-full">
                  {formatDuration(callDuration)}
                </p>
              </div>

              {/* Call Controls ring actions */}
              <div className="flex gap-4 items-center justify-center pt-2">
                {/* Mute toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMuted(!isMuted);
                    triggerToast(isMuted ? "Microphone enabled." : "Microphone muted.");
                  }}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border border-white/10 transition-colors duration-150",
                    isMuted ? "bg-amber-600 hover:bg-amber-700" : "bg-white/5 hover:bg-white/15"
                  )}
                  title="Mute switch"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                </button>

                {/* Speaker indicator toggle mock */}
                <button
                  type="button"
                  onClick={() => triggerToast("Speaker feedback toggle not available in web context.")}
                  className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[17px]">volume_up</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleHangUp}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white py-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-transform shadow-lg"
                >
                  <span className="material-symbols-outlined text-[16px] font-black">call_end</span>
                  Hang Up &amp; Save Log
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW INTERACTION LOG DIALOGUE MODAL */}
      <AnimatePresence>
        {isNewInteractionOpen && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end justify-center">
            {/* Click-away element */}
            <div className="absolute inset-0" onClick={() => setIsNewInteractionOpen(false)} />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[32px] w-full max-w-sm p-5 space-y-4 shadow-2xl relative z-40 border-t border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#000666]">New Interaction Entry</h3>
                <button onClick={() => setIsNewInteractionOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-md">close</span>
                </button>
              </div>

              {/* Type Category selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Interaction Type</label>
                <div className="grid grid-cols-5 gap-1">
                  {(['note', 'call', 'meet', 'mail', 'contract'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNewInteractionType(type);
                        if (!newInteractionTitle) {
                          if (type === 'call') setNewInteractionTitle('Outbound Phone Call');
                          if (type === 'meet') setNewInteractionTitle('Face-to-face Client Meeting');
                          if (type === 'mail') setNewInteractionTitle('Email Follow-up sent');
                          if (type === 'contract') setNewInteractionTitle('Contract proposal delivered');
                          if (type === 'note') setNewInteractionTitle('Internal Account Note');
                        }
                      }}
                      className={cn(
                        "py-2 px-1 text-[9px] font-bold uppercase rounded-lg border flex flex-col items-center gap-1 transition-all",
                        newInteractionType === type
                          ? "bg-blue-50 text-[#0056c5] border-[#0056c5]"
                          : "bg-slate-50 border-transparent text-slate-400"
                      )}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {type === 'note' && 'post_add'}
                        {type === 'call' && 'call'}
                        {type === 'meet' && 'groups'}
                        {type === 'mail' && 'mail'}
                        {type === 'contract' && 'description'}
                      </span>
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action summary title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Title summary</label>
                <input
                  type="text"
                  value={newInteractionTitle}
                  onChange={(e) => setNewInteractionTitle(e.target.value)}
                  placeholder="e.g. Discussed spec proposal adjustments"
                  className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-3 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#0056c5]"
                />
              </div>

              {/* Details field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Elaborated details &amp; Notes</label>
                <textarea
                  value={newInteractionDesc}
                  onChange={(e) => setNewInteractionDesc(e.target.value)}
                  placeholder="Insert bullet points, follow-ups, or client mood specifications..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-3 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#0056c5] resize-none"
                />
              </div>

              {/* Submit CTA button interaction */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogInteraction}
                  disabled={!newInteractionTitle.trim()}
                  className="w-full bg-[#0056c5] hover:bg-[#00429b] disabled:opacity-40 text-white py-3 rounded-xl font-bold text-xs"
                >
                  Confirm Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW QUICK TASK MODAL DIAGUE */}
      <AnimatePresence>
        {isNewTaskOpen && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end justify-center">
            {/* Click-away element */}
            <div className="absolute inset-0" onClick={() => setIsNewTaskOpen(false)} />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[32px] w-full max-w-sm p-5 space-y-4 shadow-2xl relative z-40 border-t border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#000666]">Add Dynamic Task Entry</h3>
                <button onClick={() => setIsNewTaskOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-md">close</span>
                </button>
              </div>

              {/* Title task name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Task Title Summary</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Schedule exploratory meeting"
                  className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-3 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#0056c5]"
                />
              </div>

              {/* Sub-text details */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Subtext details/Client name</label>
                <input
                  type="text"
                  value={newTaskSubtitle}
                  onChange={(e) => setNewTaskSubtitle(e.target.value)}
                  placeholder="e.g. TechStart Inc. Integration proposal"
                  className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-3 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#0056c5]"
                />
              </div>

              {/* Time reference / Due date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Due Time / Day</label>
                <input
                  type="text"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  placeholder="e.g. 11:30 AM, Tomorrow, Monday"
                  className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-3 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#0056c5]"
                />
              </div>

              {/* Priority Indicator selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Task priority tier</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Overdue', 'High', 'Standard'] as const).map((pState) => (
                    <button
                      key={pState}
                      type="button"
                      onClick={() => setNewTaskStatus(pState)}
                      className={cn(
                        "py-2 text-[10px] font-black uppercase rounded-xl border transition-colors",
                        newTaskStatus === pState
                          ? pState === 'Overdue' ? 'bg-red-150 border-red-300 text-red-700 font-bold bg-red-50'
                            : pState === 'High' ? 'bg-orange-150 border-orange-300 text-orange-700 font-bold bg-orange-50'
                            : 'bg-blue-150 border-blue-300 text-[#0056c5] font-bold bg-blue-50'
                          : 'bg-slate-50 border-transparent text-slate-400'
                      )}
                    >
                      {pState}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirm submit layout */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddNewTask}
                  disabled={!newTaskTitle.trim()}
                  className="w-full bg-[#0056c5] hover:bg-[#00429b] disabled:opacity-40 text-white py-3 rounded-xl font-bold text-xs shadow-md"
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
