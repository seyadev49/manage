import React from 'react';
import { Users } from 'lucide-react';
import { Tenant } from '../types';
import { TenantCard } from '../components/TenantCard';

interface ActiveTenantsTabProps {
  tenants: Tenant[];
  searchTerm: string;
  onTenantClick: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onTerminate: (tenant: Tenant) => void;
  onRenew: (tenant: Tenant) => void;
  onViewHistory: (tenant: Tenant) => void;
  onDelete: (id: number) => void;
}

export const ActiveTenantsTab: React.FC<ActiveTenantsTabProps> = ({
  tenants,
  searchTerm,
  onTenantClick,
  onEdit,
  onTerminate,
  onRenew,
  onViewHistory,
  onDelete,
}) => {
  const filteredTenants = tenants.filter(tenant => {
    const isActive = tenant.is_active !== 0 && !tenant.termination_date && tenant.status !== 'terminated';

    if (!isActive) return false;

    const matchesSearch =
      tenant.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.tenant_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.includes(searchTerm) ||
      tenant.city?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (filteredTenants.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No active tenants found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {searchTerm ? 'Try adjusting your search' : 'Add a new tenant to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          activeTab="active"
          openTenantModal={onTenantClick}
          handleEdit={onEdit}
          handleTerminate={onTerminate}
          handleRenew={onRenew}
          handleViewHistory={onViewHistory}
          handleDelete={onDelete}
        />
      ))}
    </div>
  );
};
