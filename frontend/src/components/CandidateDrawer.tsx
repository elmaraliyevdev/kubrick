import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCreateCandidate, useUpdateCandidate } from "@/hooks/useCandidates";
import type { CandidateCreate, CandidateListItem, CandidateUpdate } from "@/types/candidate";
import React, { useEffect, useState } from "react";

interface CandidateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: CandidateListItem | null;
  mode: "create" | "edit";
}

export function CandidateDrawer({ open, onOpenChange, candidate, mode }: CandidateDrawerProps) {
  const [formData, setFormData] = useState<CandidateCreate>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    location: "",
    linkedin_url: "",
    portfolio_url: "",
    notes: "",
  });

  const createCandidateMutation = useCreateCandidate();
  const updateCandidateMutation = useUpdateCandidate();

  useEffect(() => {
    if (mode === "edit" && candidate) {
      setFormData({
        first_name: candidate.first_name || "",
        last_name: candidate.last_name || "",
        email: candidate.email || "",
        phone: "", // Not available in list view
        location: candidate.location || "",
        linkedin_url: "", // Not available in list view
        portfolio_url: "", // Not available in list view
        notes: "", // Not available in list view
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        location: "",
        linkedin_url: "",
        portfolio_url: "",
        notes: "",
      });
    }
  }, [mode, candidate, open]);

  const handleInputChange = (field: keyof CandidateCreate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await createCandidateMutation.mutateAsync(formData);
      } else if (mode === "edit" && candidate) {
        await updateCandidateMutation.mutateAsync({
          id: candidate.id,
          data: formData as CandidateUpdate,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving candidate:", error);
    }
  };

  const isLoading = createCandidateMutation.isPending || updateCandidateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle className="text-lg font-medium text-gray-900">
              {mode === "create" ? "Add New Candidate" : "Edit Candidate"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="John"
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Doe"
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john.doe@example.com"
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm text-gray-700 mb-1.5">
                Phone
              </label>
              <input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm text-gray-700 mb-1.5">
                Location
              </label>
              <input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="linkedin_url" className="block text-sm text-gray-700 mb-1.5">
                LinkedIn URL
              </label>
              <input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="portfolio_url" className="block text-sm text-gray-700 mb-1.5">
                Portfolio URL
              </label>
              <input
                id="portfolio_url"
                value={formData.portfolio_url}
                onChange={(e) => handleInputChange("portfolio_url", e.target.value)}
                placeholder="https://johndoe.dev"
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm text-gray-700 mb-1.5">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about the candidate..."
                className="w-full min-h-[100px] border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading
                ? mode === "create"
                  ? "Adding..."
                  : "Updating..."
                : mode === "create"
                  ? "Add Candidate"
                  : "Update Candidate"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
