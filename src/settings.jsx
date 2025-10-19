import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from './hooks/useTranslations';

const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const { t: tSettingsControl } = useTranslation('settingsControl');
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    CHECK_INTERVAL_MINUTES: '5',
    COOLDOWN_MINUTES: '360',
    THRESHOLD: '5',
    RESEND_API_KEY: '',
    FROM_EMAIL: '',
    ALERT_EMAIL: '',
    DISCORD_WEBHOOK_URL: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  // Load config when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset API key display state each time modal opens
      setShowApiKey(false);
      const loadConfig = async () => {
        try {
          const config = await window.electronAPI.readEnvFile();
          setFormData(prev => ({
            ...prev,
            ...config,
            // Ensure threshold is a number
            THRESHOLD: config.THRESHOLD?.toString() || '5',
            CHECK_INTERVAL_MINUTES: config.CHECK_INTERVAL_MINUTES?.toString() || '5',
            COOLDOWN_MINUTES: config.COOLDOWN_MINUTES?.toString() || '360'
          }));
        } catch (error) {
          console.error('Error loading config:', error);
          // Use default values if there's an error
          setFormData({
            CHECK_INTERVAL_MINUTES: '5',
            COOLDOWN_MINUTES: '360',
            THRESHOLD: '5',
            RESEND_API_KEY: '',
            FROM_EMAIL: '',
            ALERT_EMAIL: '',
            DISCORD_WEBHOOK_URL: ''
          });
        } finally {
          setIsLoading(false);
        }
      };
      loadConfig();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when modifying
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const [thresholdWarning, setThresholdWarning] = useState('');
  const [intervalWarning, setIntervalWarning] = useState('');
  const [cooldownWarning, setCooldownWarning] = useState('');
  const intervalRef = useRef(null);
  const intervalCheckRef = useRef(null);
  const intervalCooldownRef = useRef(null);

  // Function to handle button increment start
  const startIncrement = (increment) => {
    changeValue(increment);
    
    // Configure interval for continuous changes
    intervalRef.current = setInterval(() => {
      changeValue(increment);
    }, 100);

    document.addEventListener('mouseup', stopIncrement);
    document.addEventListener('mouseleave', stopIncrement);
  };

  // Function to stop increment/decrement
  const stopIncrement = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    document.removeEventListener('mouseup', stopIncrement);
    document.removeEventListener('mouseleave', stopIncrement);
  };

  // Function to change the value
  const changeValue = (increment) => {
    setFormData(prev => {
      const currentValue = parseFloat(prev.THRESHOLD || 0);
      const newValue = Math.min(100, Math.max(0, currentValue + increment));
      
      // Update warning if necessary
      if (newValue < 0 || newValue > 100) {
        setThresholdWarning(tSettingsControl('thresholdRangeWarning'));
      } else {
        setThresholdWarning('');
      }

      return {
        ...prev,
        THRESHOLD: newValue.toFixed(1)
      };
    });
  };

  // COOLDOWN_MINUTES and CHECK_INTERVAL_MINUTES
  const startIncrementCheckInterval = (increment) => {
    changeCheckInterval(increment);
    intervalCheckRef.current = setInterval(() => {
      changeCheckInterval(increment);
    }, 100);
    document.addEventListener('mouseup', stopIncrementCheckInterval);
    document.addEventListener('mouseleave', stopIncrementCheckInterval);
  };

  const stopIncrementCheckInterval = () => {
    if (intervalCheckRef.current) {
      clearInterval(intervalCheckRef.current);
      intervalCheckRef.current = null;
    }
    document.removeEventListener('mouseup', stopIncrementCheckInterval);
    document.removeEventListener('mouseleave', stopIncrementCheckInterval);
  };

  const changeCheckInterval = (increment) => {
    setFormData(prev => {
      const currentValue = parseInt(prev.CHECK_INTERVAL_MINUTES || 0, 10);
      const newValue = Math.min(60, Math.max(5, currentValue + increment));
      if (newValue < 5 || newValue > 60) {
        setIntervalWarning(tSettingsControl('intervalRangeWarning'));
      } else {
        setIntervalWarning('');
      }
      return {
        ...prev,
        CHECK_INTERVAL_MINUTES: String(newValue)
      };
    });
  };

  // COOLDOWN_MINUTES
  const startIncrementCooldown = (increment) => {
    changeCooldown(increment);
    intervalCooldownRef.current = setInterval(() => {
      changeCooldown(increment);
    }, 100);
    document.addEventListener('mouseup', stopIncrementCooldown);
    document.addEventListener('mouseleave', stopIncrementCooldown);
  };

  const stopIncrementCooldown = () => {
    if (intervalCooldownRef.current) {
      clearInterval(intervalCooldownRef.current);
      intervalCooldownRef.current = null;
    }
    document.removeEventListener('mouseup', stopIncrementCooldown);
    document.removeEventListener('mouseleave', stopIncrementCooldown);
  };

  const changeCooldown = (increment) => {
    setFormData(prev => {
      const currentValue = parseInt(prev.COOLDOWN_MINUTES || 0, 10);
      // limits: minimum 1 min, maximum 10080 (7 days)
      const newValue = Math.min(10080, Math.max(1, currentValue + increment));
      if (newValue < 1 || newValue > 10080) {
        setCooldownWarning(tSettingsControl('cooldownRangeWarning'));
      } else {
        setCooldownWarning('');
      }
      return {
        ...prev,
        COOLDOWN_MINUTES: String(newValue)
      };
    });
  };

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (intervalCheckRef.current) {
        clearInterval(intervalCheckRef.current);
      }
      if (intervalCooldownRef.current) {
        clearInterval(intervalCooldownRef.current);
      }
    };
  }, []);

  const validateForm = () => {
    const newErrors = {};
    const threshold = parseFloat(formData.THRESHOLD);
    const checkInterval = parseInt(formData.CHECK_INTERVAL_MINUTES, 10);
    const cooldown = parseInt(formData.COOLDOWN_MINUTES, 10);
    
    // Clear previous validation messages
    const thresholdInput = document.getElementById('THRESHOLD');
    const checkIntervalInput = document.getElementById('CHECK_INTERVAL_MINUTES');
    const cooldownInput = document.getElementById('COOLDOWN_MINUTES');
    const apiKeyInput = document.getElementById('RESEND_API_KEY');
    const fromEmailInput = document.getElementById('FROM_EMAIL');
    const alertEmailInput = document.getElementById('ALERT_EMAIL');
    
    [thresholdInput, checkIntervalInput, cooldownInput, apiKeyInput, fromEmailInput, alertEmailInput].forEach(input => {
      if (input) input.setCustomValidity('');
    });
    
    // Check interval validation
    if (!formData.CHECK_INTERVAL_MINUTES || isNaN(checkInterval)) {
      const msg = tSettingsControl('intervalRequiredWarning');
      newErrors.CHECK_INTERVAL_MINUTES = msg;
      setIntervalWarning('');
      if (checkIntervalInput) {
        checkIntervalInput.setCustomValidity(msg);
        checkIntervalInput.reportValidity();
      }
      return false;
    } else if (checkInterval < 5 || checkInterval > 60) {
      const msg = tSettingsControl('intervalRangeWarning');
      setIntervalWarning(msg);
      if (checkIntervalInput) {
        checkIntervalInput.setCustomValidity(msg);
        checkIntervalInput.reportValidity();
      }
      return false;
    } else if (checkInterval % 5 !== 0) {
      const msg = tSettingsControl('intervalStepWarning');
      setIntervalWarning(msg);
      if (checkIntervalInput) {
        checkIntervalInput.setCustomValidity(msg);
        checkIntervalInput.reportValidity();
      }
      return false;
    } else {
      setIntervalWarning('');
      if (checkIntervalInput) checkIntervalInput.setCustomValidity('');
    }

    // Cooldown validation
    if (!formData.COOLDOWN_MINUTES || isNaN(cooldown)) {
      const msg = tSettingsControl('cooldownRequiredWarning');
      newErrors.COOLDOWN_MINUTES = msg;
      setCooldownWarning('');
      if (cooldownInput) {
        cooldownInput.setCustomValidity(msg);
        cooldownInput.reportValidity();
      }
      return false;
    } else if (cooldown < 1 || cooldown > 10080) {
      const msg = tSettingsControl('cooldownRangeWarning');
      setCooldownWarning(msg);
      if (cooldownInput) {
        cooldownInput.setCustomValidity(msg);
        cooldownInput.reportValidity();
      }
      return false;
    } else {
      setCooldownWarning('');
      if (cooldownInput) cooldownInput.setCustomValidity('');
    }

    // Threshold validation
    if (!formData.THRESHOLD || isNaN(threshold)) {
      const msg = tSettingsControl('thresholdRequiredWarning');
      newErrors.THRESHOLD = msg;
      setThresholdWarning('');
      if (thresholdInput) {
        thresholdInput.setCustomValidity(msg);
        thresholdInput.reportValidity();
      }
      return false;
    } else if (threshold < 0 || threshold > 100) {
      const msg = tSettingsControl('thresholdRangeWarning');
      setThresholdWarning(msg);
      if (thresholdInput) {
        thresholdInput.setCustomValidity(msg);
        thresholdInput.reportValidity();
      }
      return false;
    } else {
      setThresholdWarning('');
      if (thresholdInput) thresholdInput.setCustomValidity('');
    }
    
    // Optional fields: only validate format if they are present
    const apiKey = (formData.RESEND_API_KEY || '').trim();
    const fromEmail = (formData.FROM_EMAIL || '').trim();
    const alertEmail = (formData.ALERT_EMAIL || '').trim();
    // Clear possible customValidity from the group
    if (apiKeyInput) apiKeyInput.setCustomValidity('');
    if (fromEmailInput) fromEmailInput.setCustomValidity('');
    if (alertEmailInput) alertEmailInput.setCustomValidity('');
    
    // Email format validation if they are filled
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (fromEmail && !emailRegex.test(fromEmail)) {
      const msg = tSettingsControl('invalidEmailFormat');
      newErrors.FROM_EMAIL = msg;
      if (fromEmailInput) {
        fromEmailInput.setCustomValidity(msg);
        fromEmailInput.reportValidity();
      }
      setErrors(newErrors);
      return false;
    }
    
    if (alertEmail && !emailRegex.test(alertEmail)) {
      const msg = tSettingsControl('invalidEmailFormat');
      newErrors.ALERT_EMAIL = msg;
      if (alertEmailInput) {
        alertEmailInput.setCustomValidity(msg);
        alertEmailInput.reportValidity();
      }
      setErrors(newErrors);
      return false;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setSaveStatus({ type: '', message: '' });

    try {
      // Save configuration
      await window.electronAPI.writeEnvFile(formData);
      setShowSuccess(true);
      // Hide the message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error saving config:', error);
      setSaveStatus({
        type: 'error', 
        message: tSettingsControl('errorSavingConfig') + error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If modal is not open, do not show anything
  if (!isOpen) {
    return null;
  }
  // Content
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {tSettingsControl('settings')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              aria-label={tSettingsControl('closeButton')}
            >
              ✕
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {saveStatus.type === 'error' && saveStatus.message && (
                <div className="p-3 mb-4 rounded-md bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm">
                  {saveStatus.message}
                </div>
              )}
              
              {/* Check interval (minutes) */}
              <div>
                <label htmlFor="CHECK_INTERVAL_MINUTES" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('checkIntervalMinutes')}  <span className="text-teal-500 transition ease-in-out hover:text-teal-300 duration-300">({tSettingsControl('minutes')})</span> <span className="text-blue-400 transition ease-in-out hover:text-blue-300 duration-300">(5-60)</span> <span className="text-rose-200 transition ease-in-out hover:text-rose-300 duration-300">{tSettingsControl('required')}</span>
                </label>
                <div className="w-full">
                  <div className="flex items-center max-w-md">
                    <button
                      type="button"
                      title={tSettingsControl('mouseWheelDown')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startIncrementCheckInterval(-5);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY > 0) {
                          const newValue = Math.max(5, parseInt(formData.CHECK_INTERVAL_MINUTES || 0, 10) - 5);
                          handleChange({ target: { name: 'CHECK_INTERVAL_MINUTES', value: String(newValue) } });
                        }
                      }}
                      onTouchStart={() => startIncrementCheckInterval(-5)}
                      onMouseUp={stopIncrementCheckInterval}
                      onMouseLeave={stopIncrementCheckInterval}
                      className="will-change-transform flex-shrink-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 dark:text-gray-400 rounded-md dark:hover:text-blue-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-gray-200 dark:active:bg-gray-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="relative flex-1 flex justify-center">
                      <input
                        type="number"
                        id="CHECK_INTERVAL_MINUTES"
                        name="CHECK_INTERVAL_MINUTES"
                        value={formData.CHECK_INTERVAL_MINUTES}
                        onChange={handleChange}
                        readOnly
                        onKeyDown={(e) => e.preventDefault()}
                        onInput={(e) => e.currentTarget.setCustomValidity('')}
                        onInvalid={(e) => {
                          const v = parseInt(e.currentTarget.value, 10);
                          if (!e.currentTarget.value || isNaN(v)) {
                            e.currentTarget.setCustomValidity(tSettingsControl('intervalRequiredWarning'));
                          } else if (v < 5 || v > 60) {
                            e.currentTarget.setCustomValidity(tSettingsControl('intervalRangeWarning'));
                          } else if (v % 5 !== 0) {
                            e.currentTarget.setCustomValidity(tSettingsControl('intervalStepWarning'));
                          }
                        }}
                        className="will-change-transform w-11/12 h-10 px-4 text-center border-t border-b border-gray-300 dark:border-gray-600 focus:outline-none rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition"
                        min="5"
                        max="60"
                        step="5"
                        onMouseWheel={(e) => e.target.blur()}
                        placeholder="5-60"
                      />
                    </div>
                    <button
                      type="button"
                      title={tSettingsControl('mouseWheelUp')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startIncrementCheckInterval(5);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY < 0) {
                          const newValue = Math.min(60, parseInt(formData.CHECK_INTERVAL_MINUTES || 0, 10) + 5);
                          handleChange({ target: { name: 'CHECK_INTERVAL_MINUTES', value: String(newValue) } });
                        }
                      }}
                      onTouchStart={() => startIncrementCheckInterval(5)}
                      onMouseUp={stopIncrementCheckInterval}
                      onMouseLeave={stopIncrementCheckInterval}
                      className="will-change-transform flex-shrink-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 rounded-md dark:text-gray-400 dark:hover:text-blue-400 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-gray-200 dark:active:bg-gray-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  {intervalWarning && (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                      {intervalWarning}
                    </p>
                  )}
                </div>
              </div>

              {/* Cooldown (minutes) */}
              <div>
                <label htmlFor="COOLDOWN_MINUTES" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('cooldownMinutes')}  <span className="text-teal-500 transition ease-in-out hover:text-teal-300 duration-300">({tSettingsControl('minutes')})</span> <span className="text-blue-400 transition ease-in-out hover:text-blue-300 duration-300">(1-10080)</span> <span className="text-rose-200 transition ease-in-out hover:text-rose-300 duration-300">{tSettingsControl('required')}</span>
                </label>
                <div className="w-full">
                  <div className="flex items-center max-w-md">
                    <button
                      type="button"
                      title={tSettingsControl('mouseWheelDown')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startIncrementCooldown(-1);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY > 0) {
                          const newValue = Math.max(1, parseInt(formData.COOLDOWN_MINUTES || 0, 10) - 1);
                          handleChange({ target: { name: 'COOLDOWN_MINUTES', value: String(newValue) } });
                        }
                      }}
                      onTouchStart={() => startIncrementCooldown(-1)}
                      onMouseUp={stopIncrementCooldown}
                      onMouseLeave={stopIncrementCooldown}
                      className="will-change-transform flex-shrink-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 dark:text-gray-400 rounded-md dark:hover:text-blue-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-gray-200 dark:active:bg-gray-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="relative flex-1 flex justify-center">
                      <input
                        type="number"
                        id="COOLDOWN_MINUTES"
                        name="COOLDOWN_MINUTES"
                        value={formData.COOLDOWN_MINUTES}
                        onChange={handleChange}
                        onInput={(e) => e.currentTarget.setCustomValidity('')}
                        onInvalid={(e) => {
                          const v = parseInt(e.currentTarget.value, 10);
                          if (!e.currentTarget.value || isNaN(v)) {
                            e.currentTarget.setCustomValidity(tSettingsControl('cooldownRequiredWarning'));
                          } else if (v < 1 || v > 10080) {
                            e.currentTarget.setCustomValidity(tSettingsControl('cooldownRangeWarning'));
                          }
                        }}
                        className="will-change-transform w-11/12 h-10 px-4 text-center border-t border-b border-gray-300 dark:border-gray-600 focus:outline-none rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition"
                        min="1"
                        max="10080"
                        step="1"
                        onMouseWheel={(e) => e.target.blur()}
                        placeholder="1-10080"
                      />
                    </div>
                    <button
                      type="button"
                      title={tSettingsControl('mouseWheelUp')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startIncrementCooldown(1);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY < 0) {
                          const newValue = Math.min(10080, parseInt(formData.COOLDOWN_MINUTES || 0, 10) + 1);
                          handleChange({ target: { name: 'COOLDOWN_MINUTES', value: String(newValue) } });
                        }
                      }}
                      onTouchStart={() => startIncrementCooldown(1)}
                      onMouseUp={stopIncrementCooldown}
                      onMouseLeave={stopIncrementCooldown}
                      className="will-change-transform flex-shrink-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 rounded-md dark:text-gray-400 dark:hover:text-blue-400 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-gray-200 dark:active:bg-gray-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  {cooldownWarning && (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                      {cooldownWarning}
                    </p>
                  )}
                </div>
              </div>

              {/* Threshold */}
              <div>
                <label htmlFor="THRESHOLD" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('threshold')} <span className="text-blue-400 transition ease-in-out hover:text-blue-300 duration-300">(0-100%)</span> <span className="text-rose-200 transition ease-in-out hover:text-rose-300 duration-300">{tSettingsControl('required')}</span>
                </label>
                <div className="w-full">
                  <div className="flex items-center max-w-md">
                    <button
                      type="button"
                      title={tSettingsControl('mouseWheelDown')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startIncrement(-0.1);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        // Only decrease when scrolling down
                        if (e.deltaY > 0) {
                          const newValue = Math.max(0, parseFloat(formData.THRESHOLD || 0) - 0.1);
                          handleChange({
                            target: {
                              name: 'THRESHOLD',
                              value: newValue.toFixed(1),
                            }
                          });
                        }
                      }}
                      onTouchStart={() => startIncrement(-0.1)}
                      onMouseUp={stopIncrement}
                      onMouseLeave={stopIncrement}
                      className="will-change-transform flex-shrink-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 dark:text-gray-400 rounded-md dark:hover:text-blue-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-gray-200 dark:active:bg-gray-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <div className="relative flex-1 flex justify-center">
                      <input
                        type="number"
                        id="THRESHOLD"
                        name="THRESHOLD"
                        value={formData.THRESHOLD}
                        onChange={handleChange}
                        onInput={(e) => e.currentTarget.setCustomValidity('')}
                        onInvalid={(e) => {
                          const v = parseFloat(e.currentTarget.value);
                          if (!e.currentTarget.value || isNaN(v)) {
                            e.currentTarget.setCustomValidity(tSettingsControl('thresholdRequiredWarning'));
                          } else if (v < 0 || v > 100) {
                            e.currentTarget.setCustomValidity(tSettingsControl('thresholdRangeWarning'));
                          }
                        }}
                        className="will-change-transform w-11/12 h-10 px-4 text-center border-t border-b border-gray-300 dark:border-gray-600 focus:outline-none rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition"
                        min="0"
                        max="100"
                        step="0.1"
                        onMouseWheel={(e) => e.target.blur()} // Prevent mouse wheel from changing the value
                        placeholder="0-100"
                      />
                    </div>
                    
                    <button
                      type="button"
                      title={tSettingsControl('mouseWheelUp')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startIncrement(0.1);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        // Only increase when scrolling up
                        if (e.deltaY < 0) {
                          const newValue = Math.min(100, parseFloat(formData.THRESHOLD || 0) + 0.1);
                          handleChange({
                            target: {
                              name: 'THRESHOLD',
                              value: newValue.toFixed(1)
                            }
                          });
                        }
                      }}
                      onTouchStart={() => startIncrement(0.1)}
                      onMouseUp={stopIncrement}
                      onMouseLeave={stopIncrement}
                      className="will-change-transform flex-shrink-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 rounded-md dark:text-gray-400 dark:hover:text-blue-400 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-gray-200 dark:active:bg-gray-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  {thresholdWarning && (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                      {thresholdWarning}
                    </p>
                  )}
                </div>
              </div>

                {/* Resend API Key */}
              <div> 
                <label htmlFor="RESEND_API_KEY" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('resendApiKey')} <span className="text-green-300 transition ease-in-out hover:text-green-400 duration-300"> {tSettingsControl('optional')}</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    id="RESEND_API_KEY"
                    name="RESEND_API_KEY"
                    value={formData.RESEND_API_KEY}
                    onChange={handleChange}
                    className="will-change-transform w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition"
                    placeholder="re_1234567890abcdef"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
                    tabIndex="-1"
                  >
                    {showApiKey ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* From Email */}
              <div>
                <label htmlFor="FROM_EMAIL" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('fromEmail')} <span className="text-green-300 transition ease-in-out hover:text-green-400 duration-300"> {tSettingsControl('optional')}</span>
                </label>
                <input
                  type="email"
                  id="FROM_EMAIL"
                  name="FROM_EMAIL"
                  value={formData.FROM_EMAIL}
                  onChange={handleChange}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                  onInvalid={(e) => {
                    // Forzar nuestro mensaje traducido en vez del nativo del navegador
                    e.currentTarget.setCustomValidity(tSettingsControl('invalidEmailFormat'));
                  }}
                  className="will-change-transform w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition"
                  placeholder={tSettingsControl('fromEmailPlaceholder')}
                />
              </div>

              {/* Alert Email */}
              <div>
                <label htmlFor="ALERT_EMAIL" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('alertEmail')} <span className="text-green-300 transition ease-in-out hover:text-green-400 duration-300"> {tSettingsControl('optional')}</span>
                </label>
                <input
                  type="email"
                  id="ALERT_EMAIL"
                  name="ALERT_EMAIL"
                  value={formData.ALERT_EMAIL}
                  onChange={handleChange}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                  onInvalid={(e) => {
                    // Forzar nuestro mensaje traducido en vez del nativo del navegador
                    e.currentTarget.setCustomValidity(tSettingsControl('invalidEmailFormat'));
                  }}
                  className="will-change-transform w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition"
                  placeholder={tSettingsControl('alertEmailPlaceholder')}
                />
              </div>

              {/* Discord Webhook URL */}
              <div>
                <label htmlFor="DISCORD_WEBHOOK_URL" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tSettingsControl('discordWebhookUrl')} <span className="text-amber-200 transition ease-in-out hover:text-amber-300 duration-300"> {tSettingsControl('neededForAlerts')}</span>
                </label>
                <input
                  type="url"
                  id="DISCORD_WEBHOOK_URL"
                  name="DISCORD_WEBHOOK_URL"
                  value={formData.DISCORD_WEBHOOK_URL}
                  onChange={handleChange}
                  className="will-change-transform w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition"
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>

              {/* Cancel and Save */}
              <div className="flex justify-end items-center space-x-3 pt-4">
                {showSuccess && (
                  <div className="pr-5 flex font-bold items-center text-green-600 dark:text-green-400">
                    <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-base">{tSettingsControl('saving')}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="will-change-transform px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-750 transition duration-300 ease-in hover:scale-105"
                >
                  {tSettingsControl('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="will-change-transform px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in hover:scale-105"
                >
                  {isLoading ? tSettingsControl('saving') : tSettingsControl('saveChanges')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;