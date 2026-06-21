import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CreditCard, 
  Wallet, 
  MoreVertical, 
  ArrowLeft, 
  Camera, 
  QrCode, 
  Check, 
  Trash2, 
  Edit2, 
  Clock, 
  User, 
  AlertCircle,
  PiggyBank,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { dataService, useBankcards, useConsumeRecords } from '../lib/dataService';
import { Bankcard, ConsumeRecord } from '../types';
import { cn, formatDateTimeWithSeconds, formatLocalDatetimeForDB } from '../lib/utils';
import { QRCodeImage } from './QRCodeImage';

export default function AccountingFragment() {
  const bankcards = useBankcards() || [];
  const allRecords = useConsumeRecords() || [];

  const [view, setView] = useState<'list' | 'add-record' | 'records-list'>('list');
  const [selectedCard, setSelectedCard] = useState<Bankcard | null>(null);

  // Modals / Dialogs
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  
  // Card Actions Modal & corresponding detailed modals
  const [showCardActionsModal, setShowCardActionsModal] = useState(false);
  const [activeCardForAction, setActiveCardForAction] = useState<Bankcard | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [showBalanceDoubleConfirm, setShowBalanceDoubleConfirm] = useState(false);
  const [showDeleteCardConfirm, setShowDeleteCardConfirm] = useState(false);

  // Record Actions Modal & corresponding detailed modals
  const [showRecordActionsModal, setShowRecordActionsModal] = useState(false);
  const [activeRecordForAction, setActiveRecordForAction] = useState<ConsumeRecord | null>(null);
  const [showEditMemoModal, setShowEditMemoModal] = useState(false);
  const [newMemoInput, setNewMemoInput] = useState('');
  const [zoomedQrVal, setZoomedQrVal] = useState<string | null>(null);
  const [showEditTimeModal, setShowEditTimeModal] = useState(false);
  const [newTimeInput, setNewTimeInput] = useState('');

  // Add Card State
  const [addCardType, setAddCardType] = useState<'card' | 'cash'>('card');
  const [addBcbaname, setAddBcbaname] = useState('');
  const [addBcno, setAddBcno] = useState('');
  const [addInitialBalance, setAddInitialBalance] = useState('');
  const [addCardError, setAddCardError] = useState('');

  // Add Consume Record State
  const [consumeAmount, setConsumeAmount] = useState('');
  const [consumeMemo, setConsumeMemo] = useState('');
  const [consumeTime, setConsumeTime] = useState('');
  const [scannedQrVal, setScannedQrVal] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Retrieve current operator
  const currentUserStr = localStorage.getItem('auth_user');
  const currentOperator = currentUserStr ? JSON.parse(currentUserStr).spellname : 'system';

  // Format helper for currency (som)
  const formatSom = (num: number) => {
    return `${num.toLocaleString('en-US')} som`;
  };

  // Safe scanner stop
  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Handle QR scanning activation
  const handleStartScan = async () => {
    setScanError('');
    setIsScanning(true);
    setScannedQrVal('');

    // Wait a brief tick for the container div "#qr-reader" to mount in DOM
    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode('qr-reader');
        scannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            setScannedQrVal(decodedText);
            // Auto finish scanning when code is found
            qrScanner.stop()
              .then(() => { setIsScanning(false); })
              .catch(e => console.error('Error stopping: ', e));
          },
          () => {
            // silent diagnostic feedback
          }
        );
      } catch (err: any) {
        console.error('Failed to start camera', err);
        setScanError('无法打开摄像头，请确保已授予相机权限 (Camera permission required)');
        setIsScanning(false);
      }
    }, 300);
  };

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCardError('');

    if (!addBcbaname.trim()) {
      setAddCardError('请输入名字 / Please enter a name');
      return;
    }

    if (addCardType === 'card' && !addBcno.trim()) {
      setAddCardError('请输入银行卡号 / Please enter bank card number');
      return;
    }

    const numericBalance = Number(addInitialBalance) || 0;
    const finalBcno = addCardType === 'cash' ? '0' : addBcno.trim();

    try {
      await dataService.addBankcard({
        bcbaname: addBcbaname.trim(),
        bcno: finalBcno,
        bcbalance: numericBalance,
        bcdeleted: 0
      });

      // Clear input state
      setAddBcbaname('');
      setAddBcno('');
      setAddInitialBalance('');
      setShowAddCardModal(false);
    } catch (err) {
      console.error(err);
      setAddCardError('保存失败，请重试');
    }
  };

  const handleAddConsumeRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    const amountNum = parseFloat(consumeAmount);
    if (isNaN(amountNum)) {
      alert('请输入合法的金额数字 / Please enter a valid number');
      return;
    }
    if (amountNum < 0) {
      alert('消费金额不可为负数 / Amount cannot be negative');
      return;
    }

    let finalCrTime: string | undefined = undefined;
    if (consumeTime) {
      const parsedDate = new Date(consumeTime);
      if (!isNaN(parsedDate.getTime())) {
        finalCrTime = formatLocalDatetimeForDB(parsedDate);
      }
    }

    try {
      // 1. Add Consume Record
      await dataService.addConsumeRecord({
        crbcid: selectedCard.bcid!,
        croper: currentOperator,
        cramount: amountNum,
        crmemo: consumeMemo.trim() || '无备注 (No Mem)',
        crqrcode: scannedQrVal || '',
        crscaned: 0,
        crtime: finalCrTime
      });

      // 2. Adjust Balance: Deduct amount from current cardamom balance (Current balance - amountNum)
      const adjustedBalance = selectedCard.bcbalance - amountNum;
      await dataService.updateBankcard(selectedCard.bcid!, {
        bcbalance: adjustedBalance
      });

      // Reset record states
      setConsumeAmount('');
      setConsumeMemo('');
      setConsumeTime('');
      setScannedQrVal('');
      setView('list');
      setSelectedCard(null);
    } catch (err) {
      console.error(err);
      alert('新增流水失败，请联系管理员');
    }
  };

  // Modify Card Balance Dialog triggers
  const handleSaveBalanceModify = async () => {
    if (!activeCardForAction) return;
    const val = parseFloat(newBalanceInput);
    if (isNaN(val)) {
      alert('请输入有效的金额数字 / Valid amount required');
      return;
    }
    setShowBalanceDoubleConfirm(true);
  };

  const handleConfirmBalanceModify = async () => {
    if (!activeCardForAction) return;
    const val = parseFloat(newBalanceInput);
    try {
      await dataService.updateBankcard(activeCardForAction.bcid!, {
        bcbalance: val
      });
      setShowBalanceDoubleConfirm(false);
      setShowBalanceModal(false);
      setShowCardActionsModal(false);
      setNewBalanceInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Card Trigger
  const handleConfirmDeleteCard = async () => {
    if (!activeCardForAction) return;
    try {
      await dataService.deleteBankcard(activeCardForAction.bcid!);
      setShowDeleteCardConfirm(false);
      setShowCardActionsModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Consume Record Memo Trigger
  const handleSaveMemoEdit = async () => {
    if (!activeRecordForAction) return;
    try {
      await dataService.updateConsumeRecord(activeRecordForAction.crid!, {
        crmemo: newMemoInput.trim()
      });
      setShowEditMemoModal(false);
      setShowRecordActionsModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // accountant scan / audit record trigger
  const handleAccountantReviewRecord = async (record: ConsumeRecord) => {
    try {
      await dataService.updateConsumeRecord(record.crid!, {
        crscaned: 1
      });
      setShowRecordActionsModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to convert date strings to YYYY-MM-DDTHH:mm for datetime-local value
  const convertToDatetimeLocal = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to convert Date object directly to YYYY-MM-DDTHH:mm
  const dateToDatetimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSaveTimeModify = async () => {
    if (!activeRecordForAction) return;
    if (!newTimeInput) {
      alert('请选择有效的日期和时间');
      return;
    }
    const date = new Date(newTimeInput);
    if (isNaN(date.getTime())) {
      alert('请输入有效的日期时间');
      return;
    }

    // Format as YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = '00';
    const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    try {
      await dataService.updateConsumeRecord(activeRecordForAction.crid!, {
        crtime: formattedTime
      });
      setShowEditTimeModal(false);
      setShowRecordActionsModal(false);
    } catch (err) {
      console.error(err);
      alert('修改时间失败');
    }
  };

  // Filter out records related only to selectedCard and sort them by crtime desc (and/or crid desc as fallback)
  const activeRecords = selectedCard
    ? [...allRecords]
        .filter(r => r.crbcid === selectedCard.bcid)
        .sort((a, b) => {
          const timeA = a.crtime ? new Date(a.crtime.replace(' ', 'T')).getTime() : 0;
          const timeB = b.crtime ? new Date(b.crtime.replace(' ', 'T')).getTime() : 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }
          return (b.crid || 0) - (a.crid || 0);
        })
    : [];

  return (
    <div className="space-y-4">
      {/* 1. BANK CARDS & CASH LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">记账模块 / Accounting</h2>
              <p className="text-[10px] text-slate-400">资金与银行账户收支记账 / Card & Cash management</p>
            </div>
            <button
              id="add-bankcard-btn"
              onClick={() => setShowAddCardModal(true)}
              className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shadow-emerald-100"
            >
              <Plus size={20} />
            </button>
          </div>

          {bankcards.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-100 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <PiggyBank size={24} />
              </div>
              <div className="text-xs text-slate-400">暂无账户或零钱现金，请右上角点击添加</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {bankcards.map((bc, idx) => {
                const isCash = bc.bcno === '0';
                return (
                  <div
                    key={bc.bcid !== undefined && bc.bcid !== null ? `bc_${bc.bcid}` : `bc_idx_${idx}`}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all cursor-pointer group flex flex-col gap-3"
                    onClick={() => {
                      setSelectedCard(bc);
                      setView('records-list');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                          isCash ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {isCash ? <Wallet size={20} /> : <CreditCard size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700">{bc.bcbaname}</span>
                            {isCash && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold scale-90 origin-left">
                                现金
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {isCash ? '现金账户 (Cash)' : `卡号: **** **** **** ${bc.bcno.slice(-4) || bc.bcno}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(bc);
                            setView('add-record');
                            setConsumeTime(dateToDatetimeLocal(new Date()));
                          }}
                          className="p-2 hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 rounded-lg shrink-0 transition-colors"
                          title="新增消费 (New Expense)"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCardForAction(bc);
                            setNewBalanceInput(String(bc.bcbalance));
                            setShowCardActionsModal(true);
                          }}
                          className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg shrink-0 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-50 pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">可用余额 (Available Balance)</span>
                      <span className="text-sm font-bold text-emerald-600 font-mono">
                        {formatSom(bc.bcbalance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ADD CONSUME RECORD VIEW */}
      {view === 'add-record' && selectedCard && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              onClick={() => {
                setView('list');
                setSelectedCard(null);
                stopScanner();
              }}
              className="p-2 hover:bg-slate-50 text-slate-500 rounded-xl transition-all flex items-center gap-1 text-slate-600"
            >
              <ArrowLeft size={18} />
              <span className="text-xs font-bold">返回 (Back)</span>
            </button>
            <div className="text-right">
              <span className="text-xs text-slate-400">账户: </span>
              <span className="text-xs font-bold text-slate-700">{selectedCard.bcbaname}</span>
            </div>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-1">
            <div className="text-xs text-slate-400">当前账户余额 Actual Balance</div>
            <div className="text-lg font-bold text-slate-800 font-mono">
              {formatSom(selectedCard.bcbalance)}
            </div>
          </div>

          <form onSubmit={handleAddConsumeRecord} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">消费金额 (Amount) *</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="请输入消费金额 (Som)"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-300 focus:outline-none transition-all"
                  required
                />
                <span className="absolute right-4 top-3 text-xs text-slate-400 font-bold">som</span>
              </div>
              <p className="text-[10px] text-slate-400">注：消费金额不可为负，将自动从账户余额中扣除。</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">消费说明 (Remarks) *</label>
              <input
                type="text"
                maxLength={100}
                placeholder="请输入详细的用途说明"
                value={consumeMemo}
                onChange={(e) => setConsumeMemo(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:border-emerald-300 focus:outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">消费时间 (Time) *</label>
              <input
                type="datetime-local"
                value={consumeTime}
                onChange={(e) => setConsumeTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-300 focus:outline-none transition-all cursor-pointer"
                required
              />
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500">发票二维码 (Receipt QR)</label>
                {!isScanning ? (
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Camera size={14} />
                    扫码录入 / Scan Code
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs cursor-pointer transition-colors"
                  >
                    取消扫描 (Cancel)
                  </button>
                )}
              </div>

              {isScanning && (
                <div className="space-y-2">
                  <div id="qr-reader" className="w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200" />
                  <div className="text-center text-[10px] text-slate-400">对准发票或二维码进行扫描相机读取</div>
                </div>
              )}

              {scanError && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100">
                  {scanError}
                </div>
              )}

              <input
                type="text"
                placeholder="扫码二维码后面的值 (无发票可留空)"
                value={scannedQrVal}
                onChange={(e) => setScannedQrVal(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-300 focus:outline-none transition-all"
              />

              {scannedQrVal && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-emerald-700 text-[11px] font-mono select-all">
                  <QrCode size={14} className="shrink-0" />
                  <span className="truncate">已录入: {scannedQrVal}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  setSelectedCard(null);
                  stopScanner();
                }}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 transition-colors"
              >
                完成添加 (Save)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CONSUME RECORDS HISTORY LIST PAGE */}
      {view === 'records-list' && selectedCard && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              onClick={() => {
                setView('list');
                setSelectedCard(null);
              }}
              className="p-2 hover:bg-slate-50 text-slate-500 rounded-xl transition-all flex items-center gap-1 text-slate-600"
            >
              <ArrowLeft size={18} />
              <span className="text-xs font-bold">返回 (Back)</span>
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{selectedCard.bcbaname}</h3>
              <p className="text-[10px] text-slate-400 text-right">消费流水记录 / Expenses</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-400">总消费笔数</div>
              <div className="text-sm font-bold text-slate-700">{activeRecords.length} 笔</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-400">账户余额</div>
              <div className="text-sm font-bold text-emerald-600 font-mono">{formatSom(selectedCard.bcbalance)}</div>
            </div>
          </div>

          {activeRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              该账户或现金银行暂无消费流水记录
            </div>
          ) : (
            <div className="space-y-3">
              {activeRecords.map((r, idx) => {
                return (
                  <div 
                    key={r.crid !== undefined && r.crid !== null ? `cr_${r.crid}` : `cr_idx_${idx}`} 
                    className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm space-y-2 group transition-all hover:border-emerald-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">#CR{r.crid}</span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                            r.cramount >= 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          )}>
                            {r.cramount >= 0 ? "消费支出" : "退款收入"}
                          </span>
                          {r.crscaned === 1 && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0 border border-emerald-200">
                              已收录
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <User size={10} />
                            {r.croper}
                          </span>
                          {r.crtime && (
                            <span className="flex items-center gap-0.5 font-mono">
                              <Clock size={10} />
                              {formatDateTimeWithSeconds(r.crtime)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right shrink-0">
                          <div className={cn(
                            "text-sm font-extrabold font-mono",
                            r.cramount >= 0 ? "text-slate-800" : "text-emerald-500"
                          )}>
                            {r.cramount >= 0 ? '-' : '+'}{formatSom(Math.abs(r.cramount))}
                          </div>
                        </div>

                        {/* Display scanned QR Code if exists on right side */}
                        {r.crqrcode && (
                          <div 
                            className="w-10 h-10 shrink-0 border border-slate-200 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all active:scale-95 flex items-center justify-center p-0.5 bg-slate-50"
                            onClick={() => setZoomedQrVal(r.crqrcode)}
                            title="点击放大"
                          >
                            <QRCodeImage value={r.crqrcode} className="w-full h-full" />
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setActiveRecordForAction(r);
                            setNewMemoInput(r.crmemo);
                            setShowRecordActionsModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    {r.crmemo && (
                      <div className="text-[11px] text-slate-500 flex items-start gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <ClipboardList size={12} className="shrink-0 mt-0.5 text-slate-400" />
                        <p className="line-clamp-2 md:line-clamp-none">{r.crmemo}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- ALL DIALOGS / MODALS --- */}
      <AnimatePresence>
        {/* ADD CARD MODAL */}
        {showAddCardModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCardModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">添加新账户 / Add Account</h3>
                <button onClick={() => setShowAddCardModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddCardType('card');
                      setAddBcbaname('');
                    }}
                    className={cn(
                      "py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1",
                      addCardType === 'card'
                        ? "bg-slate-800 text-white border-slate-800 shadow"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    )}
                  >
                    <CreditCard size={14} />
                    消费卡 (Card)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCardType('cash');
                      setAddBcbaname('');
                    }}
                    className={cn(
                      "py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1",
                      addCardType === 'cash'
                        ? "bg-slate-800 text-white border-slate-800 shadow"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    )}
                  >
                    <Wallet size={14} />
                    现金 (Cash)
                  </button>
                </div>

                <form onSubmit={handleAddCardSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold">
                      {addCardType === 'cash' ? '现金账户名称 (Name) *' : '银行名称 (Bank Name) *'}
                    </label>
                    <input
                      type="text"
                      placeholder={addCardType === 'cash' ? '如：保险箱大额现金/备用零卡' : '如：SQB 银行/Kapital Bank'}
                      value={addBcbaname}
                      onChange={(e) => setAddBcbaname(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
                      required
                    />
                  </div>

                  {addCardType === 'card' && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-bold">银行卡号 (Card No.) *</label>
                      <input
                        type="text"
                        placeholder="请输入完整卡号"
                        value={addBcno}
                        onChange={(e) => setAddBcno(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-300"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold">初始余额 (Initial Balance - Som)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="开卡起始余额"
                      value={addInitialBalance}
                      onChange={(e) => setAddInitialBalance(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-300"
                    />
                  </div>

                  {addCardError && (
                    <div className="text-[10px] text-rose-500 font-bold p-2 bg-rose-50 rounded-lg">
                      {addCardError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCardModal(false)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow shadow-emerald-100 animate-pulse"
                    >
                      确定添加
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* CARD OPTIONS MENU (POPUP) */}
        {showCardActionsModal && activeCardForAction && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowCardActionsModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800">{activeCardForAction.bcbaname}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {activeCardForAction.bcno === '0' ? '现金账户' : `卡号: ${activeCardForAction.bcno}`}
                  </p>
                </div>
                <button onClick={() => setShowCardActionsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBalanceModal(true);
                  }}
                  className="w-full p-4 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Edit2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">余额修改 (Update Balance)</div>
                    <div className="text-[9px] text-slate-400">临时性调整当前账户储备金额</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteCardConfirm(true);
                  }}
                  className="w-full p-4 hover:bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-rose-100/50 text-rose-600 rounded-lg flex items-center justify-center">
                    <Trash2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-700">删除 (Delete Account)</div>
                    <div className="text-[9px] text-rose-400">逻辑删除此现金卡包并不保留</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODIFY BALANCE INPUT DIALOG */}
        {showBalanceModal && activeCardForAction && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowBalanceModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xs p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-center space-y-4"
            >
              <h4 className="font-bold text-slate-800">修改余额 (Edit Balance)</h4>
              <p className="text-[11px] text-slate-400">{activeCardForAction.bcbaname} 银行现金</p>
              
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="当前账户余额 UZS"
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full px-4 py-3 text-center bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono font-bold focus:outline-none"
                />
                <span className="absolute right-4 top-3 text-[10px] text-slate-400">som</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveBalanceModify}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  确认修改
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* DOUBLE CONFIRM MODIFY BALANCE DIALOG */}
        {showBalanceDoubleConfirm && activeCardForAction && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xs p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-center space-y-4"
            >
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              <h4 className="font-bold text-slate-800">确认要修改余额吗？</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                您正将账户 <span className="font-bold text-slate-800">[{activeCardForAction.bcbaname}]</span> 余额修改为:
                <span className="block font-mono font-bold text-emerald-600 text-sm mt-1">
                  {formatSom(Number(newBalanceInput) || 0)}
                </span>
                请仔细核对，以免引发账目混乱。
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBalanceDoubleConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  我再想想
                </button>
                <button
                  onClick={handleConfirmBalanceModify}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  确认正确
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* DELETE CARD CONFIRM DIALOG */}
        {showDeleteCardConfirm && activeCardForAction && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteCardConfirm(false)}
              className="absolute inset-0 bg-slate-900/60" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xs p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <h4 className="font-bold text-slate-800">确定要删除此卡/现金包吗？</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                您将删除 <span className="font-bold text-slate-700">[{activeCardForAction.bcbaname}]</span>，此操作代表其不再加入记账类别并进行逻辑删除。
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteCardConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDeleteCard}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  确定删除
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CONSUME RECORD OPTIONS POPUP */}
        {showRecordActionsModal && activeRecordForAction && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowRecordActionsModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800">记账记录操作 / Action</h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[250px]">{activeRecordForAction.crmemo}</p>
                </div>
                <button onClick={() => setShowRecordActionsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {/* 1. MODIFY MEMO */}
                <button
                  type="button"
                  onClick={() => {
                    setNewMemoInput(activeRecordForAction.crmemo);
                    setShowEditMemoModal(true);
                  }}
                  className="w-full p-4 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center">
                    <Edit2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">修改备注 (Edit Memo)</div>
                    <div className="text-[9px] text-slate-400">校正该笔消费说明文字用途</div>
                  </div>
                </button>

                {/* 2. MODIFY TIME */}
                <button
                  type="button"
                  onClick={() => {
                    const localDt = convertToDatetimeLocal(activeRecordForAction.crtime);
                    setNewTimeInput(localDt);
                    setShowEditTimeModal(true);
                  }}
                  className="w-full p-4 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">修改时间 (Edit Time)</div>
                    <div className="text-[9px] text-slate-400">调整该笔记账生成的时间戳</div>
                  </div>
                </button>

                {/* 3. ACCOUNTANT SCAN (CRSCANED) - SHOW ONLY IF NOT SCANNED */}
                {activeRecordForAction.crscaned === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleAccountantReviewRecord(activeRecordForAction)}
                    className="w-full p-4 hover:bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Check size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-700">业务收录 (Filing Accountant)</div>
                      <div className="text-[9px] text-slate-400">确认该笔流水无误并核对收录</div>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-xl text-center text-[10px]">
                    该流水已由财务专员确认收录
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* MODIFY MEMO TEXT DIALOG */}
        {showEditMemoModal && activeRecordForAction && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowEditMemoModal(false)}
              className="absolute inset-0 bg-slate-900/60" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xs p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-center space-y-4"
            >
              <h4 className="font-bold text-slate-800">修改消费备注</h4>
              
              <input
                type="text"
                maxLength={100}
                placeholder="请输入说明用途"
                value={newMemoInput}
                onChange={(e) => setNewMemoInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditMemoModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveMemoEdit}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-[11px] font-bold cursor-pointer"
                >
                  确认修改
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODIFY TIME DIALOG */}
        {showEditTimeModal && activeRecordForAction && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowEditTimeModal(false)}
              className="absolute inset-0 bg-slate-900/60" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xs p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-center space-y-4"
            >
              <h4 className="font-bold text-slate-800">修改消费记账时间</h4>
              <p className="text-[10px] text-slate-400">请选择新的记账记录时间：</p>
              
              <input
                type="datetime-local"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none font-mono text-center cursor-pointer"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditTimeModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimeModify}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                >
                  确认修改
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ZOOMED QR CODE MODAL */}
        {zoomedQrVal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setZoomedQrVal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-center space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <QrCode size={14} className="text-emerald-500" />
                  发票二维码放大 / Receipt QR Code
                </span>
                <button onClick={() => setZoomedQrVal(null)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl">
                <QRCodeImage value={zoomedQrVal} className="w-2/3 h-auto max-w-[240px] border border-slate-100 rounded-xl" />
              </div>

              <button
                onClick={() => setZoomedQrVal(null)}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs"
              >
                关闭 (Close)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
