import type { DeadlineSensitivity } from "../../src/personalization/preference-contract.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion.js";
import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import { Textarea } from "../ui/textarea.js";

type OptionalPreferenceDraft = {
  industry: string[];
  region: string[];
  employment_type: string[];
  deadline_sensitivity: DeadlineSensitivity;
  session_only_optional_text: string;
};

export function PreferenceOptionalAccordion({ industry, region, employmentType, deadlineSensitivity, sessionOnlyOptionalText, onChange }: { industry: string[]; region: string[]; employmentType: string[]; deadlineSensitivity: DeadlineSensitivity; sessionOnlyOptionalText: string; onChange: (value: OptionalPreferenceDraft) => void }) {
  const update = (patch: Partial<OptionalPreferenceDraft>) => onChange({ industry, region, employment_type: employmentType, deadline_sensitivity: deadlineSensitivity, session_only_optional_text: sessionOnlyOptionalText, ...patch });
  return (
    <Accordion type="single" collapsible className="rounded-lg border bg-muted/20 px-4">
      <AccordionItem value="optional-preferences">
        <AccordionTrigger>선택 조건 더보기</AccordionTrigger>
        <AccordionContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="preference-industry">산업</Label>
              <Input id="preference-industry" name="industry" value={formatList(industry)} placeholder="예: IT, 교육" onChange={(event) => update({ industry: parseList(event.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preference-region">지역</Label>
              <Input id="preference-region" name="region" value={formatList(region)} placeholder="예: 서울, 경기" onChange={(event) => update({ region: parseList(event.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preference-employment-type">고용 형태</Label>
              <Input id="preference-employment-type" name="employment_type" value={formatList(employmentType)} placeholder="예: 인턴, 정규직" onChange={(event) => update({ employment_type: parseList(event.target.value) })} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="grid gap-2">
              <Label id="preference-deadline-sensitivity-label" htmlFor="preference-deadline-sensitivity">마감 민감도</Label>
              <Select value={deadlineSensitivity} onValueChange={(value) => update({ deadline_sensitivity: parseDeadlineSensitivity(value) })}>
                <SelectTrigger id="preference-deadline-sensitivity" aria-labelledby="preference-deadline-sensitivity-label" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent_first">마감 임박 우선</SelectItem>
                  <SelectItem value="balanced">균형</SelectItem>
                  <SelectItem value="include_unknown">미정 포함</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preference-session-text">추가 메모</Label>
              <Textarea id="preference-session-text" name="session_only_optional_text" value={sessionOnlyOptionalText} onChange={(event) => update({ session_only_optional_text: event.target.value })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">선택 메모는 현재 세션 전용이며 영구 저장하지 않습니다.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function parseList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 5);
}

function formatList(value: string[]): string {
  return value.join(", ");
}

function parseDeadlineSensitivity(value: string): DeadlineSensitivity {
  if (value === "urgent_first" || value === "include_unknown") return value;
  return "balanced";
}
