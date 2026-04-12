import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface BulletListEditorProps {
  id: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}

export function BulletListEditor({
  id,
  label,
  items,
  onChange,
  placeholder,
}: BulletListEditorProps) {
  const addItem = () => onChange([...items, ""]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-0`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm select-none" aria-hidden>
              •
            </span>
            <Input
              id={index === 0 ? `${id}-0` : undefined}
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="h-9 flex-1"
            />
            {items.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground"
                onClick={() => removeItem(index)}
                aria-label={`Remove ${label} item ${index + 1}`}
              >
                <X className="size-4" />
              </Button>
            ) : (
              <span className="size-9 shrink-0" aria-hidden />
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
        <Plus className="size-3.5" />
        Add line
      </Button>
    </div>
  );
}
