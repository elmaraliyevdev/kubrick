import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import type { UserRole } from "@/types/auth";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface OrganizationFormData {
  name: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

function roleLabel(role: UserRole): string {
  return role === "admin" ? "Admin" : "Recruiter";
}

export default function SettingsOrganization() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const isAdmin = user?.role === "admin";

  const loadTeam = useCallback(() => {
    api
      .get("/organizations/me/users")
      .then((res) => {
        const members: TeamMember[] = res.data.map(
          (u: { id: number; first_name: string | null; last_name: string | null; email: string; role: UserRole; is_active: boolean }) => ({
            id: u.id,
            name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
          })
        );
        setTeamMembers(members);
      })
      .catch(() => {
        // user may not have an org yet
      });
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<OrganizationFormData>({
    defaultValues: {
      name: user?.organization?.name || "",
    },
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    try {
      await api.put("/organizations/me", { name: data.name });
      toast.success("Organization name updated.");
    } catch {
      toast.error("Failed to update organization.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/organizations/me/invite", null, { params: { email: inviteEmail } });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const patchMember = async (memberId: number, body: { role?: UserRole; is_active?: boolean }) => {
    setIsLoading(true);
    try {
      await api.patch(`/organizations/me/users/${memberId}`, body);
      toast.success("Team member updated.");
      loadTeam();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update team member");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-medium text-gray-900">Organization Settings</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Organization Name</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <input
              id="name"
              disabled={!isAdmin}
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              {...register("name", { required: "Organization name is required" })}
            />
            {errors.name?.message && <p className="text-sm text-red-500">{errors.name.message}</p>}
            {!isAdmin && (
              <p className="text-xs text-gray-500">Only admins can change the organization name.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isDirty || !isAdmin}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Team Members</h2>

        {teamMembers.length > 0 ? (
          <div className="space-y-3 mb-6">
            {teamMembers.map((member) => {
              const isSelf = user?.id === member.id;
              return (
                <div
                  key={member.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-gray-100 last:border-0 ${!member.is_active ? "opacity-60" : ""}`}
                >
                  <div>
                    <p className="text-sm text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    {!member.is_active && <p className="text-xs text-amber-700 mt-1">Inactive</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin ? (
                      <>
                        <select
                          value={member.role}
                          disabled={isSelf || isLoading}
                          onChange={(e) => {
                            const role = e.target.value as UserRole;
                            void patchMember(member.id, { role });
                          }}
                          className="border border-gray-200 rounded-md h-9 px-2 text-sm bg-white disabled:opacity-50"
                        >
                          <option value="admin">Admin</option>
                          <option value="recruiter">Recruiter</option>
                        </select>
                        {member.is_active ? (
                          <button
                            type="button"
                            disabled={isSelf || isLoading}
                            onClick={() => void patchMember(member.id, { is_active: false })}
                            className="text-sm text-red-700 border border-red-200 rounded-md h-9 px-3 hover:bg-red-50 disabled:opacity-40"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => void patchMember(member.id, { is_active: true })}
                            className="text-sm text-gray-800 border border-gray-200 rounded-md h-9 px-3 hover:bg-gray-50 disabled:opacity-40"
                          >
                            Activate
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                        {roleLabel(member.role)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">No team members found.</p>
        )}

        <h3 className="text-sm font-medium text-gray-900 mb-3">Invite Member</h3>
        {isAdmin ? (
          <div className="flex gap-2 max-w-md">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => void handleInviteMember()}
              disabled={isLoading}
              className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Only admins can invite new members.</p>
        )}
      </div>
    </div>
  );
}
