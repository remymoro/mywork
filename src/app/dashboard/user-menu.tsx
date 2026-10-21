"use client";

import { useState } from "react";
import { LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  THEMES,
  THEME_STORAGE_KEY,
  getInitials,
  parseMode,
  parseTheme,
  type Mode,
  type ThemeId,
} from "@/lib/appearance";
import { signOut } from "./actions";

function readCurrentTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return parseTheme(document.documentElement.getAttribute("data-theme"));
}

function readCurrentMode(): Mode {
  if (typeof document === "undefined") return DEFAULT_MODE;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function UserMenu({ userName }: { userName: string }) {
  const [theme, setTheme] = useState<ThemeId>(readCurrentTheme);
  const [mode, setMode] = useState<Mode>(readCurrentMode);

  function selectTheme(next: ThemeId) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Stockage local indisponible.
    }
  }

  function selectMode(next: Mode) {
    setMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Stockage local indisponible.
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          setTheme(readCurrentTheme());
          setMode(readCurrentMode());
        }
      }}
    >
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
        <Avatar size="sm" aria-hidden="true">
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate font-medium">{userName}</span>
        <Settings
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Thème de la page</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => selectTheme(parseTheme(value))}
          >
            {THEMES.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Apparence</DropdownMenuLabel>
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

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="justify-between">
          <span className="flex items-center gap-1.5">
            <User aria-hidden="true" className="size-4" />
            <span>Mon compte</span>
          </span>
          <Badge variant="secondary">Bientôt</Badge>
        </DropdownMenuItem>

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
