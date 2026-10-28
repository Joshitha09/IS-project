/**
 * api.js — Axios service for all backend API calls.
 * All calls go through Vite's proxy (/api → http://127.0.0.1:8000)
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// ── File Registration ────────────────────────────────────────────────
export const registerFile = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/files/register', form, {
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  })
}

// ── List Registered Files ────────────────────────────────────────────
export const listFiles = (params = {}) => api.get('/files', { params })

// ── Get Single File ──────────────────────────────────────────────────
export const getFile = (fileId) => api.get(`/files/${fileId}`)

// ── Delete File ──────────────────────────────────────────────────────
export const deleteFile = (fileId) => api.delete(`/files/${fileId}`)

// ── Verify File ──────────────────────────────────────────────────────
export const verifyFile = (fileId, file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/files/${fileId}/verify`, form, {
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  })
}

// ── Verification History ─────────────────────────────────────────────
export const getHistory = (params = {}) => api.get('/history', { params })

// ── Dashboard Stats ──────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/dashboard/stats')

// ── CSV Export ───────────────────────────────────────────────────────
export const exportCsv = async () => {
  const resp = await api.get('/reports/export', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([resp.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'file_tampering_report.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api
