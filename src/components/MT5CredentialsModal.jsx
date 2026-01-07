import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Server, Key, User } from 'lucide-react';
import { InputField, GradientButton, StatusMessage } from './index';

const MT5CredentialsModal = ({ isOpen, onClose, onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    brokerServer: '',
    accountPassword: '',
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      mt5AccountNumber: parseInt(formData.accountNumber),
      mt5AccountName: formData.accountName,
      mt5BrokerServer: formData.brokerServer,
      mt5AccountPassword: formData.accountPassword,
    });
  };

  const isFormValid =
    formData.accountNumber &&
    formData.accountName &&
    formData.brokerServer &&
    formData.accountPassword;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-xl mb-3">
                <Shield className="text-primary-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">MT5 Account Setup</h2>
              <p className="text-gray-500 text-sm">
                Connect your MetaTrader 5 account to continue
              </p>
            </div>

            {error && (
              <div className="mb-4">
                <StatusMessage type="error" message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="Account Number"
                type="number"
                name="accountNumber"
                placeholder="12345678"
                value={formData.accountNumber}
                onChange={handleChange('accountNumber')}
                icon={User}
                required
                disabled={isLoading}
              />

              <InputField
                label="Account Name"
                type="text"
                name="accountName"
                placeholder="My Trading Account"
                value={formData.accountName}
                onChange={handleChange('accountName')}
                icon={User}
                required
                disabled={isLoading}
              />

              <div>
                <InputField
                  label="Broker Server"
                  type="text"
                  name="brokerServer"
                  placeholder="ICMarketsSC-Demo"
                  value={formData.brokerServer}
                  onChange={handleChange('brokerServer')}
                  icon={Server}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  Example: ICMarketsSC-Demo, MetaQuotes-Demo
                </p>
              </div>

              <InputField
                label="MT5 Password"
                type="password"
                name="accountPassword"
                placeholder="Your MT5 password"
                value={formData.accountPassword}
                onChange={handleChange('accountPassword')}
                icon={Key}
                required
                disabled={isLoading}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  We'll verify these credentials with MetaTrader 5 before completing your
                  registration. Your credentials are encrypted and secure.
                </p>
              </div>

              <div className="pt-2">
                <GradientButton
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  loading={isLoading}
                >
                  {isLoading ? 'Validating MT5 Credentials...' : 'Submit & Validate'}
                </GradientButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MT5CredentialsModal;
