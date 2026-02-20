"use client";

import { useEffect, useState, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/hooks/use-auth";

// ─── Types ───────────────────────────────────────────────────

interface BannedKeyword {
  id: string;
  keyword: string;
  match_type: string;
  action: string;
  applies_to: string;
  is_active: boolean;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────

const MATCH_TYPE_OPTIONS = [
  { value: "contains", label: "Contains" },
  { value: "exact", label: "Exact match" },
  { value: "regex", label: "Regex" },
];

const ACTION_OPTIONS = [
  { value: "block", label: "Block" },
  { value: "flag", label: "Flag for review" },
  { value: "warn", label: "Warn user" },
];

const _APPLIES_TO_OPTIONS = [
  { value: "all", label: "Everything" },
  { value: "title", label: "Titles only" },
  { value: "description", label: "Descriptions only" },
  { value: "messages", label: "Messages only" },
];

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  block: { label: "Block", className: "bg-destructive/10 text-destructive" },
  flag: { label: "Flag", className: "bg-warning/10 text-warning" },
  warn: { label: "Warn", className: "bg-primary/10 text-primary" },
};

const MATCH_CONFIG: Record<string, string> = {
  contains: "Contains",
  exact: "Exact",
  regex: "Regex",
};

// ─── Main Page ───────────────────────────────────────────────

export default function AdminKeywordsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [keywords, setKeywords] = useState<BannedKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [newKeyword, setNewKeyword] = useState("");
  const [newMatchType, setNewMatchType] = useState("contains");
  const [newAction, setNewAction] = useState("block");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<BannedKeyword[]>("/api/v1/admin/keywords");
      setKeywords(data);
    } catch {
      setError(t.errors.generic);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  async function handleAdd() {
    if (!newKeyword.trim()) return;
    setIsAdding(true);
    setAddError(null);

    try {
      await api.post("/api/v1/admin/keywords", {
        keyword: newKeyword.trim(),
        match_type: newMatchType,
        action: newAction,
      });
      setNewKeyword("");
      setNewMatchType("contains");
      setNewAction("block");
      await fetchKeywords();
    } catch {
      setAddError("Failed to add keyword");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/admin/keywords/${id}`);
      setKeywords((prev) => prev.filter((kw) => kw.id !== id));
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Keyword Filters</h1>
          <p className="text-sm text-muted-foreground">
            Manage banned words and phrases for content moderation
          </p>
        </div>
      </div>

      {/* Add keyword form (admin only) */}
      {isAdmin && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add keyword
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Keyword / Phrase
              </label>
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter keyword..."
                className={cn(
                  "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Match type
              </label>
              <select
                value={newMatchType}
                onChange={(e) => setNewMatchType(e.target.value)}
                className={cn(
                  "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {MATCH_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Action
              </label>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className={cn(
                  "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addError && (
            <p className="text-sm text-destructive">{addError}</p>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding || !newKeyword.trim()}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add keyword
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Keywords table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border bg-accent/30">
          <div className="col-span-2">Keyword</div>
          <div>Match</div>
          <div>Action</div>
          <div className="text-right">Actions</div>
        </div>

        {isLoading && (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse"
              >
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="flex-1" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && keywords.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No keywords configured yet.
            </p>
          </div>
        )}

        {!isLoading &&
          keywords.map((kw) => {
            const actionConfig =
              ACTION_CONFIG[kw.action] ?? ACTION_CONFIG.block;
            return (
              <div
                key={kw.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border last:border-0 sm:grid sm:grid-cols-5"
              >
                <div className="col-span-2 min-w-0">
                  <p className="text-sm font-medium font-mono break-all">
                    {kw.keyword}
                  </p>
                  <p className="text-[10px] text-muted-foreground sm:hidden">
                    {MATCH_CONFIG[kw.match_type] ?? kw.match_type} &middot;{" "}
                    {kw.applies_to}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm text-muted-foreground">
                    {MATCH_CONFIG[kw.match_type] ?? kw.match_type}
                  </span>
                </div>
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      actionConfig.className,
                    )}
                  >
                    {actionConfig.label}
                  </span>
                </div>
                <div className="ml-auto sm:text-right">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(kw.id)}
                      disabled={deletingId === kw.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {deletingId === kw.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <p className="text-xs text-muted-foreground">
        {keywords.length} keyword{keywords.length !== 1 ? "s" : ""} configured.
        {!isAdmin &&
          " Only admins can add or remove keywords."}
      </p>
    </div>
  );
}
