import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export default api

export const authAPI = {
  login: d => api.post('/auth/login', d),
  register: d => api.post('/auth/register', d),
  me: () => api.get('/auth/me'),
  updateProfile: fd => api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: d => api.put('/auth/change-password', d),
}

export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  getUsers: p => api.get('/admin/users', { params: p }),
  createUser: d => api.post('/admin/users', d),
  getUser: id => api.get(`/admin/users/${id}`),
  updateUser: (id, d) => api.put(`/admin/users/${id}`, d),
  deactivateUser: id => api.delete(`/admin/users/${id}`),
  resetPassword: (id, d) => api.put(`/admin/users/${id}/reset-password`, d),
  getStudentAccess: sid => api.get(`/admin/students/${sid}/access`),
  grantAccess: (sid, d) => api.post(`/admin/students/${sid}/access`, d),
  revokeAccess: (sid, cid) => api.delete(`/admin/students/${sid}/access/${cid}`),
  getPayments: p => api.get('/admin/payments', { params: p }),
  createPayment: d => api.post('/admin/payments', d),
  getStudentProgress: id => api.get(`/admin/reports/student-progress/${id}`),
  getReviewCourses: p => api.get('/admin/courses/review', { params: p }),
  reviewCourse: (id, d) => api.put(`/admin/courses/${id}/review`, d),
}

export const reportsAPI = {
  overview: () => api.get('/reports/overview'),
  enrollments: p => api.get('/reports/enrollments', { params: p }),
  students: p => api.get('/reports/students', { params: p }),
  courses: p => api.get('/reports/courses', { params: p }),
  revenue: p => api.get('/reports/revenue', { params: p }),
  monthly: () => api.get('/reports/monthly-stats'),
}

export const courseAPI = {
  list: p => api.get('/courses', { params: p }),
  featured: () => api.get('/courses/featured'),
  detail: slug => api.get(`/courses/${slug}`),
  my: () => api.get('/courses/my'),
  create: d => api.post('/courses', d),
  update: (id, d) => api.put(`/courses/${id}`, d),
  submitForReview: id => api.post(`/courses/${id}/submit-review`),
  delete: id => api.delete(`/courses/${id}`),
  getSections: cid => api.get(`/courses/${cid}/sections`),
  createSection: (cid, d) => api.post(`/courses/${cid}/sections`, d),
  updateSection: (cid, sid, d) => api.put(`/courses/${cid}/sections/${sid}`, d),
  deleteSection: (cid, sid) => api.delete(`/courses/${cid}/sections/${sid}`),
  createLesson: (cid, sid, d) => api.post(`/courses/${cid}/sections/${sid}/lessons`, d),
  createLessonUploadUrl: lessonId => api.post(`/videos/lessons/${lessonId}/upload-url`),
  updateLesson: (cid, lid, d) => api.put(`/courses/${cid}/lessons/${lid}`, d),
  deleteLesson: (cid, lid) => api.delete(`/courses/${cid}/lessons/${lid}`),
  getReviews: cid => api.get(`/courses/${cid}/reviews`),
  createReview: (cid, d) => api.post(`/courses/${cid}/reviews`, d),
}

export const teacherAPI = {
  dashboard: () => api.get('/teacher/dashboard'),
  courseStudents: cid => api.get(`/teacher/courses/${cid}/students`),
  courseAnalytics: cid => api.get(`/teacher/courses/${cid}/analytics`),
  studentProgress: (sid, cid) => api.get(`/teacher/students/${sid}/progress`, { params: { course_id: cid } }),
}

export const studentAPI = {
  dashboard: () => api.get('/student/dashboard'),
  courses: () => api.get('/student/courses'),
  courseContent: cid => api.get(`/student/courses/${cid}`),
  completeLesson: (lid, d) => api.post(`/student/lessons/${lid}/complete`, d),
  certificates: () => api.get('/student/certificates'),
  announcements: () => api.get('/student/announcements'),
}

