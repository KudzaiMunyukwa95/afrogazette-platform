import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import Button from '../components/common/Button';
import Input, { Select } from '../components/common/Input';
import Modal, { ConfirmModal } from '../components/common/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone_number: '',
    role: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, formData);
      } else {
        await usersAPI.create(formData);
      }
      setShowModal(false);
      fetchUsers();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'An error occurred');
    }
  };

  const handleDelete = async () => {
    try {
      await usersAPI.delete(deletingUser.id);
      setShowDeleteModal(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Cannot delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone_number: '',
      role: '',
    });
    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      phone_number: user.phone_number || '',
      role: user.role,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Button icon={<PlusIcon className="w-5 h-5" />} onClick={() => setShowModal(true)}>
          Add User
        </Button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone_number || 'N/A'}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-rejected'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800">
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => { setDeletingUser(user); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-800">
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

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingUser ? 'Edit User' : 'Add New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" name="first_name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            <Input label="Last Name" name="last_name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
          </div>
          <Input label="Email" type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          {!editingUser && <Input label="Password" type="password" name="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />}
          <Input label="Phone Number" name="phone_number" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
          <Select label="Role" name="role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} options={[{value: 'admin', label: 'Admin'}, {value: 'journalist', label: 'Journalist'}]} required />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" variant="primary">{editingUser ? 'Update' : 'Create'} User</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Delete User" message={`Are you sure you want to permanently delete ${deletingUser?.first_name} ${deletingUser?.last_name}? This action cannot be undone.`} />
    </div>
  );
};

export default Users;
