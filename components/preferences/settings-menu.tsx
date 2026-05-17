import { useState } from "react";
import { Button } from "../ui/button.js";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu.js";

export function SettingsMenu({ onClearPreferences, onClearChatHistory }: { onClearPreferences: () => void; onClearChatHistory: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"preferences" | "chat" | null>(null);
  const requestConfirmation = (target: "preferences" | "chat") => {
    setMenuOpen(false);
    setConfirm(target);
  };
  const dialogCopy = confirm === "preferences"
    ? {
      title: "추천 조건 지우기",
      description: "현재 세션의 추천 조건을 지울까요? 맞춤 추천이 꺼지고 기본 추천으로 돌아갑니다.",
      action: onClearPreferences,
    }
    : {
      title: "대화 기록 지우기",
      description: "현재 브라우저 세션의 대화 기록을 지울까요? 서버에는 저장되지 않습니다.",
      action: onClearChatHistory,
    };
  return (
    <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">설정</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>개인정보 관리</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="p-0" onSelect={(event) => { event.preventDefault(); requestConfirmation("preferences"); }}>
            <Button type="button" variant="ghost" className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive">추천 조건 지우기</Button>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" className="p-0" onSelect={(event) => { event.preventDefault(); requestConfirmation("chat"); }}>
            <Button type="button" variant="ghost" className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive">대화 기록 지우기</Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="!z-[60]">
        <DialogHeader>
          <DialogTitle>{dialogCopy.title}</DialogTitle>
          <DialogDescription>{dialogCopy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">취소</Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={() => { dialogCopy.action(); setConfirm(null); }}>{dialogCopy.title}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
