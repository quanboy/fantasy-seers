import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('fs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function showSessionExpiredToast() {
  const toast = document.createElement('div')
  toast.textContent = 'Your session expired. Please log in again.'
  Object.assign(toast.style, {
    position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
    background: '#1e293b', color: '#f1f5f9', padding: '12px 24px',
    borderRadius: '8px', border: '1px solid #334155', zIndex: '9999',
    fontFamily: 'Inter, sans-serif', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  })
  document.body.appendChild(toast)
}

api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    const isAuthRoute = url.startsWith('/auth/')
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('fs_token')
      showSessionExpiredToast()
      setTimeout(() => { window.location.href = '/login' }, 2000)
    } else if (err.response?.status === 403 && !localStorage.getItem('fs_token') && !isAuthRoute) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
}

export const propsApi = {
  getPublic: ()           => api.get('/props/public'),
  getById:   (id)         => api.get(`/props/${id}`),
  vote:      (id, data)   => api.post(`/props/${id}/vote`, data),
  getSplit:  (id)         => api.get(`/props/${id}/split`),
  submit:    (data)       => api.post('/props/submit', data),
}

export const adminApi = {
    getPending: () => api.get('/admin/props/pending'),
    getClosed:  () => api.get('/admin/props/closed'),
    approve:    (id) => api.post(`/admin/props/${id}/approve`),
    reject:     (id) => api.post(`/admin/props/${id}/reject`),
    resolve:    (id, result) => api.post(`/admin/props/${id}/resolve?result=${result}`),
    createProp: (data) => api.post('/admin/props', data),
    getAllGroups: () => api.get('/admin/groups'),
}

export const groupsApi = {
  getMyGroups:  ()       => api.get('/groups'),
  createGroup:  (data)   => api.post('/groups', data),
  joinGroup:    (data)   => api.post('/groups/join', data),
  getGroup:     (id)     => api.get(`/groups/${id}`),
  getGroupProps:(id)     => api.get(`/groups/${id}/props`),
  inviteUser:    (id, data) => api.post(`/groups/${id}/invite`, data),
  getMyInvites:  ()         => api.get('/groups/invites'),
  acceptInvite:  (inviteId) => api.post(`/groups/invites/${inviteId}/accept`),
  rejectInvite:  (inviteId) => api.post(`/groups/invites/${inviteId}/reject`),
  renameGroup:   (id, data) => api.patch(`/groups/${id}`, data),
  kickMember:    (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  leaveGroup:    (id) => api.delete(`/groups/${id}/members/me`),
}

export const leaderboardApi = {
  getGlobal: () => api.get('/leaderboard/global'),
  getByGroup: (groupId) => api.get(`/leaderboard/group/${groupId}`),
}

export const userApi = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
}

export const rankingsApi = {
  getMySheet: () => api.get('/rankings/my-sheet'),
  saveMySheet: (rankings) => api.post('/rankings/my-sheet', { rankings }),
}

export default api
