import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface OrganizationFormData {
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsOrganization() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    api.get('/organizations/me/users')
      .then((res) => {
        const members: TeamMember[] = res.data.map((u: any) => ({
          id: String(u.id),
          name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
          email: u.email,
          role: 'Member',
        }));
        setTeamMembers(members);
      })
      .catch(() => {
        // Silently fail -- user may not have an org yet
      });
  }, []);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<OrganizationFormData>({
    defaultValues: {
      name: user?.organization?.name || '',
    }
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);

    try {
      await api.put('/organizations/me', { name: data.name });
      toast.success('Organization name updated.');
    } catch (error) {
      toast.error('Failed to update organization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/organizations/me/invite', null, { params: { email: inviteEmail } });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-medium text-gray-900">Organization Settings</h1>

      {/* Organization name */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Organization Name</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <input
              id="name"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('name', { required: 'Organization name is required' })}
            />
            {errors.name?.message && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isDirty}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* Team members */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Team Members</h2>

        {teamMembers.length > 0 ? (
          <div className="space-y-3 mb-6">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">No team members found.</p>
        )}

        <h3 className="text-sm font-medium text-gray-900 mb-3">Invite Member</h3>
        <div className="flex gap-2 max-w-md">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleInviteMember}
            disabled={isLoading}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}
