import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";

export function PreferenceRequiredFields({ major, targetRole, onChange }: { major: string; targetRole: string; onChange: (value: { major: string; target_role: string }) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="preference-major">전공</Label>
        <Input id="preference-major" value={major} onChange={(event) => onChange({ major: event.target.value, target_role: targetRole })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preference-target-role">희망 직무</Label>
        <Input id="preference-target-role" value={targetRole} onChange={(event) => onChange({ major, target_role: event.target.value })} />
      </div>
    </div>
  );
}
