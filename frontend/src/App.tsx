import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { Empty, TextLink } from './components/ui';
import Admin from './pages/Admin';
import Bookmarks from './pages/Bookmarks';
import DocumentDetail from './pages/DocumentDetail';
import EditDocument from './pages/EditDocument';
import Home from './pages/Home';
import { ForgotPassword, Login, Register, ResetPassword } from './pages/AuthPages';
import Moderation from './pages/Moderation';
import MyDocuments from './pages/MyDocuments';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Upload from './pages/Upload';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="documents/:id" element={<DocumentDetail />} />
        <Route path="profile/:id" element={<PublicProfile />} />

        <Route element={<RequireAuth />}>
          <Route path="upload" element={<Upload />} />
          <Route path="documents/:id/edit" element={<EditDocument />} />
          <Route path="my-documents" element={<MyDocuments />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route element={<RequireAuth roles={['MOD', 'ADMIN']} />}>
          <Route path="moderation" element={<Moderation />} />
        </Route>
        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route path="admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Empty title="Không tìm thấy trang" action={<TextLink to="/">Về trang chủ</TextLink>} />} />
      </Route>
    </Routes>
  );
}
