import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus } from 'lucide-react';
import { Tenant } from './types';
import { TenantFormModal } from './components/TenantFormModal';
import { TerminateTenantModal } from './components/TerminateTenantModal';
import { TenantDetailsModal } from './components/TenantDetailsModal';
import { RenewContractModal } from './components/RenewContractModal';
import { ContractHistoryModal } from './components/ContractHistoryModal';
import { ActiveTenantsTab } from './tabs/ActiveTenantsTab';
import { TerminatedTenantsTab } from './tabs/TerminatedTenantsTab';
import { useApiWithLimitCheck } from '../../hooks/useApiWithLimitCheck';
import toast from 'react-hot-toast';

const TenantsPage: React.FC = () => {
  const { token } = useAuth();
  const { apiCall } = useApiWithLimitCheck();
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [terminatingTenant, setTerminatingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [renewingTenant, setRenewingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'terminated'>('active');
  const [formData, setFormData] = useState({
    tenantId: '',
    fullName: '',
    sex: 'Male' as const,
    phone: '',
    city: '',
    subcity: '',
    woreda: '',
    houseNo: '',
    organization: '',
    hasAgent: false,
    agentFullName: '',
    agentSex: 'Male' as const,
    agentPhone: '',
    agentCity: '',
    agentSubcity: '',
    agentWoreda: '',
    agentHouseNo: '',
    authenticationNo: '',
    authenticationDate: '',
  });
  const [terminationFormData, setTerminationFormData] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: '',
    securityDepositAction: 'return_full',
    partialReturnAmount: '',
    deductions: [] as Array<{ description: string; amount: number }>,
    notes: '',
  });
  const [renewalFormData, setRenewalFormData] = useState({
    newEndDate: '',
    monthlyRent: '',
    deposit: '',
    leaseDuration: '12',
    notes: '',
  });

  const fetchTenants = useCallback(async () => {
    try {
      const response = await apiCall(
        () => fetch('http://localhost:5000/api/tenants', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        'tenants'
      );
      if (response && response.tenants) {
        setAllTenants(response.tenants);
      } else {
        setAllTenants([]);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('❌ Failed to load tenants');
      setAllTenants([]);
    }
  }, [token, apiCall]);

  useEffect(() => {
    setLoading(true);
    fetchTenants()
      .finally(() => setLoading(false));
  }, [fetchTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = editingTenant
        ? `http://localhost:5000/api/tenants/${editingTenant.id}`
        : 'http://localhost:5000/api/tenants';
      const method = editingTenant ? 'PUT' : 'POST';
      const response = await apiCall(
        () => fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }),
        'tenants'
      );
      if (response && (response.tenant || response.message?.includes("successfully"))) {
        toast.success(editingTenant ? '✅ Tenant updated successfully!' : '✅ Tenant added successfully!');
        setShowAddModal(false);
        setEditingTenant(null);
        resetForm();
        fetchTenants();
      } else {
        throw new Error(response?.message || 'Failed to save tenant');
      }
    } catch (error: any) {
      console.error('Failed to save tenant:', error);
      toast.error('❌ ' + (error.message || 'Failed to save tenant'));
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tenantId: '',
      fullName: '',
      sex: 'Male',
      phone: '',
      city: '',
      subcity: '',
      woreda: '',
      houseNo: '',
      organization: '',
      hasAgent: false,
      agentFullName: '',
      agentSex: 'Male',
      agentPhone: '',
      agentCity: '',
      agentSubcity: '',
      agentWoreda: '',
      agentHouseNo: '',
      authenticationNo: '',
      authenticationDate: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      tenantId: tenant.tenant_id || '',
      fullName: tenant.full_name || '',
      sex: tenant.sex || 'Male',
      phone: tenant.phone || '',
      city: tenant.city || '',
      subcity: tenant.subcity || '',
      woreda: tenant.woreda || '',
      houseNo: tenant.house_no || '',
      organization: tenant.organization || '',
      hasAgent: tenant.has_agent || false,
      agentFullName: tenant.agent_full_name || '',
      agentSex: tenant.agent_sex || 'Male',
      agentPhone: tenant.agent_phone || '',
      agentCity: tenant.agent_city || '',
      agentSubcity: tenant.agent_subcity || '',
      agentWoreda: tenant.agent_woreda || '',
      agentHouseNo: tenant.agent_house_no || '',
      authenticationNo: tenant.authentication_no || '',
      authenticationDate: tenant.authentication_date || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      setFormLoading(true);
      try {
        const response = await apiCall(
          () => fetch(`http://localhost:5000/api/tenants/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }),
          'tenants'
        );
        if (response && (response.success || response.message?.includes("successfully"))) {
          toast.success('✅ Tenant deleted successfully!');
          fetchTenants();
        } else {
          throw new Error(response?.message || 'Failed to delete tenant');
        }
      } catch (error: any) {
        console.error('Failed to delete tenant:', error);
        toast.error('❌ ' + (error.message || 'Failed to delete tenant'));
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleTerminate = (tenant: Tenant) => {
    setTerminatingTenant(tenant);
    setShowTerminateModal(true);
  };

  const handleRenew = (tenant: Tenant) => {
    setRenewingTenant(tenant);
    setRenewalFormData({
      newEndDate: '',
      monthlyRent: tenant.monthly_rent?.toString() || '',
      deposit: '',
      leaseDuration: '12',
      notes: '',
    });
    setShowRenewModal(true);
  };

  const handleViewHistory = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowHistoryModal(true);
  };

  const handleTerminationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminatingTenant) return;
    setFormLoading(true);
    try {
      const response = await apiCall(
        () => fetch(`http://localhost:5000/api/tenants/${terminatingTenant.id}/terminate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(terminationFormData),
        }),
        'tenants'
      );
      if (response && (response.tenant || response.message?.includes("successfully"))) {
        toast.success('✅ Tenant terminated successfully!');
        setShowTerminateModal(false);
        setTerminatingTenant(null);
        resetTerminationForm();
        fetchTenants();
      } else {
        throw new Error(response?.message || 'Failed to terminate tenant');
      }
    } catch (error: any) {
      console.error('Failed to terminate tenant:', error);
      toast.error('❌ ' + (error.message || 'Failed to terminate tenant'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingTenant) return;
    setFormLoading(true);
    try {
      const response = await apiCall(
        () => fetch(`http://localhost:5000/api/tenants/${renewingTenant.id}/renew`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(renewalFormData),
        }),
        'tenants'
      );
      if (response && (response.renewalDetails || response.message?.includes("successfully"))) {
        toast.success('✅ Contract renewed successfully!');
        setShowRenewModal(false);
        setRenewingTenant(null);
        resetRenewalForm();
        fetchTenants();
      } else {
        throw new Error(response?.message || 'Failed to renew contract');
      }
    } catch (error: any) {
      console.error('Failed to renew contract:', error);
      toast.error('❌ ' + (error.message || 'Failed to renew contract'));
    } finally {
      setFormLoading(false);
    }
  };

  const resetTerminationForm = () => {
    setTerminationFormData({
      terminationDate: new Date().toISOString().split('T')[0],
      terminationReason: '',
      securityDepositAction: 'return_full',
      partialReturnAmount: '',
      deductions: [],
      notes: '',
    });
  };

  const resetRenewalForm = () => {
    setRenewalFormData({
      newEndDate: '',
      monthlyRent: '',
      deposit: '',
      leaseDuration: '12',
      notes: '',
    });
  };

  const addDeduction = () => {
    setTerminationFormData({
      ...terminationFormData,
      deductions: [...terminationFormData.deductions, { description: '', amount: 0 }],
    });
  };

  const removeDeduction = (index: number) => {
    setTerminationFormData({
      ...terminationFormData,
      deductions: terminationFormData.deductions.filter((_, i) => i !== index),
    });
  };

  const updateDeduction = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updatedDeductions = [...terminationFormData.deductions];
    updatedDeductions[index] = { ...updatedDeductions[index], [field]: value };
    setTerminationFormData({ ...terminationFormData, deductions: updatedDeductions });
  };

  const openTenantModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowTenantModal(true);
  };

  const activeCount = allTenants.filter(tenant =>
    tenant.is_active !== 0 && !tenant.termination_date && tenant.status !== 'terminated'
  ).length;

  const terminatedCount = allTenants.filter(tenant =>
    tenant.is_active === 0 || tenant.termination_date || tenant.status === 'terminated'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tenants</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your tenant information</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 w-full sm:w-64"
          />
          <button
            onClick={() => {
              setShowAddModal(true);
              setEditingTenant(null);
            }}
            disabled={formLoading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 dark:bg-blue-700 dark:hover:bg-blue-600 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Tenant
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Active Tenants ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('terminated')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'terminated'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Terminated Tenants ({terminatedCount})
          </button>
        </nav>
      </div>

      {activeTab === 'active' ? (
        <ActiveTenantsTab
          tenants={allTenants}
          searchTerm={searchTerm}
          onTenantClick={openTenantModal}
          onEdit={handleEdit}
          onTerminate={handleTerminate}
          onRenew={handleRenew}
          onViewHistory={handleViewHistory}
          onDelete={handleDelete}
        />
      ) : (
        <TerminatedTenantsTab
          tenants={allTenants}
          searchTerm={searchTerm}
          onTenantClick={openTenantModal}
          onEdit={handleEdit}
          onViewHistory={handleViewHistory}
          onDelete={handleDelete}
        />
      )}

      <TenantDetailsModal
        show={showTenantModal}
        activeTab={activeTab}
        tenant={selectedTenant}
        onClose={() => {
          setShowTenantModal(false);
          setSelectedTenant(null);
        }}
        onEdit={handleEdit}
        onTerminate={handleTerminate}
        onDelete={handleDelete}
        onRenew={handleRenew}
        onViewHistory={handleViewHistory}
      />
      <TerminateTenantModal
        isOpen={showTerminateModal}
        onClose={() => {
          setShowTerminateModal(false);
          setTerminatingTenant(null);
          resetTerminationForm();
        }}
        onSubmit={handleTerminationSubmit}
        formData={terminationFormData}
        onFormChange={(data) => setTerminationFormData(prev => ({ ...prev, ...data }))}
        onAddDeduction={addDeduction}
        onRemoveDeduction={removeDeduction}
        onUpdateDeduction={updateDeduction}
        tenantName={terminatingTenant?.full_name || ''}
        tenantId={terminatingTenant?.id}
        token={token}
        isLoading={formLoading}
      />
      <TenantFormModal
        show={showAddModal}
        editingTenant={editingTenant}
        formData={formData}
        onClose={() => {
          setShowAddModal(false);
          setEditingTenant(null);
          resetForm();
        }}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
        isLoading={formLoading}
      />
      <RenewContractModal
        isOpen={showRenewModal}
        onClose={() => {
          setShowRenewModal(false);
          setRenewingTenant(null);
          resetRenewalForm();
        }}
        onSubmit={handleRenewalSubmit}
        formData={renewalFormData}
        onFormChange={(data) => setRenewalFormData(prev => ({ ...prev, ...data }))}
        tenantName={renewingTenant?.full_name || ''}
        tenantId={renewingTenant?.id}
        token={token}
        isLoading={formLoading}
      />
      <ContractHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedTenant(null);
        }}
        tenantId={selectedTenant?.id}
        tenantName={selectedTenant?.full_name || ''}
        token={token}
      />
    </div>
  );
};

export default TenantsPage;