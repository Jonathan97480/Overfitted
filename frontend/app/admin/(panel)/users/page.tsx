"use client";
import { useState } from "react";
import {
  useListUsersQuery,
  useDeleteUserMutation,
  type UserOut,
} from "@/lib/adminEndpoints";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ChevronRight } from "lucide-react";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useListUsersQuery({});
  const [deleteUser] = useDeleteUserMutation();
  const [selected, setSelected] = useState<UserOut | null>(null);

  return (
    <>
      <div
        style={{
          background: "var(--admin-card)",
          border: "1px solid var(--admin-border)",
        }}
        className="rounded-xl overflow-hidden"
      >
        <div
          style={{ borderBottom: "1px solid var(--admin-border)" }}
          className="px-6 py-4"
        >
          <h2 className="text-white font-semibold">
            Utilisateurs{" "}
            {users && (
              <span className="text-[var(--admin-muted-2)] font-normal text-sm">
                ({users.length})
              </span>
            )}
          </h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "var(--admin-border)" }}>
              <TableHead className="text-[var(--admin-muted-2)]">ID</TableHead>
              <TableHead className="text-[var(--admin-muted-2)]">
                Utilisateur
              </TableHead>
              <TableHead className="text-[var(--admin-muted-2)]">
                Email
              </TableHead>
              <TableHead className="text-[var(--admin-muted-2)]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow
                    key={i}
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : users?.map((user) => (
                  <TableRow
                    key={user.id}
                    style={{ borderColor: "var(--admin-border)" }}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelected(user)}
                  >
                    <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                      #{user.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback
                            style={{ background: "var(--admin-accent)" }}
                            className="text-black text-[10px] font-bold"
                          >
                            {user.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm">
                          {user.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--admin-muted-2)] text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Supprimer l'utilisateur "${user.username}" ?`
                              )
                            )
                              deleteUser(user.id);
                          }}
                          className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight
                          size={14}
                          className="text-[var(--admin-muted)]"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Slide-over */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent
          style={{
            background: "var(--admin-card)",
            border: "1px solid var(--admin-border)",
          }}
          className="text-white"
        >
          <SheetHeader>
            <SheetTitle className="text-white">
              Détails utilisateur
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback
                    style={{ background: "var(--admin-accent)" }}
                    className="text-black text-xl font-bold"
                  >
                    {selected.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">{selected.username}</p>
                  <p className="text-[var(--admin-muted-2)] text-sm">
                    {selected.email}
                  </p>
                </div>
              </div>
              <div
                style={{ borderTop: "1px solid var(--admin-border)" }}
                className="pt-4 space-y-3"
              >
                {[
                  { label: "ID", value: `#${selected.id}` },
                  { label: "Username", value: selected.username },
                  { label: "Email", value: selected.email },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-[var(--admin-muted-2)]">
                      {label}
                    </p>
                    <p className="text-white text-sm font-mono">{value}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Supprimer l'utilisateur "${selected.username}" ? Cette action est irréversible.`
                    )
                  ) {
                    deleteUser(selected.id);
                    setSelected(null);
                  }
                }}
                className="w-full py-2 rounded-md text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition mt-4"
              >
                Supprimer le compte
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
