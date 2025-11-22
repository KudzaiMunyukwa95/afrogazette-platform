import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const Settings = () => {
  const [settings, setSettings] = useState({
    company_name: '',
    company_address: '',
    default_commission_rate: '',
    invoice_prefix: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsAPI.bulkUpdate(settings);
      alert('Settings updated successfully');
    } catch (error) {
      alert('Error updating settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="space-y-4">
              <Input label="Company Name" value={settings.company_name || ''} onChange={(e) => setSettings({...settings, company_name: e.target.value})} />
              <Input label="Company Address" value={settings.company_address || ''} onChange={(e) => setSettings({...settings, company_address: e.target.value})} />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Default Commission Rate (%)" type="number" step="0.01" value={settings.default_commission_rate || ''} onChange={(e) => setSettings({...settings, default_commission_rate: e.target.value})} />
              <Input label="Invoice Prefix" value={settings.invoice_prefix || ''} onChange={(e) => setSettings({...settings, invoice_prefix: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button type="submit" variant="primary" loading={loading}>
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
