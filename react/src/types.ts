export interface Settings {
  id: number;
  email: string;
  adabraka_phone: string;
  dzorwulu_phone: string;
  facebook_link: string;
  tiktok_link: string;
  opening_hours: string;
  delivery_fee?: number;
  free_delivery_over?: number;
  paystack_enabled?: number;
}

export interface Banner {
  id: number;
  banner_text: string;
  created_at: string;
}

export interface Slide {
  id: number;
  image: string;
  created_at: string;
}

export interface Advert {
  id: number;
  banner_image: string;
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  status: string;
  created_at: string;
}

export interface AdVideo {
  id: number;
  video_name: string;
  created_at: string;
}

export interface CommunityMedia {
  id: number;
  media_type: 'image' | 'video' | string;
  file_name: string;
  created_at: string;
}

export interface MenuItem {
  id: number;
  food_name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  status: string;
  discount_percent: number;
  created_at: string;
}

export interface Category {
  id: number;
  category_name: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_code?: string | null;
  customer_name: string;
  phone: string;
  food_item: string;
  quantity: number;
  outlet: string;
  order_type: string;
  address: string | null;
  order_details: string | null;
  subtotal?: number;
  delivery_fee?: number;
  total: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string | null;
  courier_name?: string | null;
  courier_phone?: string | null;
  eta_minutes?: number | null;
  cancel_reason?: string | null;
  order_date: string;
  updated_at?: string | null;
  tracking_token?: string | null;
}

export interface Rating {
  id: number;
  customer_name: string;
  phone: string | null;
  service_type: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface CateringBooking {
  id: number;
  customer_name: string;
  phone: string;
  event_type: string;
  event_date: string;
  guest_count: number;
  message: string | null;
  created_at: string;
}

export interface ContactMessage {
  id: number;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface TrainingApplication {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  training_school: string;
  program: string;
  message: string | null;
  created_at: string;
}

export interface Admin {
  id: number;
  name: string;
  role: string;
}

export interface CartItem {
  id: number;
  food_name: string;
  price: number; // effective price (discount applied)
  image: string;
  quantity: number;
}

export interface DashStats {
  revenue: number;
  paid_revenue?: number;
  pending_orders: number;
  in_progress_orders?: number;
  completed_orders: number;
  today_orders?: number;
  today_revenue?: number;
  catering_bookings?: number;
  contact_messages?: number;
  training_applications?: number;
  customers?: number;
  total_visitors?: number;
  today_visitors?: number;
  today_page_views?: number;
}

/* ================================================================
   Business layer (v2) — accounts, tracking, payments, analytics
================================================================ */

export interface OrderItemLine {
  menu_item_id: number | null;
  food_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderStep {
  key: string;
  label: string;
  description: string;
  done: boolean;
  at: string | null;
}

export interface OrderPayment {
  provider: string;
  reference: string;
  status: string;
  amount: number;
  channel: string | null;
  paid_at: string | null;
}

export interface TrackedOrder {
  id: number;
  order_code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  outlet: string;
  order_type: string;
  address: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  courier_name: string | null;
  courier_phone: string | null;
  eta_minutes: number | null;
  cancel_reason: string | null;
  tracking_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderTrackingPayload {
  order: TrackedOrder;
  items: OrderItemLine[];
  timeline: { status: string; note: string | null; at: string | null }[];
  steps: OrderStep[];
  cancelled: boolean;
  payment: OrderPayment | null;
  support?: { adabraka: string; dzorwulu: string; email: string };
  tracking_token?: string;
}

export interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  label: string;
  address: string;
  landmark: string | null;
  is_default: number;
  created_at: string;
}

export interface AccountOrder extends TrackedOrder {
  items: OrderItemLine[];
  steps: OrderStep[];
  payment: OrderPayment | null;
  cancelled: boolean;
}

export interface StoreConfig {
  currency: string;
  delivery_fee: number;
  free_delivery_over: number;
  paystack_enabled: boolean;
}

export interface PaymentGatewayStatus {
  ok: boolean;
  provider: string;
  enabled: boolean;
  mode: 'live' | 'test' | 'disabled' | 'unknown';
  currency: string;
  public_key: string | null;
  channels: string[];
  configured?: { secret_key: boolean; public_key: boolean; webhook: string };
}

export interface DailyPoint {
  date: string;
  views?: number;
  visitors?: number;
  orders?: number;
  revenue?: number;
}

export interface AnalyticsSummary {
  range: string;
  from: string | null;
  generated_at: string;
  sales: {
    orders: number;
    completed: number;
    cancelled: number;
    pending: number;
    in_progress: number;
    revenue: number;
    paid_revenue: number;
    unpaid_value: number;
    average_order_value: number;
    items_sold: number;
    channel_split: { paystack: number; cash: number };
  };
  traffic: {
    visits: number;
    unique_visitors: number;
    page_views: number;
    today_views: number;
    top_pages: { path: string; views: number }[];
    sources: { source: string; visits: number }[];
    devices: { device: string; visits: number }[];
    daily: DailyPoint[];
  };
  customers: {
    total: number;
    new_in_range: number;
    repeat: number;
    top: { name: string; phone: string; orders: number; spent: number }[];
  };
  menu: { name: string; quantity: number; revenue: number }[];
  payments: { status: string; count: number; amount: number }[];
  daily_sales: DailyPoint[];
  conversion: { rate: number; note: string };
}

export interface AuditEntry {
  id: number;
  actor_type: string;
  actor_id: number | null;
  actor_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminCustomer {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  marketing_opt_in: number;
  created_at: string;
  last_login_at: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}

export interface PaymentRecord {
  id: number;
  order_id: number | null;
  order_code: string | null;
  provider: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}
