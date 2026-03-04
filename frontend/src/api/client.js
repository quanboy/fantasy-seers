import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('fs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fs_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
}

export const propsApi = {
  getPublic: ()           => api.get('/props/public'),
  getById:   (id)         => api.get(`/props/${id}`),
  vote:      (id, data)   => api.post(`/props/${id}/vote`, data),
  getSplit:  (id)         => api.get(`/props/${id}/split`),
}

export const userApi = {
  getMe: () => api.get('/users/me')
}

export default api
