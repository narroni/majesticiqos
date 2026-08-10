"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { toggleAdminUserActive } from "@/lib/actions/admin-settings";
import type { AdminUserListItem } from "@/lib/data/admin-settings";
import { formatRelativeTime } from "@/lib/utils";

interface AdminUsersTableProps {
  users: AdminUserListItem[];
  currentAdminId: string;
  isOwner: boolean;
}

export function AdminUsersTable({ users, currentAdminId, isOwner }: AdminUsersTableProps) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  function handleToggle(user: AdminUserListItem, next: boolean) {
    const previous = overrides[user.id] ?? user.isActive;
    setOverrides((prev) => ({ ...prev, [user.id]: next }));

    startTransition(async () => {
      const result = await toggleAdminUserActive(user.id, next);
      if (!result.success) {
        setOverrides((prev) => ({ ...prev, [user.id]: previous }));
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-fg-primary font-display text-lg">Admin users</h2>
        {!isOwner ? (
          <p className="text-fg-muted font-body text-xs">
            Only an owner can activate or deactivate admin accounts.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {users.map((user) => {
          const isActive = overrides[user.id] ?? user.isActive;
          const isSelf = user.id === currentAdminId;

          return (
            <div
              key={user.id}
              className="border-border flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-col">
                <span className="text-fg-primary font-body text-sm">
                  {user.fullName ?? user.email}
                </span>
                <span className="text-fg-muted font-mono text-xs">
                  {user.email} · {user.role}
                  {user.lastLoginAt ? ` · last login ${formatRelativeTime(user.lastLoginAt)}` : ""}
                </span>
              </div>
              <Switch
                checked={isActive}
                disabled={!isOwner || (isSelf && isActive)}
                onCheckedChange={(checked) => handleToggle(user, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