export const progressAPI = {
  summary: () => api.get('/progress/summary'),
  course: cid => api.get(`/progress/course/${cid}`),
  track: (lid, d) => api.post(`/progress/lesson/${lid}/track`, d),
}

export const quizAPI = {
  list: cid => api.get('/quizzes', { params: { course_id: cid } }),
  create: d => api.post('/quizzes', d),
  get: id => api.get(`/quizzes/${id}`),
  update: (id, d) => api.put(`/quizzes/${id}`, d),
  delete: id => api.delete(`/quizzes/${id}`),
  getQuestions: id => api.get(`/quizzes/${id}/questions`),
  addQuestion: (id, d) => api.post(`/quizzes/${id}/questions`, d),
  updateQuestion: (id, qid, d) => api.put(`/quizzes/${id}/questions/${qid}`, d),
  deleteQuestion: (id, qid) => api.delete(`/quizzes/${id}/questions/${qid}`),
  submit: (id, d) => api.post(`/quizzes/${id}/submit`, d),
  results: id => api.get(`/quizzes/${id}/results`),
  allAttempts: id => api.get(`/quizzes/${id}/all-attempts`),
}

export const assignmentAPI = {
  list: cid => api.get('/assignments', { params: { course_id: cid } }),
  create: d => api.post('/assignments', d),
  update: (id, d) => api.put(`/assignments/${id}`, d),
  delete: id => api.delete(`/assignments/${id}`),
  submissions: id => api.get(`/assignments/${id}/submissions`),
  grade: (aid, sid, d) => api.put(`/assignments/${aid}/submissions/${sid}/grade`, d),
  submit: (id, d) => api.post(`/assignments/${id}/submit`, d),
  mySubmission: id => api.get(`/assignments/${id}/my-submission`),
}

export const commentAPI = {
  list: (lid, p) => api.get(`/lessons/${lid}/comments`, { params: p }),
  create: (lid, d) => api.post(`/lessons/${lid}/comments`, d),
  replies: cid => api.get(`/comments/${cid}/replies`),
  delete: cid => api.delete(`/comments/${cid}`),
}

export const announcementAPI = {
  list: p => api.get('/announcements', { params: p }),
  create: d => api.post('/announcements', d),
  delete: id => api.delete(`/announcements/${id}`),
}

export const notificationAPI = {
  list: p => api.get('/notifications', { params: p }),
  markRead: d => api.put('/notifications/mark-read', d),
  clear: () => api.delete('/notifications/clear'),
}

export const categoryAPI = {
  list: () => api.get('/categories'),
  create: d => api.post('/categories', d),
  update: (id, d) => api.put(`/categories/${id}`, d),
  delete: id => api.delete(`/categories/${id}`),
}

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: d => api.put('/settings', d),
}

export const landingAPI = {
  get: () => api.get('/landing'),
  search: p => api.get('/search', { params: p }),
  teacherProfile: id => api.get(`/teachers/${id}/profile`),
  verifyCert: num => api.get(`/certificates/verify/${num}`),
  alumni: () => api.get('/alumni'),
}

export const certificateAPI = {
  download: id => api.get(`/certificates/${id}/download`, { responseType: 'blob' }),
  regenerateAll: () => api.post('/admin/certificates/regenerate-all'),
  preview: data => api.post('/admin/certificates/preview', data, { responseType: 'blob' }),
}

// ─── GROWTH FEATURES ────────────────────────────────────────────────────

export const couponAPI = {
  list: () => api.get('/admin/coupons'),
  create: d => api.post('/admin/coupons', d),
  update: (id, d) => api.put(`/admin/coupons/${id}`, d),
  delete: id => api.delete(`/admin/coupons/${id}`),
  validate: d => api.post('/coupons/validate', d),
  redeem: d => api.post('/coupons/redeem', d),
  mine: () => api.get('/me/coupons'),
}

