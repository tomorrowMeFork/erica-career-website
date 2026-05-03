export function PreferenceRequiredFields({ major, targetRole, onChange }: { major: string; targetRole: string; onChange: (value: { major: string; target_role: string }) => void }) {
  return <div className="preference-required"><label>전공<input value={major} onChange={(event) => onChange({ major: event.target.value, target_role: targetRole })} /></label><label>희망 직무<input value={targetRole} onChange={(event) => onChange({ major, target_role: event.target.value })} /></label></div>;
}
