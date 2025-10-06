import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings as User, Building2, Bell, CreditCard as Edit2, Save, X, Crown, Calendar, CreditCard, RefreshCw } from 'lucide-react';
import UpgradeModal from '../components/UpgradeModal';
import RenewSubscriptionModal from '../components/RenewSubscriptionModal';
import UserManagementSection from '../components/UserManagementSection';

interface SubscriptionDetails {
  subscription_status: string;
  subscription_plan: string;
  subscription_price: number;
  billing_cycle: string;
  next_renewal_date: string;
  daysUntilRenewal: number;
  alreadyRenewed: boolean;
}

const Settings: React.FC = () => {
  const { user, token, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingOrganization, setIsEditingOrganization] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'users' | 'notifications'>('profile');
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [organizationData, setOrganizationData] = useState({
    organizationName: user?.organizationName || '',
    email: '',
    phone: '',
    address: ''
  });
  const [updateStatus, setUpdateStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [orgUpdateStatus, setOrgUpdateStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);

  // Check if current user is organization owner
  const isOrganizationOwner = user?.role === 'landlord';

  useEffect(() => {
    fetchSubscriptionDetails();
    fetchOrganizationData();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      setOrganizationData(prev => ({
        ...prev,
        organizationName: user.organizationName || ''
      }));
    }
  }, [user]);

  const fetchSubscriptionDetails = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/subscription/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionDetails(data.subscription);
      } else {
        console.log('Subscription details not available');
      }
    } catch (error) {
      console.log('Backend server not running or subscription service unavailable');
    }
  };

  const fetchOrganizationData = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/organization', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const org = data.organization;
        setOrganizationData({
          organizationName: org.name || '',
          email: org.email || '',
          phone: org.phone || '',
          address: org.address || ''
        });
      }
    } catch (error) {
      console.log('Failed to fetch organization data');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOrganizationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrganizationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUpdateStatus(null);

    // Validate password confirmation
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      setUpdateStatus({ type: 'error', message: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      const updateData: any = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await fetch('http://localhost:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        setUpdateStatus({ type: 'success', message: 'Profile updated successfully!' });
        setIsEditing(false);
        
        // Update user context with new data
        if (setUser && data.user) {
          setUser(data.user);
        }
        
        // Immediately sync form state with updated backend data
        setProfileData({
          fullName: data.user?.fullName || '',
          email: data.user?.email || '',
          phone: data.user?.phone || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => setUpdateStatus(null), 3000);
      } else {
        const data = await response.json();
        setUpdateStatus({ type: 'error', message: data.message || 'Update failed' });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setUpdateStatus({ type: 'error', message: 'Update failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgLoading(true);
    setOrgUpdateStatus(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/update-organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(organizationData),
      });

      if (response.ok) {
        const data = await response.json();
        setOrgUpdateStatus({ type: 'success', message: 'Organization updated successfully!' });
        setIsEditingOrganization(false);
        
        // Update user context with new organization name
        if (data.organization && user && setUser) {
          setUser({
            ...user,
            organizationName: data.organization.name || data.organization.organizationName
          });
        }
        
        // Immediately sync form state with updated backend data
        setOrganizationData({
          organizationName: data.organization?.name || data.organization?.organizationName || '',
          email: data.organization?.email || '',
          phone: data.organization?.phone || '',
          address: data.organization?.address || ''
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => setOrgUpdateStatus(null), 3000);
      } else {
        const data = await response.json();
        setOrgUpdateStatus({ type: 'error', message: data.message || 'Update failed' });
      }
    } catch (error) {
      console.error('Organization update error:', error);
      setOrgUpdateStatus({ type: 'error', message: 'Update failed. Please try again.' });
    } finally {
      setOrgLoading(false);
    }
  };

  const getPlanDisplayName = (planId: string) => {
    const plans = {
      basic: 'Basic Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan'
    };
    return plans[planId as keyof typeof plans] || planId;
  };

  const getPlanColor = (planId: string) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      enterprise: 'bg-gold-100 text-gold-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    };
    return colors[planId as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      trial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'organization', name: 'Organization', icon: Building2 },
    ...(isOrganizationOwner ? [{ id: 'users', name: 'User Management', icon: User }] : []),
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account and organization settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Update Status Message */}
      {updateStatus && (
        <div className={`p-4 rounded-lg ${
          updateStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-300' 
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-300'
        }`}>
          {updateStatus.message}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              {isEditing ? <X className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={profileData.fullName}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  isEditing ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  isEditing ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {isEditing && (
              <>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Change Password</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={profileData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={profileData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={profileData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Subscription Plan Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Crown className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Plan</h2>
          </div>

          {subscriptionDetails ? (
            <div className="space-y-4">
              {/* Current Plan */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Plan</span>
                <div className="flex items-center">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPlanColor(subscriptionDetails.subscription_plan)}`}>
                    {getPlanDisplayName(subscriptionDetails.subscription_plan)}
                  </span>
                  <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    Active Plan
                  </span>
                </div>
              </div>

              {/* Plan Price */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</span>
                <span className="text-sm text-gray-900 dark:text-white font-semibold">
                  ${subscriptionDetails.subscription_price}/{subscriptionDetails.billing_cycle === 'monthly' ? 'month' : subscriptionDetails.billing_cycle}
                </span>
              </div>

              {/* Billing Cycle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing Cycle</span>
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {subscriptionDetails.billing_cycle}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subscriptionDetails.subscription_status)}`}>
                  {subscriptionDetails.subscription_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Next Renewal or Trial Remaining */}
              {subscriptionDetails.subscription_status.toLowerCase() === 'trial' ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trial Period</span>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {subscriptionDetails.daysUntilRenewal > 0
                        ? `${subscriptionDetails.daysUntilRenewal} days remaining`
                        : 'Expired'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Next Renewal</span>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {new Date(subscriptionDetails.next_renewal_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Days Until Renewal */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Days Until Renewal</span>
                    <span className={`text-sm font-semibold ${
                      subscriptionDetails.daysUntilRenewal <= 7 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {subscriptionDetails.daysUntilRenewal} days
                    </span>
                  </div>
                </>
              )}

              {/* Action Buttons */}
<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
  <div className="space-y-2">
    {/* Show Renew button only for active/paid users when renewal is near or overdue */}
    {subscriptionDetails.subscription_status.toLowerCase() !== 'trial' && subscriptionDetails.daysUntilRenewal <= 30 && (
      <button
        onClick={() => {
          if (
            !subscriptionDetails.alreadyRenewed &&
            subscriptionDetails.daysUntilRenewal <= 7
          ) {
            setShowRenewModal(true);
          }
        }}
        disabled={
          subscriptionDetails.alreadyRenewed ||
          subscriptionDetails.daysUntilRenewal > 7
        }
        className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
          subscriptionDetails.alreadyRenewed || subscriptionDetails.daysUntilRenewal > 7
            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
            : subscriptionDetails.daysUntilRenewal <= 0
            ? 'bg-rose-500 hover:bg-rose-600 text-white'
            : 'bg-amber-500 hover:bg-amber-600 text-white'
        }`}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {subscriptionDetails.alreadyRenewed
          ? 'Renewed ✔'
          : subscriptionDetails.daysUntilRenewal <= 0
          ? 'Renew Now (Overdue)'
          : subscriptionDetails.daysUntilRenewal <= 7
          ? 'Renew Soon'
          : 'Early Renew'}
      </button>
    )}

    {/* Upgrade Button - Show for trial users or active users wanting to upgrade */}
    <button
      onClick={() => setShowUpgradeModal(true)}
      className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
        subscriptionDetails.subscription_status.toLowerCase() === 'trial'
          ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white'
          : subscriptionDetails.subscription_status === 'active'
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
          : 'bg-gray-400 text-gray-700 cursor-not-allowed'
      }`}
      disabled={subscriptionDetails.subscription_status !== 'active' && subscriptionDetails.subscription_status.toLowerCase() !== 'trial'}
    >
      {subscriptionDetails.subscription_status.toLowerCase() === 'trial' ? 'Upgrade to Paid Plan' : 'Upgrade Plan'}
    </button>
  </div>
</div>

            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading subscription details...</p>
            </div>
          )}
        </div>
        </div>
      )}

      {activeTab === 'organization' && (
          <>
        {/* Organization Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization</h2>
            </div>
            <button
              onClick={() => setIsEditingOrganization(!isEditingOrganization)}
              className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              {isEditingOrganization ? <X className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
              {isEditingOrganization ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Organization Update Status Message */}
          {orgUpdateStatus && (
            <div className={`mb-4 p-3 rounded-lg ${
              orgUpdateStatus.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-300' 
                : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-300'
            }`}>
              {orgUpdateStatus.message}
            </div>
          )}

          <form onSubmit={handleOrganizationUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Name</label>
              <input
                type="text"
                name="organizationName"
                value={organizationData.organizationName}
                onChange={handleOrganizationInputChange}
                readOnly={!isEditingOrganization}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  isEditingOrganization ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Email</label>
              <input
                type="email"
                name="email"
                value={organizationData.email}
                onChange={handleOrganizationInputChange}
                readOnly={!isEditingOrganization}
                placeholder="Organization email"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  isEditingOrganization ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Phone</label>
              <input
                type="tel"
                name="phone"
                value={organizationData.phone}
                onChange={handleOrganizationInputChange}
                readOnly={!isEditingOrganization}
                placeholder="Organization phone"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  isEditingOrganization ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={organizationData.address}
                onChange={handleOrganizationInputChange}
                readOnly={!isEditingOrganization}
                placeholder="Organization address"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  isEditingOrganization ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
            </div>

            {isEditingOrganization && (
              <button
                type="submit"
                disabled={orgLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <Save className="h-4 w-4 mr-2" />
                {orgLoading ? 'Updating...' : 'Save Changes'}
              </button>
            )}
          </form>
        </div>
        </>
      )}

      {/* User Management Tab - Only for organization owners */}
      {activeTab === 'users' && isOrganizationOwner && (
        <UserManagementSection />
      )}

      {activeTab === 'notifications' && (
        <>
        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Rent Due Reminders</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Contract Expiry Alerts</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Maintenance Updates</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
        </div>
        </>
      )}

      {/* Trial Upgrade Section */}
      {user?.subscriptionStatus === 'trial' && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Upgrade Your Plan</h3>
              <p className="text-blue-100 mb-4">
                Your trial expires on {new Date(user.trialEndDate).toLocaleDateString()}. 
                Upgrade now to continue using all features.
              </p>
            </div>
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      {/* Renew Subscription Modal */}
      <RenewSubscriptionModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        subscriptionDetails={subscriptionDetails}
        onRenewSuccess={() => {
          setShowRenewModal(false);
          fetchSubscriptionDetails();
        }}
      />
    </div>
  );
};

export default Settings;