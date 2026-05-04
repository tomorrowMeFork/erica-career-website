import { useState } from "react";

export function SettingsMenu({ onClearPreferences, onClearChatHistory }: { onClearPreferences: () => void; onClearChatHistory: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"preferences" | "chat" | null>(null);
  return (
    <div className="settings-menu" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); setConfirm(null); } }}>
      <button type="button" className="pill-control" onClick={() => setOpen((value) => !value)}>설정</button>
      {open ? <div className="settings-menu__popover card-surface"><button type="button" onClick={() => setConfirm("preferences")}>추천 조건 지우기</button><button type="button" onClick={() => setConfirm("chat")}>대화 기록 지우기</button></div> : null}
      {confirm === "preferences" ? <div role="dialog" className="settings-menu__dialog card-surface"><p>현재 세션의 추천 조건을 지울까요? 맞춤 추천이 꺼지고 기본 추천으로 돌아갑니다.</p><div className="settings-menu__dialog-actions"><button type="button" onClick={() => setConfirm(null)}>취소</button><button type="button" onClick={onClearPreferences}>추천 조건 지우기</button></div></div> : null}
      {confirm === "chat" ? <div role="dialog" className="settings-menu__dialog card-surface"><p>현재 브라우저 세션의 대화 기록을 지울까요? 서버에는 저장되지 않습니다.</p><div className="settings-menu__dialog-actions"><button type="button" onClick={() => setConfirm(null)}>취소</button><button type="button" onClick={onClearChatHistory}>대화 기록 지우기</button></div></div> : null}
    </div>
  );
}
