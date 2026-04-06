"use client";
import { useState } from "react";
import {
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  type ProductOut,
} from "@/lib/adminEndpoints";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus } from "lucide-react";

type FormData = {
  name: string;
  printful_variant_id: string;
  price: string;
  category: string;
};

const EMPTY: FormData = {
  name: "",
  printful_variant_id: "",
  price: "",
  category: "",
};

export default function AdminProductsPage() {
  const { data: products, isLoading } = useListProductsQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductOut | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: ProductOut) {
    setEditing(p);
    setForm({
      name: p.name,
      printful_variant_id: p.printful_variant_id,
      price: String(p.price),
      category: p.category ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateProduct({
          id: editing.id,
          name: form.name,
          price: parseFloat(form.price),
          category: form.category || null,
        });
      } else {
        await createProduct({
          name: form.name,
          printful_variant_id: form.printful_variant_id,
          price: parseFloat(form.price),
          category: form.category || null,
        });
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

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
          className="px-6 py-4 flex items-center justify-between"
        >
          <h2 className="text-white font-semibold">
            Produits{" "}
            {products && (
              <span className="text-[var(--admin-muted-2)] font-normal text-sm">
                ({products.length})
              </span>
            )}
          </h2>
          <button
            onClick={openCreate}
            style={{ background: "var(--admin-accent)" }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-black hover:opacity-90 transition"
          >
            <Plus size={13} /> Nouveau produit
          </button>
        </div>

        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "var(--admin-border)" }}>
              <TableHead className="text-[var(--admin-muted-2)]">ID</TableHead>
              <TableHead className="text-[var(--admin-muted-2)]">Nom</TableHead>
              <TableHead className="text-[var(--admin-muted-2)]">
                Variant Printful
              </TableHead>
              <TableHead className="text-[var(--admin-muted-2)]">
                Prix
              </TableHead>
              <TableHead className="text-[var(--admin-muted-2)]">
                Catégorie
              </TableHead>
              <TableHead className="text-[var(--admin-muted-2)]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow
                    key={i}
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : products?.map((p) => (
                  <TableRow
                    key={p.id}
                    style={{ borderColor: "var(--admin-border)" }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                      #{p.id}
                    </TableCell>
                    <TableCell className="text-white text-sm font-medium">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                      {p.printful_variant_id}
                    </TableCell>
                    <TableCell className="text-white text-sm">
                      {p.price.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-[var(--admin-muted-2)] text-sm">
                      {p.category ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-[var(--admin-muted)] hover:text-white transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer "${p.name}" ?`))
                              deleteProduct(p.id);
                          }}
                          className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{
            background: "var(--admin-card)",
            border: "1px solid var(--admin-border)",
          }}
          className="text-white"
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { key: "name", label: "Nom", placeholder: "T-shirt Cynique" },
              {
                key: "printful_variant_id",
                label: "Variant Printful ID",
                placeholder: "12345",
                disabled: !!editing,
              },
              {
                key: "price",
                label: "Prix (€)",
                placeholder: "29.90",
                type: "number",
              },
              {
                key: "category",
                label: "Catégorie",
                placeholder: "t-shirt",
              },
            ].map(({ key, label, placeholder, disabled, type }) => (
              <div key={key}>
                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                  {label}
                </label>
                <input
                  type={type ?? "text"}
                  value={form[key as keyof FormData]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  disabled={disabled}
                  placeholder={placeholder}
                  style={{
                    background: "var(--admin-sidebar)",
                    border: "1px solid var(--admin-border)",
                    color: "white",
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)] disabled:opacity-50"
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: "var(--admin-accent)" }}
              className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition mt-2"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
