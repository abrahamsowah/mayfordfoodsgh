import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerProvider } from './context/CustomerContext';
import { SiteLayout } from './components/SiteLayout';
import { AdminLayout, RequireAdmin } from './components/AdminLayout';
import HomePage from './pages/HomePage';
import OutletsPage from './pages/OutletsPage';
import AboutPage from './pages/AboutPage';
import MenuAccessPage from './pages/MenuAccessPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderPage from './pages/OrderPage';
import TrackPage from './pages/TrackPage';
import CateringPage from './pages/CateringPage';
import CommunityPage from './pages/CommunityPage';
import ContactPage from './pages/ContactPage';
import TrainingPage from './pages/TrainingPage';
import AccountPage from './pages/account/AccountPage';
import {
  CustomerForgotPage,
  CustomerLoginPage,
  CustomerRegisterPage,
  CustomerResetPage,
} from './pages/account/AccountAuthPages';
import { AdminPinPage, AdminLoginPage } from './pages/admin/LoginPages';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminAnalytics from './pages/admin/Analytics';
import AdminCustomers from './pages/admin/Customers';
import AdminAuditLogs from './pages/admin/AuditLogs';
import { AdminMenuItems, AdminCategories, AdminDiscounts } from './pages/admin/MenuManagement';
import { AdminAdverts, AdminBanners, AdminSlides, AdminVideos, AdminCommunity } from './pages/admin/ContentManagement';
import { AdminRatings, AdminCateringBookings, AdminContactMessages, AdminTrainingApplications } from './pages/admin/Inquiries';
import AdminSettings from './pages/admin/Settings';

function Public({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

export default function App() {
  return (
    <CustomerProvider>
      <Routes>
        {/* Public site */}
        <Route
          path="/"
          element={
            <Public>
              <HomePage />
            </Public>
          }
        />
        <Route path="/outlets" element={<Public><OutletsPage /></Public>} />
        <Route path="/about" element={<Public><AboutPage /></Public>} />
        <Route path="/menu-access" element={<Public><MenuAccessPage /></Public>} />
        <Route path="/menu" element={<Public><MenuPage /></Public>} />
        <Route path="/cart" element={<Public><CartPage /></Public>} />
        <Route path="/checkout" element={<Public><CheckoutPage /></Public>} />
        <Route path="/order/:id" element={<Public><OrderPage /></Public>} />
        <Route path="/track" element={<Public><TrackPage /></Public>} />
        <Route path="/track/:token" element={<Public><TrackPage /></Public>} />
        <Route path="/catering" element={<Public><CateringPage /></Public>} />
        <Route path="/community" element={<Public><CommunityPage /></Public>} />
        <Route path="/contact" element={<Public><ContactPage /></Public>} />
        <Route path="/training" element={<Public><TrainingPage /></Public>} />

        {/* Customer accounts */}
        <Route path="/account" element={<Public><AccountPage /></Public>} />
        <Route path="/account/login" element={<Public><CustomerLoginPage /></Public>} />
        <Route path="/account/register" element={<Public><CustomerRegisterPage /></Public>} />
        <Route path="/account/forgot" element={<Public><CustomerForgotPage /></Public>} />
        <Route path="/account/reset" element={<Public><CustomerResetPage /></Public>} />

        {/* Admin gate */}
        <Route path="/admin-pin" element={<AdminPinPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="menu" element={<AdminMenuItems />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="discounts" element={<AdminDiscounts />} />
          <Route path="adverts" element={<AdminAdverts />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="slides" element={<AdminSlides />} />
          <Route path="videos" element={<AdminVideos />} />
          <Route path="community" element={<AdminCommunity />} />
          <Route path="ratings" element={<AdminRatings />} />
          <Route path="catering-bookings" element={<AdminCateringBookings />} />
          <Route path="contact-messages" element={<AdminContactMessages />} />
          <Route path="training-applications" element={<AdminTrainingApplications />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CustomerProvider>
  );
}
