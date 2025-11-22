import React, { useState, useEffect } from 'react';
import { clientsAPI } from '../services/api';
import Button from '../components/common/Button';
import Input, { Textarea } from '../components/common/Input';
import Modal, { ConfirmModal } from '../components/common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    contact_person: '',
    phone_number: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll(search);
      setClients(response.data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, formData);
      } else {
        await clientsAPI.create(formData);
      }
      setShowModal(false);
      fetchClients();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'An error occurred');
    }
  };

  const handleDelete = async () => {
    try {
      await clientsAPI.delete(deletingClient.id);
      setShowDeleteModal(false);
      fetchClients();
    } catch (error) {
      alert(error.response?.data?.error || 'Cannot delete client');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      contact_person: '',
      phone_number: '',
      email: '',
      address: '',
    });
    setEditingClient(null);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_name,
      contact_person: client.contact_person || '',
      phone_number: client.phone_number,
      email: client.email || '',
      address: client.address || '',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <Button icon={<PlusIcon className="w-5 h-5" />} onClick={() => setShowModal(true)}>
          Add Client
        </Button>
      </div>

      <div className="card">
        <div className="mb-4">
          <Input
            placeholder="Search clients by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Total Sales</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-medium">{client.client_name}</td>
                  <td>{client.contact_person || 'N/A'}</td>
                  <td>{client.phone_number}</td>
                  <td>{client.email || 'N/A'}</td>
                  <td>
                    <span className="text-sm">
                      {client.total_sales} sales (${parseFloat(client.total_revenue || 0).toFixed(2)})
                    </span>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button onClick={() => openEditModal(client)} className="text-blue-600 hover:text-blue-800">
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => { setDeletingClient(client); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-800">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingClient ? 'Edit Client' : 'Add New Client'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Client Name" name="client_name" value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} required />
          <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Number" name="phone_number" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} required />
            <Input label="Email" type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <Textarea label="Address" name="address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows={3} />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" variant="primary">{editingClient ? 'Update' : 'Create'} Client</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Delete Client" message={`Are you sure you want to delete ${deletingClient?.client_name}?`} />
    </div>
  );
};

export default Clients;