export const bundleAPI = {
  list: () => api.get('/bundles'),
  create: d => api.post('/admin/bundles', d),
  update: (id, d) => api.put(`/admin/bundles/${id}`, d),
  delete: id => api.delete(`/admin/bundles/${id}`),
  grant: (id, d) => api.post(`/admin/bundles/${id}/grant`, d),
  plans: () => api.get('/subscription-plans'),
  createPlan: d => api.post('/admin/subscription-plans', d),
  grantSubscription: (studentId, d) => api.post(`/admin/students/${studentId}/subscription`, d),
  mySubscription: () => api.get('/me/subscription'),
}

export const cohortAPI = {
  list: courseId => api.get(`/courses/${courseId}/cohorts`),
  create: (courseId, d) => api.post(`/courses/${courseId}/cohorts`, d),
  update: (id, d) => api.put(`/cohorts/${id}`, d),
  delete: id => api.delete(`/cohorts/${id}`),
  students: id => api.get(`/cohorts/${id}/students`),
  enroll: (id, d) => api.post(`/cohorts/${id}/enroll`, d),
  removeStudent: (id, studentId) => api.delete(`/cohorts/${id}/students/${studentId}`),
  setDrip: (sectionId, d) => api.put(`/sections/${sectionId}/drip`, d),
}

export const liveAPI = {
  list: courseId => api.get(`/courses/${courseId}/live-sessions`),
  create: (courseId, d) => api.post(`/courses/${courseId}/live-sessions`, d),
  update: (id, d) => api.put(`/live-sessions/${id}`, d),
  delete: id => api.delete(`/live-sessions/${id}`),
  mine: () => api.get('/student/live-sessions'),
}

export const referralAPI = {
  me: () => api.get('/me/referral'),
  credits: () => api.get('/me/credits'),
  adminList: () => api.get('/admin/referrals'),
}

export const funnelAPI = {
  overview: days => api.get('/admin/funnel/overview', { params: { days } }),
  dropoff: courseId => api.get(`/admin/funnel/course/${courseId}/dropoff`),
  // Fire-and-forget client tracking — never blocks the UI.
  track: payload => { try { api.post('/track', payload).catch(() => {}) } catch { /* noop */ } },
}

export const streakAPI = {
  get: () => api.get('/me/streak'),
  setGoal: d => api.put('/me/streak/goal', d),
}

export const faqAPI = {
  list: courseId => api.get(`/courses/${courseId}/faqs`),
  create: (courseId, d) => api.post(`/courses/${courseId}/faqs`, d),
  update: (id, d) => api.put(`/faqs/${id}`, d),
  delete: id => api.delete(`/faqs/${id}`),
}

export const slaAPI = {
  metrics: () => api.get('/teacher/sla'),
  inbox: () => api.get('/teacher/sla/inbox'),
}

export const broadcastAPI = {
  list: () => api.get('/admin/broadcasts'),
  preview: d => api.post('/admin/broadcasts/preview', d),
  send: d => api.post('/admin/broadcasts', d),
  get: id => api.get(`/admin/broadcasts/${id}`),
}

export const siteFaqAPI = {
  publicList: () => api.get('/site-faqs'),
  list: () => api.get('/admin/site-faqs'),
  create: d => api.post('/admin/site-faqs', d),
  update: (id, d) => api.put(`/admin/site-faqs/${id}`, d),
  delete: id => api.delete(`/admin/site-faqs/${id}`),
}

export const teamAPI = {
  publicList: () => api.get('/team'),
  list: () => api.get('/admin/team'),
  create: fd => api.post('/admin/team', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, fd) => api.put(`/admin/team/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: id => api.delete(`/admin/team/${id}`),
}

export const alumniAdminAPI = {
  list: () => api.get('/admin/alumni'),
  create: fd => api.post('/admin/alumni', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, fd) => api.put(`/admin/alumni/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: id => api.delete(`/admin/alumni/${id}`),
}
