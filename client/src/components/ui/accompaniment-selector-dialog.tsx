/**
 * AccompanimentSelectorDialog
 * Shown at the POS when a waiter taps a product that has accompaniment groups.
 * Fixed groups are shown as informational chips (auto-selected).
 * Choice groups show radio buttons so the waiter picks one option.
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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
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
  // choiceMap: groupId → chosen option name
  const [choiceMap, setChoiceMap] = useState<Record<string, string>>({});

  // Reset when dialog opens for a new product
  useEffect(() => {
    if (open) setChoiceMap({});
  }, [open, productName]);

  const choiceGroups = groups.filter((g) => g.type === "choice");
  const fixedGroups = groups.filter((g) => g.type === "fixed");

  // All required choice groups must have a selection before confirming
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{productName}</DialogTitle>
          <p className="text-xs text-muted-foreground -mt-1">
            Select accompaniments
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-1">
          {/* Fixed groups — shown as read-only chips */}
          {fixedGroups.map((group) => (
            <div key={group.id}>
              <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {group.name}
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
                  (always included)
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((opt) => (
                  <Badge
                    key={opt.id}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {opt.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}

          {/* Choice groups — radio buttons */}
          {choiceGroups.map((group) => (
            <div key={group.id}>
              <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {group.name}
                <span className="ml-1.5 text-[10px] font-normal text-red-500 normal-case tracking-normal">
                  * required
                </span>
              </p>
              <div className="space-y-1.5">
                {group.options.map((opt) => {
                  const selected = choiceMap[group.id] === opt.name;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setChoiceMap((prev) => ({
                          ...prev,
                          [group.id]: opt.name,
                        }))
                      }
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {selected ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                      )}
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!canConfirm}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
