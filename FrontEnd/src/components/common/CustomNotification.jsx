import React, { useState, useEffect, useCallback } from 'react';

const NotificationTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

const CustomNotification = ({ 
  type = NotificationTypes.INFO, 
  title, 
  message, 
  details = [],
  isVisible = false, 
  onClose, 
  autoClose = true,
  duration = 5000 
}) => {
  const [show, setShow] = useState(isVisible);

  const handleClose = useCallback(() => {
    setShow(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Tiempo para animación
  }, [onClose]);

  useEffect(() => {
    setShow(isVisible);
    if (isVisible && autoClose) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, duration, handleClose]);

  if (!show) return null;

  const getStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out";
    
    const typeStyles = {
      [NotificationTypes.SUCCESS]: "border-green-500",
      [NotificationTypes.ERROR]: "border-red-500", 
      [NotificationTypes.WARNING]: "border-yellow-500",
      [NotificationTypes.INFO]: "border-blue-500"
    };

    return `${baseStyles} ${typeStyles[type]} ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`;
  };

  const getIcon = () => {
    const iconStyles = "w-6 h-6 mr-3 flex-shrink-0";
    
    switch (type) {
      case NotificationTypes.SUCCESS:
        return (
          <svg className={`${iconStyles} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case NotificationTypes.ERROR:
        return (
          <svg className={`${iconStyles} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case NotificationTypes.WARNING:
        return (
          <svg className={`${iconStyles} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case NotificationTypes.INFO:
      default:
        return (
          <svg className={`${iconStyles} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={getStyles()}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && (
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {title}
                  </h3>
                )}
                <p className="text-sm text-gray-700">
                  {message}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Details */}
        {details.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <div className="text-sm text-gray-600">
              <h4 className="font-medium mb-2">Detalles:</h4>
              <ul className="space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook para usar notificaciones
const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = ({ type, title, message, details, duration }) => {
    setNotification({
      type,
      title,
      message,
      details: details || [],
      duration: duration || 5000,
      id: Date.now()
    });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const showSuccess = (title, message, details) => {
    showNotification({
      type: NotificationTypes.SUCCESS,
      title,
      message,
      details
    });
  };

  const showError = (title, message, details) => {
    showNotification({
      type: NotificationTypes.ERROR,
      title,
      message,
      details
    });
  };

  const showWarning = (title, message, details) => {
    showNotification({
      type: NotificationTypes.WARNING,
      title,
      message,
      details
    });
  };

  const showInfo = (title, message, details) => {
    showNotification({
      type: NotificationTypes.INFO,
      title,
      message,
      details
    });
  };

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export { CustomNotification, useNotification, NotificationTypes };
export default CustomNotification;


