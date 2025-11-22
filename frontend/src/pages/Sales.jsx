import React, { useState, useEffect } from 'react';
import { salesAPI, clientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input, { Select, Textarea } from '../components/common/Input';
import Modal, { ConfirmModal } from '../components/common/Modal';
import { PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Sales = () => {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0],
    ad_type: '',
    description: '',
    proof_of_payment: null,
  });

  useEffect(() => {
    fetchSales();
    fetchClients();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await salesAPI.getAll();
      setSales(response.data.sales);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && key !== 'proof_of_payment') {
          formPayload.append(key, formData[key]);
        }
      });
      if (formData.proof_of_payment) {
        formPayload.append('proof_of_payment', formData.proof_of_payment);
      }
      await salesAPI.create(formPayload);
      setShowModal(false);
      fetchSales();
      resetForm();
      alert('Sale created and submitted for approval');
    } catch (error) {
      alert(error.response?.data?.error || 'An error occurred');
    }
  };

  const handleApprove = async () => {
    try {
      await salesAPI.approve(selectedSale.id);
      setShowApproveModal(false);
      fetchSales();
      alert('Sale approved successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'An error occurred');
    }
  };

  const handleReject = async () => {
    try {
      await salesAPI.reject(selectedSale.id, rejectionReason);
      setShowRejectModal(false);
      fetchSales();
      setRejectionReason('');
      alert('Sale rejected');
    } catch (error) {
      alert(error.response?.data?.error || 'An error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      amount: '',
      payment_method: '',
      payment_date: new Date().toISOString().split('T')[0],
      ad_type: '',
      description: '',
      proof_of_payment: null,
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    };
    return badges[status] || 'badge-info';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
        <Button icon={<PlusIcon className="w-5 h-5" />} onClick={() => setShowModal(true)}>
          Add Sale
        </Button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Ad Type</th>
                <th>Commission</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.payment_date).toLocaleDateString()}</td>
                  <td>{sale.client_name}</td>
                  <td className="font-semibold">${parseFloat(sale.amount).toFixed(2)}</td>
                  <td>{sale.payment_method}</td>
                  <td>{sale.ad_type}</td>
                  <td className="text-green-600">${parseFloat(sale.commission_amount).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(sale.status)}`}>
                      {sale.status}
                    </span>
                  </td>
                  <td>
                    {isAdmin() && sale.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button onClick={() => { setSelectedSale(sale); setShowApproveModal(true); }} className="text-green-600 hover:text-green-800">
                          <CheckIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setSelectedSale(sale); setShowRejectModal(true); }} className="text-red-600 hover:text-red-800">
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Add New Sale" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Client" name="client_id" value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} options={clients.map(c => ({value: c.id, label: c.client_name}))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount" type="number" step="0.01" name="amount" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
            <Input label="Payment Date" type="date" name="payment_date" value={formData.payment_date} onChange={(e) => setFormData({...formData, payment_date: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Method" name="payment_method" value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} options={[{value: 'Cash', label: 'Cash'}, {value: 'Ecocash', label: 'Ecocash'}, {value: 'InnBucks', label: 'InnBucks'}, {value: 'Omari', label: 'Omari'}, {value: 'Bank Transfer', label: 'Bank Transfer'}]} required />
            <Select label="Ad Type" name="ad_type" value={formData.ad_type} onChange={(e) => setFormData({...formData, ad_type: e.target.value})} options={[{value: 'WhatsApp Channel', label: 'WhatsApp Channel'}, {value: 'WhatsApp Group', label: 'WhatsApp Group'}, {value: 'Print', label: 'Print'}, {value: 'Radio', label: 'Radio'}, {value: 'TV', label: 'TV'}, {value: 'Digital Banner', label: 'Digital Banner'}]} required />
          </div>
          <Textarea label="Description" name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
          <div>
            <label className="form-label">Proof of Payment</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFormData({...formData, proof_of_payment: e.target.files[0]})} className="form-input" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" variant="primary">Create Sale</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} onConfirm={handleApprove} title="Approve Sale" message={`Approve sale of $${selectedSale?.amount}?`} confirmText="Approve" variant="success" />

      <Modal isOpen={showRejectModal} onClose={() => { setShowRejectModal(false); setRejectionReason(''); }} title="Reject Sale" size="md">
        <div className="space-y-4">
          <Textarea label="Rejection Reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} required />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Reject Sale</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Sales;
