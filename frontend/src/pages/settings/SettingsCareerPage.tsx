import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ExternalLink,
  Upload,
  X,
} from "lucide-react";

// --- Types ---

interface FormConfig {
  show_phone: boolean;
  show_location: boolean;
  show_linkedin: boolean;
  show_portfolio: boolean;
  show_cover_letter: boolean;
  require_phone: boolean;
  require_location: boolean;
  require_linkedin: boolean;
  require_portfolio: boolean;
  require_cover_letter: boolean;
}

interface CustomField {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: string[] | null;
  placeholder: string | null;
  sort_order: number;
}

interface BrandingFormData {
  description: string;
  website_url: string;
  brand_color: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL" },
];

const DEFAULT_FIELDS = [
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "linkedin", label: "LinkedIn URL" },
  { key: "portfolio", label: "Portfolio URL" },
  { key: "cover_letter", label: "Cover Letter" },
];

const DEFAULT_CONFIG: FormConfig = {
  show_phone: true,
  show_location: true,
  show_linkedin: true,
  show_portfolio: true,
  show_cover_letter: true,
  require_phone: false,
  require_location: false,
  require_linkedin: false,
  require_portfolio: false,
  require_cover_letter: false,
};

export default function SettingsCareerPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<FormConfig>(DEFAULT_CONFIG);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [careerPageEnabled, setCareerPageEnabled] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Custom field dialog
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState("");
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [savingField, setSavingField] = useState(false);

  const orgSlug = user?.organization?.slug;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<BrandingFormData>();

  // --- Load data ---

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [orgRes, formRes] = await Promise.all([
        api.get("/organizations/me"),
        api.get("/organizations/me/application-form"),
      ]);

      const org = orgRes.data;
      setCareerPageEnabled(org.career_page_enabled ?? true);
      setLogoUrl(org.logo_url);
      reset({
        description: org.description || "",
        website_url: org.website_url || "",
        brand_color: org.brand_color || "",
      });

      setFormConfig(formRes.data.config);
      setCustomFields(formRes.data.custom_fields);
    } catch {
      toast.error("Failed to load career page settings");
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Branding ---

  const onSaveBranding = async (data: BrandingFormData) => {
    setSavingBranding(true);
    try {
      await api.put("/organizations/me", {
        description: data.description || null,
        website_url: data.website_url || null,
        brand_color: data.brand_color || null,
      });
      toast.success("Career page branding updated");
    } catch {
      toast.error("Failed to update branding");
    } finally {
      setSavingBranding(false);
    }
  };

  const toggleCareerPage = async (enabled: boolean) => {
    setCareerPageEnabled(enabled);
    try {
      await api.put("/organizations/me", { career_page_enabled: enabled });
      toast.success(enabled ? "Career page enabled" : "Career page disabled");
    } catch {
      setCareerPageEnabled(!enabled);
      toast.error("Failed to update career page status");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/organizations/me/logo", formData);
      setLogoUrl(res.data.logo_url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      await api.delete("/organizations/me/logo");
      setLogoUrl(null);
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    }
  };

  // --- Form config ---

  const updateFormConfig = async (updates: Partial<FormConfig>) => {
    const newConfig = { ...formConfig, ...updates };
    setFormConfig(newConfig);
    setSavingConfig(true);
    try {
      await api.put("/organizations/me/application-form/config", updates);
    } catch {
      setFormConfig(formConfig);
      toast.error("Failed to update form configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  // --- Custom fields ---

  const openAddField = () => {
    setEditingField(null);
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(false);
    setFieldOptions("");
    setFieldPlaceholder("");
    setFieldDialogOpen(true);
  };

  const openEditField = (field: CustomField) => {
    setEditingField(field);
    setFieldLabel(field.label);
    setFieldType(field.field_type);
    setFieldRequired(field.is_required);
    setFieldOptions(field.options?.join(", ") || "");
    setFieldPlaceholder(field.placeholder || "");
    setFieldDialogOpen(true);
  };

  const saveField = async () => {
    if (!fieldLabel.trim()) {
      toast.error("Field label is required");
      return;
    }

    setSavingField(true);
    const payload: Record<string, unknown> = {
      label: fieldLabel.trim(),
      field_type: fieldType,
      is_required: fieldRequired,
      placeholder: fieldPlaceholder || null,
      options:
        fieldType === "select"
          ? fieldOptions
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : null,
    };

    try {
      if (editingField) {
        const res = await api.put(
          `/organizations/me/application-form/fields/${editingField.id}`,
          payload
        );
        setCustomFields((prev) =>
          prev.map((f) => (f.id === editingField.id ? res.data : f))
        );
        toast.success("Field updated");
      } else {
        const res = await api.post(
          "/organizations/me/application-form/fields",
          payload
        );
        setCustomFields((prev) => [...prev, res.data]);
        toast.success("Field added");
      }
      setFieldDialogOpen(false);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save field");
    } finally {
      setSavingField(false);
    }
  };

  const deleteField = async (fieldId: number) => {
    try {
      await api.delete(
        `/organizations/me/application-form/fields/${fieldId}`
      );
      setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
      toast.success("Field removed");
    } catch {
      toast.error("Failed to remove field");
    }
  };

  const moveField = async (index: number, direction: "up" | "down") => {
    const newFields = [...customFields];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFields.length) return;

    [newFields[index], newFields[swapIndex]] = [
      newFields[swapIndex],
      newFields[index],
    ];
    setCustomFields(newFields);

    try {
      await api.put("/organizations/me/application-form/fields/reorder", {
        field_ids: newFields.map((f) => f.id),
      });
    } catch {
      setCustomFields(customFields);
      toast.error("Failed to reorder fields");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-medium text-gray-900 mb-6">
          Career Page
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-60 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">Career Page</h1>
        {orgSlug && (
          <a
            href={`/${orgSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            Preview
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Section 1: Branding */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-900">Branding</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Career page</span>
            <Switch
              checked={careerPageEnabled}
              onCheckedChange={toggleCareerPage}
            />
          </div>
        </div>

        {/* Logo */}
        <div className="mb-5">
          <label className="text-sm text-gray-700 block mb-2">Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace("/api", "")}/${logoUrl}`}
                  alt="Logo"
                  className="h-12 w-12 rounded-lg object-contain border border-gray-200"
                />
                <button
                  onClick={handleLogoDelete}
                  className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 hover:bg-gray-50"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            ) : (
              <label className="h-12 w-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                <Upload className="h-4 w-4 text-gray-400" />
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </label>
            )}
            {!logoUrl && (
              <span className="text-xs text-gray-400">
                PNG, JPG, SVG or WebP. Max 2MB.
              </span>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSaveBranding)}
          className="space-y-4 max-w-lg"
        >
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <textarea
              rows={3}
              placeholder="Tell candidates about your company..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              {...register("description")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Website URL</label>
            <input
              type="url"
              placeholder="https://yourcompany.com"
              className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register("website_url")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                {...register("brand_color")}
              />
              <input
                type="text"
                placeholder="#4F46E5"
                className="w-28 border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register("brand_color")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingBranding || !isDirty}
            className="bg-gray-900 text-white rounded-lg h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {savingBranding ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      {/* Section 2: Default Application Fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-1">
          Application Form Fields
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Email, first name, last name, and resume are always required.
          Configure which optional fields to include.
        </p>

        <div className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 px-4 py-2.5 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Field</span>
            <span className="text-center">Show</span>
            <span className="text-center">Required</span>
          </div>

          {/* Required fields (always on) */}
          {["Email", "First Name", "Last Name", "Resume"].map((field) => (
            <div
              key={field}
              className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-gray-100 items-center"
            >
              <span className="text-sm text-gray-700">{field}</span>
              <div className="flex justify-center">
                <Switch checked disabled />
              </div>
              <div className="flex justify-center">
                <Switch checked disabled />
              </div>
            </div>
          ))}

          {/* Optional default fields */}
          {DEFAULT_FIELDS.map((field) => {
            const showKey = `show_${field.key}` as keyof FormConfig;
            const requireKey = `require_${field.key}` as keyof FormConfig;
            const isShown = formConfig[showKey];

            return (
              <div
                key={field.key}
                className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-gray-100 items-center"
              >
                <span className="text-sm text-gray-700">{field.label}</span>
                <div className="flex justify-center">
                  <Switch
                    checked={!!isShown}
                    onCheckedChange={(checked) => {
                      const updates: Partial<FormConfig> = {
                        [showKey]: checked,
                      };
                      // If hiding, also unset required
                      if (!checked) {
                        updates[requireKey] = false;
                      }
                      updateFormConfig(updates);
                    }}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={!!formConfig[requireKey]}
                    disabled={!isShown}
                    onCheckedChange={(checked) =>
                      updateFormConfig({ [requireKey]: checked })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
        {savingConfig && (
          <p className="text-xs text-gray-400 mt-2">Saving...</p>
        )}
      </div>

      {/* Section 3: Custom Fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900">
              Custom Fields
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add your own questions to the application form.
            </p>
          </div>
          <button
            onClick={openAddField}
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-lg h-8 px-3 text-sm hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Field
          </button>
        </div>

        {customFields.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">No custom fields yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Add fields like "Years of Experience", "Availability", etc.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-3 px-3 py-2.5 border border-gray-100 rounded-lg group"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveField(index, "up")}
                    disabled={index === 0}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 truncate">
                      {field.label}
                    </span>
                    {field.is_required && (
                      <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {FIELD_TYPES.find((t) => t.value === field.field_type)
                      ?.label || field.field_type}
                    {field.options?.length
                      ? ` · ${field.options.length} options`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditField(field)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteField(field.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Custom Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Field" : "Add Custom Field"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Label</label>
              <input
                type="text"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g. Years of Experience"
                className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Type</label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fieldType === "select" && (
              <div className="space-y-1">
                <label className="text-sm text-gray-700">
                  Options{" "}
                  <span className="text-gray-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                  className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm text-gray-700">
                Placeholder{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder="Hint text shown in the field"
                className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="field-required"
                checked={fieldRequired}
                onCheckedChange={setFieldRequired}
              />
              <label
                htmlFor="field-required"
                className="text-sm text-gray-700"
              >
                Required field
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFieldDialogOpen(false)}
                className="border border-gray-200 rounded-lg h-9 px-4 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveField}
                disabled={savingField || !fieldLabel.trim()}
                className="bg-gray-900 text-white rounded-lg h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {savingField
                  ? "Saving..."
                  : editingField
                    ? "Update"
                    : "Add Field"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
