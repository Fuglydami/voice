import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Facet } from "@/domain/article";
import { FacetList } from "./FacetList";

/**
 * Behaviours that make a faceted filter usable rather than decorative: visible
 * counts, reversible selection, and never hiding the control that produced the
 * current view.
 */

const sources: Facet[] = [
  { value: "guardian", label: "The Guardian", count: 40 },
  { value: "newsapi", label: "NewsAPI", count: 27 },
  { value: "nyt", label: "The New York Times", count: 10 },
];

function renderList(props: Partial<Parameters<typeof FacetList>[0]> = {}) {
  const onToggle = vi.fn();
  render(<FacetList facets={sources} selected={[]} onToggle={onToggle} {...props} />);
  return { onToggle };
}

describe("FacetList", () => {
  it("shows a match count beside every value", () => {
    renderList();
    expect(screen.getByRole("checkbox", { name: /The Guardian/ })).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("selects a value on click", async () => {
    const user = userEvent.setup();
    const { onToggle } = renderList();

    await user.click(screen.getByRole("checkbox", { name: /NewsAPI/ }));

    expect(onToggle).toHaveBeenCalledWith("newsapi");
  });

  it("reports selection state to assistive technology", () => {
    renderList({ selected: ["guardian"] });
    expect(screen.getByRole("checkbox", { name: /The Guardian/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /NewsAPI/ })).not.toBeChecked();
  });

  /**
   * Regression: a selected value whose count drops to zero must not vanish, or
   * the reader is stranded with a filter they can no longer see or switch off.
   */
  it("keeps a selected value visible even when it has no matches", () => {
    renderList({ facets: [], selected: ["nyt"] });
    expect(screen.getByRole("checkbox", { name: /nyt/i })).toBeChecked();
  });

  /**
   * Regression: showing the empty hint during the first fetch made an ordinary
   * load announce "No sources configured" at a correctly configured reader.
   */
  it("holds back the empty hint while loading", () => {
    renderList({ facets: [], isLoading: true, emptyHint: "No sources configured." });
    expect(screen.queryByText("No sources configured.")).not.toBeInTheDocument();
  });

  it("explains itself once loaded with nothing to show", () => {
    renderList({ facets: [], emptyHint: "Authors appear once articles load." });
    expect(screen.getByText("Authors appear once articles load.")).toBeInTheDocument();
  });

  it("renders a selected value's display label rather than its raw key", () => {
    renderList({
      facets: [],
      selected: ["adam-gabbatt"],
      labelFor: (value) =>
        value
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
    });

    expect(screen.getByRole("checkbox", { name: /Adam Gabbatt/ })).toBeInTheDocument();
    expect(screen.queryByText("adam-gabbatt")).not.toBeInTheDocument();
  });

  it("collapses a long list behind a show-more control", async () => {
    const user = userEvent.setup();
    renderList({ collapseAfter: 2 });

    expect(screen.queryByRole("checkbox", { name: /New York Times/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show 1 more/i }));
    expect(screen.getByRole("checkbox", { name: /New York Times/ })).toBeInTheDocument();
  });

  it("filters the list from the search box", async () => {
    const user = userEvent.setup();
    renderList({ searchable: true, searchLabel: "source", collapseAfter: 2 });

    await user.type(screen.getByRole("textbox", { name: /filter sources/i }), "guard");

    expect(screen.getByRole("checkbox", { name: /The Guardian/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /NewsAPI/ })).not.toBeInTheDocument();
  });
});
