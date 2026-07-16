/**
 * AccompanimentSelectorDialog
 * Shown at the POS when a waiter taps a product that has accompaniment groups.
 * Fixed groups are shown as informational chips (auto-selected).
 * Choice groups show compact pill buttons so the waiter picks one option.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AccompanimentGroup, AccompanimentSelection } from "@/types/accompaniments";

interface Props {
  open: boolean;
  productName: string;
  groups: AccompanimentGroup[];
  onConfirm: (selections: AccompanimentSelection[]) => void;
  onCancel: () => void;
}

export default function AccompanimentSelectorDialog({
  open,
  productName,
  groups,
  onConfirm,
  onCancel,
}: Props) {
  const [choiceMap, setChoiceMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setChoiceMap({});
  }, [open, productName]);

  const choiceGroups = groups.filter((g) => g.type === "choice");
  const fixedGroups = groups.filter((g) => g.type === "fixed");
  const canConfirm = choiceGroups.every((g) => choiceMap[g.id]);

  const handleConfirm = () => {
    const selections: AccompanimentSelection[] = groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      type: g.type,
      chosen:
        g.type === "fixed"
          ? g.options.map((o) => o.name)
          : choiceMap[g.id]
          ? [choiceMap[g.id]]
          : [],
    }));
    onConfirm(selections);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-xs sm:max-w-sm p-4">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm font-semibold leading-tight">{productName}</DialogTitle>
          <p className="text-xs text-muted-foreground">Choose accompaniments</p>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {/* Fixed groups — read-only chips */}
          {fixedGroups.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {group.name} <span className="font-normal normal-case">(included)</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {group.options.map((opt) => (
                  <span
                    key={opt.id}
                    className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs"
                  >
                    {opt.name}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Choice groups — pill toggle buttons */}
          {choiceGroups.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {group.name} <span className="text-red-400 font-normal normal-case">* pick one</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((opt) => {
                  const selected = choiceMap[group.id] === opt.name;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setChoiceMap((prev) => ({ ...prev, [group.id]: opt.name }))
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-2 gap-2 flex-row justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!canConfirm} className="h-8 text-xs">
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
