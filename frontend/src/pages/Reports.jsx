import React, { useState, useEffect } from 'react';
import { analyticsAPI, commissionPaymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const [commissionSummary, setCommissionSummary] = useState(null);

  useEffect(() => {
    fetchCommissionSummary();
  }, []);

  const fetchCommissionSummary = async () => {
    try {
      const journalistId = isAdmin() ? null : user.id;
      if (!isAdmin()) {
        const response = await commissionPaymentsAPI.getJournalistSummary(user.id);
        setCommissionSummary(response.data);
      }
    } catch (error) {
      console.error('Error fetching commission summary:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await analyticsAPI.exportSales();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales-export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error exporting data');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin() ? 'Reports & Analytics' : 'My Commissions'}
        </h1>
        {isAdmin() && (
          <Button icon={<ArrowDownTrayIcon className="w-5 h-5" />} onClick={handleExport}>
            Export Sales Data
          </Button>
        )}
      </div>

      {!isAdmin() && commissionSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <p className="text-sm text-gray-600">Total Earned</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${commissionSummary.summary.total_earned.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ${commissionSummary.summary.total_paid.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Balance Due</p>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              ${commissionSummary.summary.balance.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {!isAdmin() && commissionSummary?.recent_payments?.length > 0 && (
        <div className="card">
          <h3 className="card-header">Recent Commission Payments</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {commissionSummary.recent_payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td className="font-semibold text-green-600">${parseFloat(payment.amount).toFixed(2)}</td>
                    <td>{payment.payment_method || 'N/A'}</td>
                    <td className="font-mono text-sm">{payment.reference_number || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
