import { Settings } from 'lucide-react';
import { UserProfile } from './UserProfile';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings size={32} className="text-blue-600" />
          Settings
        </h1>
        <p className="mt-1 text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* User Profile Component */}
      <UserProfile />
    </div>
  );
}