import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CvToolbar } from "./cv-toolbar";

const { toPng } = vi.hoisted(() => ({ toPng: vi.fn() }));
vi.mock("html-to-image", () => ({ toPng }));

describe("CvToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "print").mockImplementation(() => {});
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    document.body.innerHTML = '<div id="cv-document"></div>';
  });
  it("imprime à la demande PDF", () => {
    render(<CvToolbar username="remy" />);
    fireEvent.click(screen.getByRole("button", { name: "Télécharger en PDF" }));
    expect(window.print).toHaveBeenCalledOnce();
  });
  it("exporte le document PNG sous le pseudo", async () => {
    toPng.mockResolvedValue("data:image/png;base64,aGVsbG8=");
    let downloaded: { filename: string; href: string } | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloaded = { filename: this.download, href: this.href };
    });
    render(<CvToolbar username="remy" />);
    fireEvent.click(screen.getByRole("button", { name: "Télécharger en PNG" }));
    await waitFor(() =>
      expect(toPng).toHaveBeenCalledWith(document.getElementById("cv-document"), {
        pixelRatio: 2,
        cacheBust: true,
      }),
    );
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(downloaded).toEqual({ filename: "cv-remy.png", href: "data:image/png;base64,aGVsbG8=" });
  });
  it("lance l'impression au montage pour l'action PDF", async () => {
    render(<CvToolbar username="remy" autoAction="pdf" />);
    await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
  });
});
