/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, initDB } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Package, 
  Truck, 
  BarChart3, 
  Settings, 
  Plus, 
  ChevronRight,
  MoreVertical,
  History,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Search,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatWeight, formatDate, formatDateTime } from './lib/utils';
import { ShipmentState, Batch, SendingRecord, Variety, Destination } from './types';
import * as XLSX from 'xlsx';

// --- Sub-pages ---
import AddBatchPage from './components/AddBatchPage';
import CreateShipmentPage from './components/CreateShipmentPage';
import AllocationPage from './components/AllocationPage';
import InspectionPage from './components/InspectionPage';

// --- Fragments ---
import BatchListFragment from './components/BatchListFragment';
import ShipmentListFragment from './components/ShipmentListFragment';
import StatisticsFragment from './components/StatisticsFragment';
import OtherFragment from './components/OtherFragment';

type View = 'main' | 'add-batch' | 'create-shipment' | 'allocation' | 'inspection';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [currentView, setCurrentView] = useState<View>('main');
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initDB().then(() => setIsInitialized(true));
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-emerald-200 rounded"></div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'add-batch':
        return <AddBatchPage onBack={() => setCurrentView('main')} />;
      case 'create-shipment':
        return <CreateShipmentPage onBack={() => setCurrentView('main')} onCreated={(id) => {
          setSelectedShipmentId(id);
          setCurrentView('allocation');
        }} />;
      case 'allocation':
        return <AllocationPage 
          shipmentId={selectedShipmentId!} 
          onBack={() => setCurrentView('main')} 
          onComplete={() => setCurrentView('inspection')} 
        />;
      case 'inspection':
        return <InspectionPage 
          shipmentId={selectedShipmentId!} 
          onBack={() => setCurrentView('main')} 
          onFinished={() => setCurrentView('main')} 
        />;
      default:
        return (
          <div className="flex flex-col h-screen bg-slate-50">
            <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center">
              <h1 className="text-xl font-bold text-emerald-800 tracking-tight">
                棉种仓储管理 <span className="text-xs font-normal text-slate-400 ml-2">v1.0</span>
              </h1>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Package size={18} />
              </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4"
                >
                  {activeTab === 0 && <BatchListFragment onAdd={() => setCurrentView('add-batch')} />}
                  {activeTab === 1 && <ShipmentListFragment 
                    onAdd={() => setCurrentView('create-shipment')} 
                    onEdit={(id, state) => {
                      setSelectedShipmentId(id);
                      if (state === ShipmentState.NEW) setCurrentView('allocation');
                      if (state === ShipmentState.ALLOCATED) setCurrentView('inspection');
                    }}
                  />}
                  {activeTab === 2 && <StatisticsFragment />}
                  {activeTab === 3 && <OtherFragment />}
                </motion.div>
              </AnimatePresence>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 flex justify-around items-center shadow-lg z-50">
              <TabButton active={activeTab === 0} onClick={() => setActiveTab(0)} icon={<Package size={20} />} label="批次" />
              <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)} icon={<Truck size={20} />} label="发货" />
              <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)} icon={<BarChart3 size={20} />} label="统计" />
              <TabButton active={activeTab === 3} onClick={() => setActiveTab(3)} icon={<Settings size={20} />} label="其他" />
            </nav>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen shadow-2xl relative overflow-hidden font-sans">
      {renderView()}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-300",
        active ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      <span className="text-[10px] mt-1 font-medium">{label}</span>
      {active && <motion.div layoutId="tab-indicator" className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
    </button>
  );
}
