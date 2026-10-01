export interface Settings {
  id: number;
  email: string;
  adabraka_phone: string;
  dzorwulu_phone: string;
  facebook_link: string;
  tiktok_link: string;
  opening_hours: string;
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
  customer_name: string;
  phone: string;
  food_item: string;
  quantity: number;
  outlet: string;
  order_type: string;
  address: string | null;
  order_details: string | null;
  total: number;
  status: string;
  order_date: string;
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
  pending_orders: number;
  completed_orders: number;
  catering_bookings?: number;
  contact_messages?: number;
  training_applications?: number;
  total_visitors?: number;
}
