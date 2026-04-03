import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface MatchingForm {
  skills_weight: number;
  experience_weight: number;
  education_weight: number;
  additional_weight: number;
  fuzzy_match_threshold: number;
  skills_match_algorithm: "tfidf" | "exact" | "fuzzy";
  enable_synonym_matching: boolean;
  primary_skills_penalty_all: number;
  primary_skills_penalty_some: number;
  primary_skills_penalty_none: number;
}

export default function SettingsMatching() {
  const { user } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => user?.role === "admin");

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<MatchingForm>();

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.get("/organizations/me/matching-config");
      reset(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 403) {
        setLoadError("forbidden");
      } else {
        setLoadError("failed");
        toast.error("Failed to load matching settings.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    if (user?.role === "admin") {
      void load();
    } else {
      setIsLoading(false);
    }
  }, [user?.role, load]);

  const onSubmit = async (data: MatchingForm) => {
    setIsLoading(true);
    try {
      await api.put("/organizations/me/matching-config", data);
      toast.success("Matching settings saved.");
      reset(data);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save matching settings.");
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-lg font-medium text-gray-900">Matching</h1>
        <p className="text-sm text-gray-600 max-w-lg">
          Only organization admins can change how candidate–job scores are weighted. Ask an admin to update these
          settings, or see{" "}
          <Link to="/settings/organization" className="text-blue-600 hover:underline">
            Organization
          </Link>{" "}
          for your team.
        </p>
      </div>
    );
  }

  if (loadError === "forbidden") {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-lg font-medium text-gray-900">Matching</h1>
        <p className="text-sm text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-medium text-gray-900">Matching</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Weights apply when computing fit between candidates and jobs. The four weights must total 100.
        </p>
      </div>

      {isLoading && !isDirty ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : loadError === "failed" ? (
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-900">Score weights (sum = 100)</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-gray-600">Skills</span>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("skills_weight", { valueAsNumber: true, required: true })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">Experience</span>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("experience_weight", { valueAsNumber: true, required: true })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">Education</span>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("education_weight", { valueAsNumber: true, required: true })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">Additional</span>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("additional_weight", { valueAsNumber: true, required: true })}
                />
              </label>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-900">Text matching</h2>
            <label className="flex flex-col space-y-1">
              <span className="text-xs text-gray-600">Fuzzy match threshold (0–1)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                {...register("fuzzy_match_threshold", { valueAsNumber: true, required: true })}
              />
            </label>
            <label className="flex flex-col space-y-1">
              <span className="text-xs text-gray-600">Skills match algorithm</span>
              <select
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm bg-white"
                {...register("skills_match_algorithm", { required: true })}
              >
                <option value="tfidf">TF‑IDF</option>
                <option value="exact">Exact</option>
                <option value="fuzzy">Fuzzy</option>
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("enable_synonym_matching")} />
              <span className="text-sm text-gray-800">Enable synonym matching</span>
            </label>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-900">Primary skills penalties</h2>
            <p className="text-xs text-gray-500">Multipliers when required skills are all / some / none present.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-gray-600">All present</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("primary_skills_penalty_all", { valueAsNumber: true, required: true })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">Some present</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("primary_skills_penalty_some", { valueAsNumber: true, required: true })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">None present</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm"
                  {...register("primary_skills_penalty_none", { valueAsNumber: true, required: true })}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isDirty}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
