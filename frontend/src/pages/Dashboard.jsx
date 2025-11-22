import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [salesByAdType, setSalesByAdType] = useState([]);
  const [salesByPayment, setSalesByPayment] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, trendRes, adTypeRes, paymentRes, leaderRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getRevenueTrend({ period: 'month', months: 6 }),
        analyticsAPI.getSalesByAdType(),
        analyticsAPI.getSalesByPaymentMethod(),
        isAdmin() ? analyticsAPI.getLeaderboard({ limit: 5 }) : Promise.resolve({ data: { leaderboard: [] } }),
      ]);

      setStats(dashboardRes.data.stats);
      setRevenueTrend(trendRes.data.data.reverse());
      setSalesByAdType(adTypeRes.data.data);
      setSalesByPayment(paymentRes.data.data);
      if (isAdmin()) {
        setLeaderboard(leaderRes.data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#dc2626', '#059669', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats?.revenue?.total?.toFixed(2) || '0.00'}`,
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Sales',
      value: stats?.sales?.total || '0',
      icon: ShoppingBagIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Approval',
      value: stats?.sales?.pending || '0',
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Total Clients',
      value: stats?.clients?.total || '0',
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your sales today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="card">
          <h3 className="card-header">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Ad Type */}
        <div className="card">
          <h3 className="card-header">Sales by Ad Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesByAdType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {salesByAdType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Methods Chart */}
      <div className="card">
        <h3 className="card-header">Sales by Payment Method</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesByPayment}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#dc2626" name="Revenue ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leaderboard (Admin Only) */}
      {isAdmin() && leaderboard.length > 0 && (
        <div className="card">
          <h3 className="card-header">Top Performers</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Journalist</th>
                  <th>Total Sales</th>
                  <th>Revenue</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-bold text-primary-600">#{index + 1}</span>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.total_sales}</td>
                    <td>${parseFloat(item.total_revenue).toFixed(2)}</td>
                    <td className="text-green-600 font-semibold">
                      ${parseFloat(item.total_commission).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Summary (Journalist) */}
      {!isAdmin() && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <p className="text-sm text-gray-600">Commissions Earned</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              ${stats?.commissions?.earned?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Commissions Paid</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ${stats?.commissions?.paid?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Balance</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">
              ${stats?.commissions?.unpaid?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
