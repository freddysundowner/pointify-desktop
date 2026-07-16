/**
 * AccompanimentGroupsEditor
 * Shown inside the product form (restaurant mode only).
 * Lets the user define accompaniment groups for a dish —
 * e.g. "Choice of Starch" (choice) or "Fixed Sides" (fixed).
 */
import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccompanimentGroup, AccompanimentOption } from "@/types/accompaniments";

interface Props {
  groups: AccompanimentGroup[];
  onChange: (groups: AccompanimentGroup[]) => void;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AccompanimentGroupsEditor({ groups, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const addGroup = () => {
    onChange([
      ...groups,
      { id: randomId(), name: "", type: "choice", options: [] },
    ]);
  };

  const removeGroup = (id: string) => {
    onChange(groups.filter((g) => g.id !== id));
  };

  const updateGroup = (id: string, patch: Partial<AccompanimentGroup>) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const addOption = (groupId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: [...g.options, { id: randomId(), name: "" }] }
          : g
      )
    );
  };

  const removeOption = (groupId: string, optionId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g
      )
    );
  };

  const updateOption = (groupId: string, optionId: string, name: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === optionId ? { ...o, name } : o
              ),
            }
          : g
      )
    );
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-3">
      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          No accompaniment groups yet. Click "Add Group" to define what comes with this dish.
        </p>
      )}

      {groups.map((group, idx) => (
        <div
          key={group.id}
          className="border rounded-lg overflow-hidden bg-white"
        >
          {/* Group header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="text-xs font-medium text-gray-500 w-5 shrink-0">
              {idx + 1}.
            </span>

            <Input
              value={group.name}
              onChange={(e) => updateGroup(group.id, { name: e.target.value })}
              placeholder="Group name e.g. Choice of Starch"
              className="h-7 text-xs flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
            />

            <Select
              value={group.type}
              onValueChange={(v) =>
                updateGroup(group.id, { type: v as "fixed" | "choice" })
              }
            >
              <SelectTrigger className="h-7 text-xs w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="choice">
                  <span className="text-xs">Choice (pick 1)</span>
                </SelectItem>
                <SelectItem value="fixed">
                  <span className="text-xs">Fixed (always)</span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="outline" className="text-[10px] shrink-0">
              {group.options.length} item{group.options.length !== 1 ? "s" : ""}
            </Badge>

            <button
              type="button"
              onClick={() => toggle(group.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              {collapsed[group.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Options list */}
          {!collapsed[group.id] && (
            <div className="p-3 space-y-2">
              {group.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <Input
                    value={opt.name}
                    onChange={(e) =>
                      updateOption(group.id, opt.id, e.target.value)
                    }
                    placeholder={
                      group.type === "choice"
                        ? "Option e.g. Ugali"
                        : "Item e.g. Salad"
                    }
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(group.id, opt.id)}
                    className="text-red-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addOption(group.id)}
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <Plus className="h-3 w-3" />
                Add {group.type === "choice" ? "option" : "item"}
              </button>
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addGroup}
        className="w-full text-xs h-8 border-dashed"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Group
      </Button>
    </div>
  );
}
