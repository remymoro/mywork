import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DashboardRefresh } from "./dashboard-refresh";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const now = Date.parse("2026-10-23T12:00:00Z");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); refresh.mockClear(); });
afterEach(() => vi.useRealTimers());

it("rafraîchit chaque minute et au retour sur l'onglet visible", () => {
  const { unmount } = render(<DashboardRefresh refreshAt={new Date(now + 60_000).toISOString()} />);
  act(() => vi.advanceTimersByTime(60_000));
  expect(refresh).toHaveBeenCalled();
  refresh.mockClear();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(refresh).not.toHaveBeenCalled();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(refresh).toHaveBeenCalledTimes(1);
  refresh.mockClear();
  act(() => vi.advanceTimersByTime(60_000));
  expect(refresh).toHaveBeenCalledTimes(1);
  unmount(); refresh.mockClear();
  act(() => { vi.advanceTimersByTime(120_000); document.dispatchEvent(new Event("visibilitychange")); });
  expect(refresh).not.toHaveBeenCalled();
});

it("rafraîchit à la transition prévue et remplace le minuteur quand le serveur répond", () => {
  const { rerender } = render(<DashboardRefresh refreshAt={new Date(now + 5_000).toISOString()} />);
  act(() => vi.advanceTimersByTime(4_999)); expect(refresh).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1)); expect(refresh).toHaveBeenCalledTimes(1);
  refresh.mockClear();
  rerender(<DashboardRefresh refreshAt={new Date(now + 10_000).toISOString()} />);
  act(() => vi.advanceTimersByTime(5_000)); expect(refresh).toHaveBeenCalledTimes(1);
});

it("relit immédiatement des données devenues anciennes pendant le chargement", () => {
  render(<DashboardRefresh refreshAt={new Date(now - 5_000).toISOString()} />);
  act(() => vi.advanceTimersByTime(0));
  expect(refresh).toHaveBeenCalledTimes(1);
});
