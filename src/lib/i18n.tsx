import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'zh' | 'uz' | 'en';

interface Translations {
  [key: string]: {
    zh: string;
    uz: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  'nav.batches': { zh: '批次', uz: 'Partiya', en: 'Batches' },
  'nav.shipments': { zh: '发货', uz: 'Yuklash', en: 'Shipments' },
  'nav.stats': { zh: '统计', uz: 'Statistika', en: 'Stats' },
  'nav.other': { zh: '其他', uz: 'Boshqalar', en: 'Other' },
  'app.title': { zh: '棉种仓储管理', uz: 'Paxta chigiti omborini boshqarish', en: 'Seed Warehouse MS' },

  // Batch List
  'batch.current_stock': { zh: '当前库存批次', uz: 'Mavjud partiyalar', en: 'Current Stock' },
  'batch.label': { zh: '批次', uz: 'Partiya', en: 'Batch' },
  'batch.initial': { zh: '初始', uz: 'Boshlang\'ich', en: 'Initial' },
  'batch.remaining': { zh: '剩余', uz: 'Qoldiq', en: 'Remaining' },
  'batch.copy_remaining': { zh: '复制批次剩余重量信息', uz: 'Partiya qoldiq vaznini nusxalash', en: 'Copy Remaining Weight' },
  'batch.copied': { zh: '已复制', uz: 'Nusxalandi', en: 'Copied' },
  'batch.history': { zh: '发货历史', uz: 'Yuklash tarixi', en: 'Shipment History' },
  'batch.modify': { zh: '修改', uz: 'Tahrirlash', en: 'Modify' },
  'batch.delete': { zh: '删除', uz: 'O\'chirish', en: 'Delete' },
  'batch.no_records': { zh: '暂无发货记录', uz: 'Yozuvlar yo\'q', en: 'No records' },
  'batch.info': { zh: '批次信息', uz: 'Partiya ma\'lumotlari', en: 'Batch Info' },
  'batch.total_weight': { zh: '总重', uz: 'Umumiy', en: 'Total Weight' },
  'batch.status': { zh: '批次状态', uz: 'Partiya holati', en: 'Batch Status' },
  'batch.available': { zh: '可发货', uz: 'Ruxsat', en: 'Available' },
  'batch.not_available': { zh: '不可发货', uz: 'Taqiq', en: 'On Hold' },
  'batch.memo': { zh: '批次备注', uz: 'Izoh (ixtiyoriy)', en: 'Batch Memo' },
  'batch.max_adj': { zh: '最大可调至', uz: 'Maks', en: 'Max adjustment' },
  'batch.weight_exceeded': { zh: '修改值大于总重', uz: 'Vazndan oshdi!', en: 'Exceeds total weight!' },

  // Shipment List
  'shipment.records': { zh: '发货记录', uz: 'Yuklash yozuvlari', en: 'Shipment Records' },
  'shipment.planned': { zh: '计划装载', uz: 'Reja', en: 'Planned' },
  'shipment.actual': { zh: '实际装载', uz: 'Haqiqiy', en: 'Actual' },
  'shipment.withdraw': { zh: '撤回发货', uz: 'Qaytarib olish', en: 'Withdraw' },
  'shipment.delete': { zh: '删除记录', uz: 'O\'chirish', en: 'Delete Record' },
  'shipment.modify': { zh: '修改备注/电话', uz: 'Tahrirlash', en: 'Edit Info' },
  'shipment.no_records': { zh: '暂无发货记录', uz: 'Yuklash yozuvlari yo\'q', en: 'No shipment records' },
  'shipment.status.new': { zh: '新创建', uz: 'Yangi', en: 'New' },
  'shipment.status.allocated': { zh: '已分配', uz: 'Taqsimlangan', en: 'Allocated' },
  'shipment.status.completed': { zh: '已完成', uz: 'Yakunlangan', en: 'Completed' },
  'shipment.status.withdrawn': { zh: '已撤回', uz: 'Qaytarilgan', en: 'Withdrawn' },
  'shipment.status.unknown': { zh: '未知', uz: 'Noma\'lum', en: 'Unknown' },
  'shipment.driver_tel': { zh: '司机电话', uz: 'Tel:', en: 'Driver Tel' },
  'shipment.memo': { zh: '发货备注', uz: 'Izoh (ixtiyoriy)', en: 'Shipment Memo' },

  // Statistics
  'stats.overview': { zh: '品种库存概览', uz: 'Navlar zaxirasi', en: 'Variety Stock Overview' },
  'stats.distribution': { zh: '目的地发货分布', uz: 'Manzillar bo\'yicha', en: 'Destination Distribution' },
  'stats.daily': { zh: '每日发货统计', uz: 'Kunlik statistika', en: 'Daily Statistics' },
  'stats.date': { zh: '日期', uz: 'Sana', en: 'Date' },
  'stats.total': { zh: '总计', uz: 'Jami', en: 'Total' },
  'stats.remaining': { zh: '剩余', uz: 'Qoldiq', en: 'Remaining' },
  'stats.before': { zh: '前', uz: 'Oldin', en: 'Before' },
  'stats.after': { zh: '后', uz: 'Keyin', en: 'After' },

  // Actions/Modals
  'action.confirm': { zh: '确认', uz: 'Tasdiqlash', en: 'Confirm' },
  'action.cancel': { zh: '取消', uz: 'Bekor qilish', en: 'Cancel' },
  'action.delete': { zh: '确认删除', uz: 'O\'chirishni tasdiqlash', en: 'Confirm Delete' },
  'action.save': { zh: '保存', uz: 'Saqlash', en: 'Save' },
  'action.add': { zh: '添加', uz: 'Qo\'shish', en: 'Add' },
  'action.back': { zh: '返回', uz: 'Orqaga', en: 'Back' },
  'action.ok': { zh: '确定', uz: 'Ha', en: 'OK' },
  'action.no': { zh: '取消', uz: 'Yo\'q', en: 'No' },

  // Pages
  'page.add_batch': { zh: '添加新批次', uz: 'Yangi partiya qo\'shish', en: 'Add New Batch' },
  'page.create_shipment': { zh: '创建出货单', uz: 'Yuk xati yaratish', en: 'Create Shipment' },
  'page.allocation': { zh: '货物配置', uz: 'Tovarlarni taqsimlash', en: 'Allocation' },
  'page.inspection': { zh: '发货检查', uz: 'Yuklash nazorati', en: 'Shipment Inspection' },

  // Form Labels
  'form.batch_name': { zh: '批次名称', uz: 'Nomi', en: 'Batch Name' },
  'form.variety': { zh: '对应品种', uz: 'Nav', en: 'Variety' },
  'form.select_variety': { zh: '选择品种', uz: 'Navni tanlang', en: 'Select Variety' },
  'form.date': { zh: '日期', uz: 'Sana', en: 'Date' },
  'form.total_weight_t': { zh: '批次总重 (吨)', uz: 'Umumiy vazn (t)', en: 'Total Weight (t)' },
  'form.plate': { zh: '车牌号', uz: 'Mashina raqami', en: 'License Plate' },
  'form.destination': { zh: '目的地', uz: 'Manzil', en: 'Destination' },
  'form.select_destination': { zh: '选择目的地', uz: 'Manzilni tanlang', en: 'Select Destination' },
  'form.placeholder.plate': { zh: '输入车牌号', uz: 'Kiriting...', en: 'Enter plate' },
  'form.placeholder.memo': { zh: '输入备注信息', uz: 'Izoh kiriting...', en: 'Enter memo' },
  'form.batches_available': { zh: '可用批次 (点击配置)', uz: 'Mavjud partiyalar (Tanlash uchun bosing)', en: 'Available Batches (Click to alloc)' },

  // Other
  'other.export_sql': { zh: '数据库信息导出', uz: 'SQL eksport', en: 'Export SQL' },
  'other.export_sql_desc': { zh: '生成 .sql 文件', uz: '.sql faylini yaratish', en: 'Generate .sql file' },
  'other.export_excel': { zh: '出货信息 Excel 导出', uz: 'Excel eksport', en: 'Export Excel' },
  'other.export_excel_desc': { zh: 'Excel hisoboti (.xlsx)', uz: 'Excel hisoboti (.xlsx)', en: 'Excel report (.xlsx)' },
  'other.logout': { zh: '退出当前授权', uz: 'Chiqish', en: 'Logout' },
  'other.language': { zh: '中/乌/英 - 语言设置', uz: 'Tilni almashtirish', en: 'Language Settings' },

  // Login
  'login.title': { zh: '系统授权登录', uz: 'Tizimga kirish', en: 'System Login' },
  'login.desc': { zh: '请上传您的 JSON 授权文件以进入系统', uz: 'JSON ruxsatnoma faylini yuklang', en: 'Upload JSON auth file to enter' },
  'login.drop_hint': { zh: '点击或拖拽至此', uz: 'Tanlang yoki tashlang', en: 'Click or drag here' },
  'login.json_only': { zh: '仅支持 .json', uz: 'Faqat .json', en: '.json only' },
  'login.error.format': { zh: '无效的授权文件格式', uz: 'Fayl formati xato', en: 'Invalid format' },
  'login.error.match': { zh: '授权信息匹配失败，请使用有效的授权文件', uz: 'Ruxsatnoma mos kelmadi', en: 'Auth mismatch' },
  'login.error.read': { zh: '文件读取失败', uz: 'Faylni o\'qishda xato', en: 'Read error' },

  // Allocation/Inspection Specific
  'alloc.progress': { zh: '分配进度', uz: 'Jarayon', en: 'Allocation Progress' },
  'alloc.available_batches': { zh: '可用批次 (点击配置)', uz: 'Mavjud partiyalar', en: 'Available Batches' },
  'alloc.selected': { zh: '已选', uz: 'Tanlangan', en: 'Selected' },
  'alloc.hint': { zh: '所有品种已配置重量与计划重量吻合时才可完成。', uz: 'Rejalashtirilgan va taqsimlangan vazn mos kelishi shart.', en: 'Weights must match planned values.' },
  'inspect.deduct': { zh: '装载', uz: 'Yuklash', en: 'Deduct' },
  'inspect.before': { zh: '前', uz: 'Oldin', en: 'Before' },
  'inspect.after': { zh: '后', uz: 'Keyin', en: 'After' },
  'inspect.hint': { zh: '请仔细核对以上信息。点击“完成发货”后，系统将正式扣除库存重量。', uz: 'Ma\'lumotlarni tekshiring. "Yakunlash" bosilgach, zaxira vazni kamaytiriladi.', en: 'Verify information. Inventory will be updated upon completion.' },
  
  // Confirmation texts
  'confirm.shipment_allocation_desc': { zh: '只有当所有品种的已配置重量与计划重量完全吻合时，才可完成分配。', uz: 'Rejalashtirilgan va taqsimlangan vazn mos kelishi shart.', en: 'Weights must match planned values.' },
  'confirm.shipment_complete_desc': { zh: '请仔细核对以上信息。点击“完成发货”后，系统将正式扣除库存重量。', uz: 'Ma\'lumotlarni tekshiring. "Yakunlash" bosilgach, zaxira vazni kamaytiriladi.', en: 'Verify information. Inventory will be updated.' },
  'confirm.exceed_weight': { zh: '超出批次剩余重量', uz: 'Miqdor ko\'p!', en: 'Exceeds weight!' },
  'confirm.inspect_weight': { zh: '批次重量变动检查', uz: 'Vazn o\'zgarishini tekshirish', en: 'Inspect weight changes' },
  'confirm.export_sql': { zh: '确定要导出数据库备份 .sql 文件吗？', uz: 'Ma\'lumotlar bazasini (.sql) eksport qilishni tasdiqlaysizmi?', en: 'Are you sure you want to export the database .sql file?' },
  'confirm.export_excel': { zh: '确定要导出已完成的出货信息 Excel 报表吗？', uz: 'Yuklash hisobotini (.xlsx) eksport qilishni tasdiqlaysizmi?', en: 'Are you sure you want to export the completed shipments Excel report?' },
  'confirm.delete_batch': { zh: '确定要删除这个批次吗？此操作不可撤销。', uz: 'O\'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo\'lmaydi.', en: 'Are you sure you want to delete this batch? This cannot be undone.' },
  'confirm.delete_shipment': { zh: '确定要删除这条发货记录吗？', uz: 'Ushbu yuklash yozuvini o\'chirishni tasdiqlaysizmi?', en: 'Are you sure you want to delete this shipment record?' },
  'confirm.withdraw_shipment_desc': { zh: '撤回后，以下批次的剩余重量将恢复：', uz: 'Quyidagi partiyalarning vazni tiklanadi:', en: 'Following batch weights will be restored:' }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'zh';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['zh'];
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
