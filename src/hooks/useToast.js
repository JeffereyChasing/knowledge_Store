// hooks/useToast.js
import { useState, useCallback } from 'react';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = toastId++;
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const showWarning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
};