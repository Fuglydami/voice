import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleQuerySchema } from "@/domain/query";
import { ActiveFilters } from "./ActiveFilters";

/**
 * The removable summary of what is currently applied. This is the piece the
 * original design was missing: selection state lived only inside the filter
 * controls, so once they were scrolled past or collapsed on mobile there was no
 * way to see why the result set was small, and no way to undo one choice.
 */

function renderFilters(search: string) {
  const onChange = vi.fn();
  const onReset = vi.fn();

  render(
    <ActiveFilters
      query={ArticleQuerySchema.parse(Object.fromEntries(new URLSearchParams(search)))}
      onChange={onChange}
      onReset={onReset}
    />,
  );

  return { onChange, onReset };
}

describe("ActiveFilters", () => {
  it("renders nothing when no filter is applied", () => {
    const { container } = render(
      <ActiveFilters query={ArticleQuerySchema.parse({})} onChange={vi.fn()} onReset={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a chip per applied filter", () => {
    renderFilters("q=fury&categories=sports&sources=guardian");

    expect(screen.getByText("“fury”")).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
    expect(screen.getByText("The Guardian")).toBeInTheDocument();
  });

  it("removes only the filter whose chip was clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters("sources=guardian,nyt");

    await user.click(screen.getByRole("button", { name: /remove filter the guardian/i }));

    expect(onChange).toHaveBeenCalledWith({ sources: ["nyt"] });
  });

  it("renders an author slug as a readable name", () => {
    renderFilters("authors=mary-frost");
    expect(screen.getByText("Mary Frost")).toBeInTheDocument();
  });

  it("summarises a date range as one chip", () => {
    renderFilters("from=2026-08-01&to=2026-08-10");
    expect(screen.getByText("1 Aug to 10 Aug")).toBeInTheDocument();
  });

  it("offers Clear all only once more than one filter is applied", async () => {
    const user = userEvent.setup();

    renderFilters("q=fury");
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();

    const { onReset } = renderFilters("q=fury&categories=sports");
    await user.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
