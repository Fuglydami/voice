import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/domain/article";

export interface NavItem {
  label: string;
  href: string;
  /** Present for the category entries; absent for the two view entries. */
  category?: Category;
}

// "My Feed" is deliberately absent: the rail lists sections of the news, and a
// personal saved view is a different kind of destination. It lives in the masthead.
export const NAV_ITEMS: NavItem[] = [
  { label: "Top News", href: "/" },
  { label: "Latest", href: "/?view=latest" },
  ...CATEGORIES.filter((category) => category !== "general").map((category) => ({
    label: CATEGORY_LABELS[category],
    href: `/?category=${category}`,
    category,
  })),
];

/** Which nav item should read as current, given the URL. */
export function activeNavHref(
  pathname: string,
  params: { view?: string | null; category?: string | null },
): string | null {
  if (pathname !== "/") return null;
  if (params.category) return `/?category=${params.category}`;
  if (params.view === "latest") return "/?view=latest";
  return "/";
}
