// components/ToastNotification.jsx
import React, { useState, useEffect } from 'react';
import './ToastNotification.css';

const ToastNotification = ({ message, type = 'error', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-error';
    }
  };

  return (
    <div className={`toast-notification ${getTypeClass()} ${isLeaving ? 'leaving' : ''}`}>
      <div className="toast-content">
        <span className="toast-icon">{getIcon()}</span>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={handleClose}>
        ×
      </button>
      <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

export default ToastNotification;