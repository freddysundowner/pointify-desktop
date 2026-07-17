import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api-config";
import { useAuth } from "@/features/auth/useAuth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Plus, Trash2, Store, FolderOpen, Loader2, Pencil } from "lucide-react";

interface CategoryDoc {
  _id: string;
  name: string;
  shop?: string;
  admin?: string;
}

interface Shop {
  _id: string;
  name: string;
}

/**
 * Category management page.
 *
 * The upstream Pointify backend stores ONE shop per category record, so a
 * category that should exist in several shops is represented by one record
 * per shop (same name, different shop). This page groups records by name so
 * the user sees a single row per category with shop badges, and assigning a
 * category to more shops creates the missing per-shop records.
 */
export default function CategoriesPage() {
  const { admin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const adminId = admin?._id;

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShopIds, setNewShopIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [assignGroup, setAssignGroup] = useState<{ name: string; docs: CategoryDoc[] } | null>(null);
  const [assignShopIds, setAssignShopIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const [deleteGroup, setDeleteGroup] = useState<{ name: string; docs: CategoryDoc[] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [renameGroup, setRenameGroup] = useState<{ name: string; docs: CategoryDoc[] } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const { data: shops = [] } = useQuery<Shop[]>({
    queryKey: ["shops", adminId],
    queryFn: async () => {
      const res = await apiCall(`/api/shop/admin/${adminId}`, { method: "GET" });
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data ?? [];
    },
    enabled: !!adminId,
    staleTime: 5 * 60_000,
  });

  const { data: categories = [], isLoading } = useQuery<CategoryDoc[]>({
    queryKey: ["/api/product/category", "all-shops", adminId],
    queryFn: async () => {
      const res = await apiCall(`/api/product/category?admin=${adminId}`, { method: "GET" });
      const data = await res.json();
      return Array.isArray(data) ? data : data?.categories ?? data?.data ?? [];
    },
    enabled: !!adminId,
  });

  const shopName = (id?: string) => shops.find((s) => s._id === id)?.name;

  // Group category records by (trimmed, case-insensitive) name.
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; docs: CategoryDoc[] }>();
    for (const cat of categories) {
      const key = (cat.name || "").trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.docs.push(cat);
      else map.set(key, { name: (cat.name || "").trim(), docs: [cat] });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/product/category"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const createCategoryInShop = async (name: string, shopId: string | null) => {
    const params = new URLSearchParams({ shop: shopId || "", admin: adminId || "" });
    const resp = await apiCall(`/api/product/category?${params.toString()}`, {
      method: "POST",
      body: JSON.stringify({ name, admin: adminId, ...(shopId ? { shop: shopId } : {}) }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json().catch(() => null);
    if (data && data.success === false) throw new Error(data.message || "Create failed");
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (newShopIds.length === 0) {
      toast({ title: "Pick at least one shop", variant: "destructive" });
      return;
    }
    // Prevent duplicates in shops that already have this category name.
    const existing = groups.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const shopsWithIt = new Set((existing?.docs || []).map((d) => d.shop));
    const targets = newShopIds.filter((id) => !shopsWithIt.has(id));
    if (targets.length === 0) {
      toast({ title: "Already exists", description: "That category is already in the selected shop(s).", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    let ok = 0;
    let failed = 0;
    for (const shopId of targets) {
      try {
        await createCategoryInShop(name, shopId);
        ok++;
      } catch {
        failed++;
      }
    }
    setIsSaving(false);
    if (failed === 0) {
      toast({ title: "Category added", description: `"${name}" added to ${ok} shop${ok !== 1 ? "s" : ""}.` });
      setAddOpen(false);
      setNewName("");
      setNewShopIds([]);
    } else {
      toast({ title: "Some shops failed", description: `${ok} added, ${failed} failed. Try again.`, variant: "destructive" });
    }
    refresh();
  };

  const openAssign = (group: { name: string; docs: CategoryDoc[] }) => {
    setAssignGroup(group);
    setAssignShopIds(group.docs.map((d) => d.shop).filter(Boolean) as string[]);
  };

  const handleAssign = async () => {
    if (!assignGroup) return;
    const current = new Set(assignGroup.docs.map((d) => d.shop).filter(Boolean) as string[]);
    const wanted = new Set(assignShopIds);
    const toAdd = assignShopIds.filter((id) => !current.has(id));
    const toRemove = assignGroup.docs.filter((d) => d.shop && !wanted.has(d.shop));
    if (toAdd.length === 0 && toRemove.length === 0) {
      setAssignGroup(null);
      return;
    }
    setIsAssigning(true);
    let failed = 0;
    for (const shopId of toAdd) {
      try {
        await createCategoryInShop(assignGroup.name, shopId);
      } catch {
        failed++;
      }
    }
    for (const doc of toRemove) {
      try {
        const resp = await apiCall(`/api/product/category/${doc._id}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch {
        failed++;
      }
    }
    setIsAssigning(false);
    setAssignGroup(null);
    if (failed === 0) {
      toast({ title: "Shops updated", description: `"${assignGroup.name}" is now in ${assignShopIds.length} shop${assignShopIds.length !== 1 ? "s" : ""}.` });
    } else {
      toast({ title: "Some changes failed", description: "Not all shop changes were saved. Please check and try again.", variant: "destructive" });
    }
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteGroup) return;
    setIsDeleting(true);
    let failed = 0;
    for (const doc of deleteGroup.docs) {
      try {
        const resp = await apiCall(`/api/product/category/${doc._id}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch {
        failed++;
      }
    }
    setIsDeleting(false);
    setDeleteGroup(null);
    if (failed === 0) {
      toast({ title: "Category deleted", description: `"${deleteGroup.name}" has been removed.` });
    } else {
      toast({ title: "Delete failed", description: "Some records could not be deleted. Try again.", variant: "destructive" });
    }
    refresh();
  };

  const handleRename = async () => {
    if (!renameGroup) return;
    const name = renameValue.trim();
    if (!name || name.toLowerCase() === renameGroup.name.toLowerCase()) {
      setRenameGroup(null);
      return;
    }
    setIsRenaming(true);
    let failed = 0;
    for (const doc of renameGroup.docs) {
      try {
        const resp = await apiCall(`/api/product/category/${doc._id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch {
        failed++;
      }
    }
    setIsRenaming(false);
    setRenameGroup(null);
    setRenameValue("");
    if (failed === 0) {
      toast({ title: "Category renamed", description: `Now called "${name}".` });
    } else {
      toast({ title: "Rename failed", description: "Some records could not be renamed. Try again.", variant: "destructive" });
    }
    refresh();
  };

  const toggleIn = (list: string[], id: string, set: (v: string[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-purple-600" />
              Product Categories
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Add categories and choose which shops they belong to.
            </p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => { setNewShopIds(shops.map((s) => s._id)); setAddOpen(true); }} data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Category
          </Button>
        </div>

        <div className="rounded-md border bg-white">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No categories yet. Click "Add Category" to create one.</div>
          ) : (
            <ul className="divide-y">
              {groups.map((group) => (
                <li key={group.name.toLowerCase()} className="flex items-center gap-3 p-3" data-testid={`row-category-${group.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{group.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.docs.map((doc) => (
                        <Badge key={doc._id} variant="secondary" className="text-xs font-normal">
                          <Store className="h-3 w-3 mr-1" />
                          {doc.shop ? shopName(doc.shop) || "Unknown shop" : "All shops (legacy)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => openAssign(group)} data-testid={`button-assign-${group.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Store className="h-3.5 w-3.5 mr-1.5" />
                    Shops
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { setRenameGroup(group); setRenameValue(group.name); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDeleteGroup(group)} data-testid={`button-delete-${group.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add category dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!isSaving) setAddOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Name the category and pick the shops it should appear in.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={isSaving}
            data-testid="input-category-name"
          />
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {shops.map((shop) => (
              <label key={shop._id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={newShopIds.includes(shop._id)}
                  onCheckedChange={() => toggleIn(newShopIds, shop._id, setNewShopIds)}
                  disabled={isSaving}
                />
                {shop.name}
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAdd} disabled={isSaving || !newName.trim()} data-testid="button-save-category">
              {isSaving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>) : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign shops dialog */}
      <Dialog open={!!assignGroup} onOpenChange={(o) => { if (!isAssigning && !o) setAssignGroup(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Shops for "{assignGroup?.name}"</DialogTitle>
            <DialogDescription>
              Tick the shops this category should be in. Unticking a shop removes the category from it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {shops.map((shop) => (
              <label key={shop._id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={assignShopIds.includes(shop._id)}
                  onCheckedChange={() => toggleIn(assignShopIds, shop._id, setAssignShopIds)}
                  disabled={isAssigning}
                />
                {shop.name}
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignGroup(null)} disabled={isAssigning}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAssign} disabled={isAssigning} data-testid="button-save-assign">
              {isAssigning ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>) : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameGroup} onOpenChange={(o) => { if (!isRenaming && !o) setRenameGroup(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>This renames the category everywhere it is used.</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} disabled={isRenaming} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenameGroup(null)} disabled={isRenaming}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleRename} disabled={isRenaming || !renameValue.trim()}>
              {isRenaming ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Renaming…</>) : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteGroup} onOpenChange={(o) => { if (!isDeleting && !o) setDeleteGroup(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete "{deleteGroup?.name}"?
            </DialogTitle>
            <DialogDescription>
              This removes the category from {deleteGroup?.docs.length === 1 ? "its shop" : `all ${deleteGroup?.docs.length} shops`}. Products keep their data but will no longer be linked to this category.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteGroup(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} data-testid="button-confirm-delete-category">
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
