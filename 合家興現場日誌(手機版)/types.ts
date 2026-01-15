export enum ProjectStatus {
  PLANNING = '規劃中',
  IN_PROGRESS = '進行中',
  COMPLETED = '已完工',
  ON_HOLD = '暫停'
}

export enum ProjectType {
  CONSTRUCTION = 'construction',
  MAINTENANCE = 'maintenance',
  MODULAR_HOUSE = 'modular_house'
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  WORKER = 'worker',
  ENGINEERING = 'engineering',
  FACTORY = 'factory'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface RolePermission {
  displayName: string;
  allowedViews: string[]; // 存放允許訪問的 View ID 或 Sub-view ID
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  notes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface SitePhoto {
  id: string;
  url: string;
  timestamp: number;
  description: string;
  aiAnalysis?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export enum MaterialStatus {
  PENDING = '待採購',
  ORDERED = '已訂購',
  DELIVERED = '已進場'
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: MaterialStatus;
  notes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface DailyReport {
  id: string;
  date: string;
  weather: 'sunny' | 'cloudy' | 'rainy';
  content: string;
  reporter: string;
  timestamp: number;
  photos?: string[];
  worker?: string;
  assistant?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface ConstructionItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  location: string;
  worker: string;
  assistant: string;
  date: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface ConstructionSignature {
  id: string;
  date: string;
  url: string;
  timestamp: number;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface CompletionItem {
  name: string;
  action: 'install' | 'dismantle' | 'none';
  quantity: string;
  unit: string;
  category: string;
  spec?: string;
  itemNote?: string;
  productionDate?: string; 
  isProduced?: boolean; 
  supplierId?: string;
  isPoCreated?: boolean; 
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface CompletionReport {
  id: string;
  date: string;
  worker: string;
  items: CompletionItem[];
  notes: string;
  signature: string;
  timestamp: number;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface TeamConfig {
  master: string;
  assistant: string;
  carNumber: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface DaySchedule {
  date: string;
  teams: Record<number, { tasks: string[] }>;
}

export interface WeeklySchedule {
  weekStartDate: string;
  teamConfigs?: Record<number, TeamConfig>;
  days: Record<string, DaySchedule>;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export type GlobalTeamConfigs = Record<number, TeamConfig>;

export interface DailyDispatchTask {
  name: string;
  description: string;
}

export interface DailyDispatch {
  date: string;
  teams: Record<number, {
    master: string;
    assistants: string[];
    carNumber: string;
    tasks: DailyDispatchTask[];
  }>;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface FenceMaterialItem {
  id: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  supplierId?: string;
  isPoCreated?: boolean; 
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface FenceMaterialSheet {
  category: string;
  items: FenceMaterialItem[];
}

export interface MaterialFormulaItem {
  id: string;
  name: string;
  formula: string; 
  unit: string;
}

export interface MaterialFormulaConfig {
  id: string;
  keyword: string;
  category: string;
  items: MaterialFormulaItem[];
}

export interface ImportConfig {
  projectKeywords: {
    maintenance: string;
    modular: string;
  };
  recordKeywords: {
    recordTitle: string;
    reportTitle: string;
  };
  completionKeywords: {
    dismantle: string;
  };
  planningKeywords: {
    headerRow: number;
    subCatFence: string;
    subCatModularStruct: string;
    subCatModularReno: string;
    subCatModularOther: string;
    subCatModularDismantle: string;
  };
}

export interface SystemRules {
  productionKeywords: string[];
  subcontractorKeywords: string[];
  modularProductionKeywords: string[];
  modularSubcontractorKeywords: string[];
  materialFormulas: MaterialFormulaConfig[];
  rolePermissions?: Record<UserRole, RolePermission>;
  importConfig?: ImportConfig;
}

export interface StockAlertItem {
  id: string;
  name: string;
  spec: string;
  quantity: string;
  unit: string;
  note: string;
  timestamp: number;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  clientName: string;
  clientContact: string;
  clientPhone: string;
  address: string;
  status: ProjectStatus;
  progress: number;
  appointmentDate: string;
  reportDate: string;
  description: string;
  remarks: string;
  milestones: Milestone[];
  photos: SitePhoto[];
  materials: Material[];
  materialFillingDate?: string;
  materialRequisitioner?: string;
  materialDeliveryDate?: string;
  materialDeliveryLocation?: '廠內' | '現場';
  materialRequisitionId?: string;
  materialReceiver?: string;
  reports: DailyReport[];
  attachments: Attachment[];
  constructionItems: ConstructionItem[];
  constructionSignatures: ConstructionSignature[];
  completionReports: CompletionReport[];
  planningReports: CompletionReport[];
  fenceMaterialSheets?: Record<string, FenceMaterialSheet>; 
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  details: string;
  timestamp: number;
}

export type EmployeeCategory = '做件' | '現場' | '廠內' | '辦公室';

export interface Employee {
  id: string;
  name: string;
  nickname?: string;
  lineId?: string;
  category: EmployeeCategory;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface AttendanceRecord {
  date: string; 
  employeeId: string;
  status: string; 
  remark?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface OvertimeRecord {
  date: string; 
  employeeId: string;
  hours: number;
  remark?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface MonthSummaryRemark {
  month: string; 
  employeeId: string;
  remark: string;
}

export interface ProductEntry {
  name: string;
  spec: string;
  usage: string;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  contact: string;
  companyPhone: string;
  mobilePhone: string;
  lineId?: string;
  productList: ProductEntry[]; 
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface PurchaseOrderItem {
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  notes?: string;
  supplierId: string;
  projectName?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string; 
  projectId: string;
  projectIds?: string[]; 
  projectName: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'sent' | 'completed';
  totalAmount: number;
  requisitioner?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  receiver?: string;
  remarks?: string;
  isOrdered?: boolean; 
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface Tool {
  id: string;
  name: string;
  brand: string;
  model: string;
  status: 'available' | 'in_use' | 'maintenance';
  borrower?: string;
  lastMaintenance?: string;
  notes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface Asset {
  id: string;
  name: string;
  spec: string;
  purchaseDate: string;
  location: string;
  nextInspection?: string;
  owner: string;
  notes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  currentMileage: number;
  nextMaintenanceMileage: number;
  insuranceExpiry: string;
  mainDriver: string;
  notes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}
