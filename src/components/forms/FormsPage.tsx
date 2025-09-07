import {
  AlertCircle,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Loader,
  MoreVertical,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import FormsService, { FormListParams } from '../../services/forms';
import { Form } from '../../types';
import { FormDetail } from './FormDetail';
import { FormEdit } from './FormEdit';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

export function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [detailForm, setDetailForm] = useState<Form | null>(null);
  const [showFormEdit, setShowFormEdit] = useState(false);
  const [editForm, setEditForm] = useState<Form | null>(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalForms: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Fetch forms from backend
  const fetchForms = async (params: FormListParams = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await FormsService.getForms({
        page: pagination.currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter as 'active' | 'inactive',
        ...params
      });
      
      setForms(response.forms);
      setPagination(response.pagination);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load forms on component mount and when filters change
  useEffect(() => {
    fetchForms({ page: 1 });
  }, [searchTerm, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.relative')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleFormClick = (form: Form) => {
    setDetailForm(form);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setDetailForm(null);
  };

  const handleCreateForm = () => {
    setEditForm(null);
    setShowFormEdit(true);
  };

  const handleEditForm = (form: Form) => {
    setEditForm(form);
    setShowFormEdit(true);
  };



  const handleFormSaved = () => {
    // Refresh the forms list
    fetchForms({ page: pagination.currentPage });
    setShowFormEdit(false);
    setEditForm(null);
  };

  const toggleFormStatus = async (formId: string) => {
    try {
      await FormsService.toggleFormStatus(formId);
      // Refresh the forms list
      fetchForms({ page: pagination.currentPage });
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    }
  };

  const duplicateForm = async (form: Form) => {
    try {
      await FormsService.duplicateForm(form.id);
      // Refresh the forms list
      fetchForms({ page: pagination.currentPage });
      setOpenDropdown(null);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    }
  };

  const deleteForm = (form: Form) => {
    setFormToDelete(form);
    setShowDeleteConfirm(true);
    setOpenDropdown(null);
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete) return;

    try {
      setIsDeleting(true);
      await FormsService.deleteForm(formToDelete.id);
      // Refresh the forms list
      fetchForms({ page: pagination.currentPage });
      setShowDeleteConfirm(false);
      setFormToDelete(null);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setFormToDelete(null);
  };

  const handleDropdownAction = (action: string, form: Form) => {
    switch (action) {
      case 'edit':
        handleEditForm(form);
        break;
      case 'delete':
        deleteForm(form);
        break;
      case 'toggle':
        toggleFormStatus(form.id);
        break;
      case 'duplicate':
        duplicateForm(form);
        break;
      default:
        break;
    }
    setOpenDropdown(null);
  };

  const filteredForms = forms; // Forms are already filtered by the backend

  // Show detail view if in detail mode
  if (viewMode === 'detail' && detailForm) {
    return (
      <FormDetail
        form={detailForm}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Forms</h1>
          {pagination.totalForms > 0 && (
            <p className="text-gray-600 mt-1">
              {pagination.totalForms} form{pagination.totalForms !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <button 
          onClick={handleCreateForm}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={20} className="mr-2" />
          New Form
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={() => fetchForms({ page: pagination.currentPage })}
            className="ml-auto text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by form name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Created by</option>
            <option value="me">Me</option>
            <option value="others">Others</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="relevance">Relevance</option>
            <option value="name">Name</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
          </select>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading forms...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responses</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created at</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated at</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created by</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleFormClick(form)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{form.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        form.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {form.submission_count || 0}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {form.updated_at ? new Date(form.updated_at).toLocaleDateString() : 'N/A'}
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Admin User
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === form.id ? null : form.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          title="More actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openDropdown === form.id && (
                          <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDropdownAction('edit', form);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit size={14} />
                              Edit Form
                            </button>
                            <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDropdownAction('toggle', form);
                               }}
                               className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                             >
                               {form.is_active ? (
                                 <>
                                   <EyeOff size={14} />
                                   Deactivate
                                 </>
                               ) : (
                                 <>
                                   <Eye size={14} />
                                   Activate
                                 </>
                               )}
                             </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDropdownAction('duplicate', form);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy size={14} />
                              Duplicate
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDropdownAction('delete', form);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete Form
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && filteredForms.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No forms found' : 'No forms yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search criteria or create a new form.'
              : 'Get started by creating your first form.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button 
              onClick={handleCreateForm}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} className="mr-2" />
              Create Your First Form
            </button>
          )}
        </div>
      )}

      {/* Form Edit Modal */}
      {showFormEdit && (
        <FormEdit
          form={editForm}
          onClose={() => {
            setShowFormEdit(false);
            setEditForm(null);
          }}
          onSave={handleFormSaved}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Form"
        message={`Are you sure you want to delete "${formToDelete?.title}"? This action cannot be undone and all associated submissions will be permanently lost.`}
        confirmText="Delete Form"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}