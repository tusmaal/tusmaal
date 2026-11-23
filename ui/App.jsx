import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import Home from './pages/public/Home.jsx'
import CourseCatalog from './pages/public/CourseCatalog.jsx'
import CourseDetail from './pages/public/CourseDetail.jsx'
import About from './pages/public/About.jsx'
import Contact from './pages/public/Contact.jsx'
import Login from './pages/public/Login.jsx'
import Register from './pages/public/Register.jsx'
import FAQ from './pages/public/FAQ.jsx'
import Alumni from './pages/public/Alumni.jsx'
import Verify from './pages/public/Verify.jsx'

import AdminDashboard from './pages/admin/Dashboard.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminCourses from './pages/admin/Courses.jsx'
import AdminCourseReviews from './pages/admin/CourseReviews.jsx'
import CourseAccess from './pages/admin/CourseAccess.jsx'
import Payments from './pages/admin/Payments.jsx'
import Reports from './pages/admin/Reports.jsx'
import Categories from './pages/admin/Categories.jsx'
import AdminAnnouncements from './pages/admin/Announcements.jsx'
import Settings from './pages/admin/Settings.jsx'
import AdminCoupons from './pages/admin/Coupons.jsx'
import AdminBundles from './pages/admin/Bundles.jsx'
import AdminFunnel from './pages/admin/Funnel.jsx'
import AdminReferrals from './pages/admin/Referrals.jsx'
import AdminBroadcast from './pages/admin/Broadcast.jsx'
import AdminFAQs from './pages/admin/FAQs.jsx'
import AdminTeam from './pages/admin/Team.jsx'
import AdminAlumni from './pages/admin/Alumni.jsx'

import TeacherDashboard from './pages/teacher/Dashboard.jsx'
import TeacherCourses from './pages/teacher/Courses.jsx'
import CourseBuilder from './pages/teacher/CourseBuilder.jsx'
import TeacherAssignments from './pages/teacher/Assignments.jsx'
import TeacherQuizzes from './pages/teacher/Quizzes.jsx'
import TeacherAnnouncements from './pages/teacher/Announcements.jsx'
import TeacherLiveClasses from './pages/teacher/LiveClasses.jsx'
import TeacherQA from './pages/teacher/QA.jsx'

import StudentDashboard from './pages/student/Dashboard.jsx'
import StudentCourses from './pages/student/MyCourses.jsx'
import CoursePlayer from './pages/student/CoursePlayer.jsx'
import Certificates from './pages/student/Certificates.jsx'
import StudentAnnouncements from './pages/student/Announcements.jsx'
import StudentLiveClasses from './pages/student/LiveClasses.jsx'
import StudentRewards from './pages/student/Rewards.jsx'
import StudentSettings from './pages/student/Settings.jsx'

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"/></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />
  return children
}

function RedirectIfGuest({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"/></div>
  if (user) return <Navigate to={`/${user.role}`} replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: 'Degular, Outfit, Segoe UI, Roboto, Arial, sans-serif', fontSize: 14, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' } }} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<CourseCatalog />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/alumni" element={<Alumni />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/login" element={<RedirectIfGuest><Login /></RedirectIfGuest>} />
            <Route path="/register" element={<RedirectIfGuest><Register /></RedirectIfGuest>} />

            <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
            <Route path="/admin/courses" element={<RequireAuth roles={['admin']}><AdminCourses /></RequireAuth>} />
            <Route path="/admin/course-reviews" element={<RequireAuth roles={['admin']}><AdminCourseReviews /></RequireAuth>} />
            <Route path="/admin/access" element={<RequireAuth roles={['admin']}><CourseAccess /></RequireAuth>} />
            <Route path="/admin/payments" element={<RequireAuth roles={['admin']}><Payments /></RequireAuth>} />
            <Route path="/admin/reports" element={<RequireAuth roles={['admin']}><Reports /></RequireAuth>} />
            <Route path="/admin/categories" element={<RequireAuth roles={['admin']}><Categories /></RequireAuth>} />
            <Route path="/admin/announcements" element={<RequireAuth roles={['admin']}><AdminAnnouncements /></RequireAuth>} />
            <Route path="/admin/settings" element={<RequireAuth roles={['admin']}><Settings /></RequireAuth>} />
            <Route path="/admin/coupons" element={<RequireAuth roles={['admin']}><AdminCoupons /></RequireAuth>} />
            <Route path="/admin/bundles" element={<RequireAuth roles={['admin']}><AdminBundles /></RequireAuth>} />
            <Route path="/admin/funnel" element={<RequireAuth roles={['admin']}><AdminFunnel /></RequireAuth>} />
            <Route path="/admin/referrals" element={<RequireAuth roles={['admin']}><AdminReferrals /></RequireAuth>} />
            <Route path="/admin/broadcast" element={<RequireAuth roles={['admin']}><AdminBroadcast /></RequireAuth>} />
            <Route path="/admin/faqs" element={<RequireAuth roles={['admin']}><AdminFAQs /></RequireAuth>} />
            <Route path="/admin/team" element={<RequireAuth roles={['admin']}><AdminTeam /></RequireAuth>} />
            <Route path="/admin/alumni" element={<RequireAuth roles={['admin']}><AdminAlumni /></RequireAuth>} />

            <Route path="/teacher" element={<RequireAuth roles={['teacher','admin']}><TeacherDashboard /></RequireAuth>} />
            <Route path="/teacher/courses" element={<RequireAuth roles={['teacher','admin']}><TeacherCourses /></RequireAuth>} />
            <Route path="/teacher/courses/:courseId" element={<RequireAuth roles={['teacher','admin']}><CourseBuilder /></RequireAuth>} />
            <Route path="/teacher/assignments" element={<RequireAuth roles={['teacher','admin']}><TeacherAssignments /></RequireAuth>} />
            <Route path="/teacher/quizzes" element={<RequireAuth roles={['teacher','admin']}><TeacherQuizzes /></RequireAuth>} />
            <Route path="/teacher/announcements" element={<RequireAuth roles={['teacher','admin']}><TeacherAnnouncements /></RequireAuth>} />
            <Route path="/teacher/live" element={<RequireAuth roles={['teacher','admin']}><TeacherLiveClasses /></RequireAuth>} />
            <Route path="/teacher/qa" element={<RequireAuth roles={['teacher','admin']}><TeacherQA /></RequireAuth>} />

            <Route path="/student" element={<RequireAuth roles={['student']}><StudentDashboard /></RequireAuth>} />
            <Route path="/student/courses" element={<RequireAuth roles={['student']}><StudentCourses /></RequireAuth>} />
            <Route path="/student/courses/:courseId" element={<RequireAuth roles={['student']}><CoursePlayer /></RequireAuth>} />
            <Route path="/student/certificates" element={<RequireAuth roles={['student']}><Certificates /></RequireAuth>} />
            <Route path="/student/announcements" element={<RequireAuth roles={['student']}><StudentAnnouncements /></RequireAuth>} />
            <Route path="/student/live" element={<RequireAuth roles={['student']}><StudentLiveClasses /></RequireAuth>} />
            <Route path="/student/rewards" element={<RequireAuth roles={['student']}><StudentRewards /></RequireAuth>} />
            <Route path="/student/settings" element={<RequireAuth roles={['student']}><StudentSettings /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
