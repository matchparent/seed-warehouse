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
  'nav.orders': { zh: '订单', uz: 'Buyurtmalar', en: 'Orders' },
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
  'batch.filter': { zh: '筛选', uz: 'Saralash', en: 'Filter' },
  'batch.sort': { zh: '排序', uz: 'Tartib', en: 'Sort' },
  'batch.filter.all': { zh: '全部批次', uz: 'Hammasi', en: 'All' },
  'batch.filter.remaining': { zh: '有剩余批次', uz: 'Bor', en: 'With Remaining' },
  'batch.filter.no_remaining': { zh: '无剩余批次', uz: 'Yo\'q', en: 'No Remaining' },
  'batch.filter.approved': { zh: '审批通过批次', uz: 'Ruxsat', en: 'Approved' },
  'batch.filter.rejected': { zh: '审批未通过批次', uz: 'Taqiq', en: 'Rejected' },
  'batch.sort.date_asc': { zh: '日期 (由旧到新)', uz: 'Sana (eski→yangi)', en: 'Date (Old to New)' },
  'batch.sort.date_desc': { zh: '日期 (由新到旧)', uz: 'Sana (yangi→eski)', en: 'Date (New to Old)' },
  'batch.sort.name_asc': { zh: '名称 (A-Z)', uz: 'Nomi (A-Z)', en: 'Name (A-Z)' },
  'batch.sort.name_desc': { zh: '名称 (Z-A)', uz: 'Nomi (Z-A)', en: 'Name (Z-A)' },
  'batch.sort.remaining_asc': { zh: '剩余 (从少到多)', uz: 'Qoldiq (kam→ko\'p)', en: 'Remaining (Low to High)' },
  'batch.sort.remaining_desc': { zh: '剩余 (从多到少)', uz: 'Qoldiq (ko\'p→kam)', en: 'Remaining (High to Low)' },
  'batch.sort.status_asc': { zh: '状态 (先通过)', uz: 'Holat (avval ruxsat)', en: 'Status (Approved First)' },
  'batch.sort.status_desc': { zh: '状态 (先不通过)', uz: 'Holat (avval taqiq)', en: 'Status (Rejected First)' },
  'batch.available': { zh: '可发货', uz: 'Ruxsat', en: 'Available' },
  'batch.not_available': { zh: '不可发货', uz: 'Taqiq', en: 'On Hold' },
  'batch.status.transfer': { zh: '转运待收', uz: 'Transfer kutilmoqda', en: 'Pending Transfer' },
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
  'shipment.select_order_hint': { zh: '请先选择订单或转运目的货仓以进行货物配置', uz: 'Ehtiyot qismlarni kiritish uchun oldin buyurtma yoki transfer omborini tanlang', en: 'Please select an order or transfer destination warehouse first to enable cargo configuration' },

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
  'action.delete_order': { zh: '删除订单', uz: 'Buyurtmani o\'chirish', en: 'Delete Order' },
  'action.save': { zh: '保存', uz: 'Saqlash', en: 'Save' },
  'action.add': { zh: '添加', uz: 'Qo\'shish', en: 'Add' },
  'action.back': { zh: '返回', uz: 'Orqaga', en: 'Back' },
  'action.ok': { zh: '确定', uz: 'Ha', en: 'OK' },
  'action.no': { zh: '取消', uz: 'Yo\'q', en: 'No' },
  'action.next_step': { zh: '下一步', uz: 'Keyingi qadam', en: 'Next Step' },
  'action.upload_contract': { zh: '上传合同', uz: 'Shartnomani yuklash', en: 'Upload Contract' },
  'order.confirm_payment': { zh: '确认收款', uz: 'To\'lovni tasdiqlash', en: 'Confirm Payment' },
  'order.payment_type': { zh: '收款类型', uz: 'To\'lov turi', en: 'Payment Type' },
  'order.payment_deposit': { zh: '收定金', uz: 'Zakalat', en: 'Deposit' },
  'order.payment_full': { zh: '收全款', uz: 'To\'liq to\'lov', en: 'Full Payment' },
  'order.received_deposit': { zh: '实收定金', uz: 'Zakalat miqdori', en: 'Deposit Received' },
  'order.received_balance': { zh: '实收尾款', uz: 'Qolgan to\'lov', en: 'Balance Received' },
  'order.confirm_balance_payment': { zh: '确认收取尾款', uz: 'Qolgan to\'lovni tasdiqlash', en: 'Confirm Balance Payment' },
  'order.payment_difference': { zh: '待付差额', uz: 'Qolgan farq', en: 'Remaining Difference' },

  'status.intentional': { zh: '有意愿', uz: 'Niyatli', en: 'Intentional' },
  'status.signed': { zh: '已签约', uz: 'Shartnoma imzolanadi', en: 'Signed' },
  'status.deposit_paid': { zh: '已付定金', uz: 'Zakalat to\'langan', en: 'Deposit Paid' },
  'status.full_paid': { zh: '已付全款', uz: 'To\'liq to\'langan', en: 'Full Paid' },
  'status.completed': { zh: '已完成', uz: 'Yakunlangan', en: 'Completed' },
  'status.deleted': { zh: '已删除', uz: 'O\'chirilgan', en: 'Deleted' },
  'status.refunded': { zh: '已退款', uz: 'Qaytarilgan', en: 'Refunded' },
  'action.download_contract': { zh: '下载合同', uz: 'Shartnomani yuklab olish', en: 'Download Contract' },
  'action.edit_base_info': { zh: '编辑基本信息', uz: 'Asosiy ma\'lumotlarni tahrirlash', en: 'Edit Base Info' },
  'action.edit_info': { zh: '编辑信息', uz: 'Ma\'lumotlarni tahrirlash', en: 'Edit Info' },
  'action.delete_contract': { zh: '删除合同', uz: 'Shartnomani o\'chirish', en: 'Delete Contract' },
  'action.update_contract': { zh: '上传/修改合同', uz: 'Shartnomani yuklash/yangilash', en: 'Upload/Update Contract' },

  'order.title': { zh: '选择订单', uz: 'Buyurtmani tanlash', en: 'Select Order' },
  'order.add': { zh: '新增订单', uz: 'Yangi buyurtma', en: 'New Order' },
  'order.dest': { zh: '目的地', uz: 'Manzil', en: 'Destination' },
  'order.custom_type': { zh: '客户类型', uz: 'Mijoz turi', en: 'Client Type' },
  'order.contact_name': { zh: '主体名称', uz: 'Sub\'yekt nomi', en: 'Subject Name' },
  'order.contact_name_hint': { zh: '主体机构名称或姓名', uz: 'Sub\'yekt tashkilot nomi yoki ism', en: 'Subject Organization/Name' },
  'order.contact_phone': { zh: '联系方式', uz: 'Aloqa usuli', en: 'Contact Method' },
  'order.contact_phone_hint': { zh: '客户主体的电话号码', uz: 'Mijoz sub\'yektining telefon raqami', en: 'Subject Phone Number' },
  'order.receivables': { zh: '应收货款', uz: 'To\'lanishi kerak', en: 'Receivables' },
  'order.receivables_hint': { zh: '总应收货款额', uz: 'Umumiy to\'lov summasi', en: 'Total Receivables Amount' },
  'order.received': { zh: '实收货款', uz: 'To\'langan summa', en: 'Received' },
  'order.variety_qty': { zh: '品种需求 (品种/吨)', uz: 'Turlar ehtiyoji (tur/tonna)', en: 'Variety Needs' },
  'order.variety_name': { zh: '品种名', uz: 'Nav nomi', en: 'Variety Name' },
  'order.variety_weight': { zh: '重量(t)', uz: 'Vazn (t)', en: 'Weight (t)' },
  'order.memo': { zh: '备注', uz: 'Izoh', en: 'Memo' },
  'order.contract_uploaded': { zh: '合同已上传', uz: 'Shartnoma yuklangan', en: 'Contract Uploaded' },
  'order.contract_not_uploaded': { zh: '合同未上传', uz: 'Shartnoma yuklanmagan', en: 'Contract Not Uploaded' },
  'order.contract_id': { zh: '合同编号', uz: 'Shartnoma raqami', en: 'Contract ID' },
  'order.contract_file': { zh: '合同文件', uz: 'Shartnoma fayli', en: 'Contract File' },
  'order.delivery_progress': { zh: '交付进度', uz: 'Yetkazib berish jarayoni', en: 'Delivery Progress' },
  'order.has_contract': { zh: '合同', uz: 'Shartnoma', en: 'Contract' },
  'order.confirmed': { zh: '已确认', uz: 'Tasdiqlangan', en: 'Confirmed' },
  'order.not_uploaded': { zh: '未上传', uz: 'Yuklanmagan', en: 'Not Uploaded' },
  'order.uploaded': { zh: '已上传', uz: 'Yuklangan', en: 'Uploaded' },
  
  'confirm.delete_order': { zh: '确定要删除此订单吗？', uz: 'Ushbu buyurtmani o\'chirib tashlamoqchimisiz?', en: 'Are you sure to delete this order?' },
  'confirm.delete_contract': { zh: '确定要删除此订单的合同吗？', uz: 'Ushbu shartnomani o\'chirib tashlamoqchimisiz?', en: 'Are you sure to delete this contract?' },
  'confirm.download_contract': { zh: '确定要下载此合同吗？', uz: 'Shartnomani yuklab olmoqchimisiz?', en: 'Do you want to download this contract?' },
  
  'currency.uzs': { zh: '乌兹别克 som', uz: 'UZS', en: 'UZS' },
  'currency.usd': { zh: '美元', uz: 'USD', en: 'USD' },
  'currency.cny': { zh: '人民币', uz: 'CNY', en: 'CNY' },
  
  'error.qty_invalid': { zh: '修改后的需求量不能小于已发货量', uz: 'Tuzatilgan miqdor yetkazib berilgan miqdordan kam bo\'lishi mumkin emas', en: 'New quantity cannot be less than sent quantity' },
  'error.revoke_shipment': { zh: '请先撤销相关发货后再删除订单', uz: 'Buyurtmani o\'chirishdan oldin yuklashni bekor qiling', en: 'Please revoke related shipments before deleting the order' },

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
  'form.select_order': { zh: '选择分属订单', uz: 'Buyurtmani tanlang', en: 'Select Order' },
  'form.select_custom_type': { zh: '选择客户类型', uz: 'Mijoz turini tanlang', en: 'Select Client Type' },
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
  'confirm.withdraw_shipment_desc': { zh: '撤回后，以下批次的剩余重量将恢复：', uz: 'Quyidagi partiyalarning vazni tiklanadi:', en: 'Following batch weights will be restored:' },
  'batch.supplement': { zh: '库存补充', uz: 'Zaxirani to\'ldirish', en: 'Stock Supplement' },
  'batch.deduction': { zh: '损耗/赠予', uz: 'Yo\'qotish/Hadya', en: 'Loss/Gift' },
  'batch.supplement.title': { zh: '库存补充', uz: 'Zaxirani to\'ldirish', en: 'Supplement Stock' },
  'batch.deduction.title': { zh: '损耗/赠予', uz: 'Zarar / Hadyalar', en: 'Loss / Gift Deduction' },
  'batch.modify_volume': { zh: '修改量 (t)', uz: 'O\'zgartirish miqdori (t)', en: 'Modify Weight (t)' },
  'shipment.splate_label': { zh: '车牌号：', uz: 'Mashina raqami: ', en: 'Plate Number: ' },
  'shipment.transfer_to': { zh: '转运至', uz: 'Yuborish: ', en: 'Transfer to' },
  'shipment.destination': { zh: '目的地', uz: 'Manzil', en: 'Destination' },
  'shipment.order_subject': { zh: '订单主体', uz: 'Buyurtmachi', en: 'Order Subject' }
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
