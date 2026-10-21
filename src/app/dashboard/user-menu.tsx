"use client";

import { useState } from "react";
import {
  ChevronsUpDown,
  Copy,
  ExternalLink,
  Globe,
  LogOut,
  Moon,
  Palette,
  Sun,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_MODE, MODE_STORAGE_KEY, parseMode, type Mode } from "@/lib/appearance";
import { signOut } from "./actions";
import { setProfileOnline } from "./profile-actions";

function readCurrentMode(): Mode {
  if (typeof document === "undefined") return DEFAULT_MODE;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function UserMenu({
  email,
  username,
  isOnline,
}: {
  email: string;
  username: string;
  isOnline: boolean;
}) {
  const [mode, setMode] = useState<Mode>(readCurrentMode);
  const [online, setOnline] = useState(isOnline);
  const [copied, setCopied] = useState(false);

  const initial = email.trim().charAt(0).toUpperCase() || "?";

  function selectMode(next: Mode) {
    setMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Stockage local indisponible.
    }
  }

  async function handleOnlineChange(next: boolean) {
    setOnline(next);
    const res = await setProfileOnline(next);
    if (res?.error) {
      setOnline(!next);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(`https://mywork.website/${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setMode(readCurrentMode());
      }}
    >
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground"
        >
          {initial}
        </span>
        <span className="flex-1 truncate font-medium">{email}</span>
        <ChevronsUpDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate font-normal">
            {email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe aria-hidden="true" className="size-4" />
            Mon profil public
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-52">
            <div className="flex items-center justify-between gap-3 px-1.5 py-1 text-sm">
              <span>Profil en ligne</span>
              <Switch
                aria-label="Profil en ligne"
                checked={online}
                onCheckedChange={handleOnlineChange}
              />
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem closeOnClick={false} onClick={copyAddress}>
              <Copy aria-hidden="true" className="size-4" />
              {copied ? "Adresse copiée" : "Copier l'adresse"}
            </DropdownMenuItem>

            <DropdownMenuItem
              render={<a href={`/${username}`} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              Ouvrir mon profil public
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette aria-hidden="true" className="size-4" />
            Thème
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(value) => selectMode(parseMode(value))}
              >
                <DropdownMenuRadioItem value="light">
                  <Sun aria-hidden="true" className="size-4" />
                  Clair
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon aria-hidden="true" className="size-4" />
                  Sombre
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <form action={signOut}>
          <DropdownMenuItem
            render={<button type="submit" />}
            nativeButton
            className="w-full"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Se déconnecter
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
