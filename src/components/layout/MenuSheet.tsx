"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/Icon";
import { activeNavHref, NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * The mobile navigation sheet. It does not exist above `lg`, where the rail
 * already shows every section — a menu should reveal what is hidden, not repeat
 * what is shown. Below `lg` the rail truncates and Search and My Feed collapse
 * to icons, so the sheet is the expanded form of exactly those controls.
 */
/**
 * `useSearchParams` forces client rendering on its subtree, and this sheet lives
 * in the root layout — unguarded it breaks the prerender of every static route.
 * Only the active-item lookup sits behind the boundary.
 */
export function MenuSheet() {
  return (
    <Suspense fallback={<MenuSheetView activeHref={null} />}>
      <ActiveMenuSheet />
    </Suspense>
  );
}

function ActiveMenuSheet() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <MenuSheetView
      activeHref={activeNavHref(pathname, {
        view: searchParams.get("view"),
        category: searchParams.get("category"),
      })}
    />
  );
}

function MenuSheetView({ activeHref }: { activeHref: string | null }) {
  const [open, setOpen] = useState(false);
  const active = activeHref;

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
          <Icon name="menu" size={19} />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[min(20rem,88vw)] gap-0 p-0">
        <SheetHeader className="px-5 py-4">
          <SheetTitle className="font-display text-wordmark tracking-[0.14em] uppercase">
            Voice
          </SheetTitle>
        </SheetHeader>

        <Separator />

        <nav aria-label="Primary" className="overflow-y-auto p-4">
          {/* Labelled versions of the two masthead controls that are icon-only
              on small screens. */}
          <div className="grid gap-1.5">
            <Button asChild variant="outline" className="justify-start gap-2.5">
              <Link href="/search" onClick={close}>
                <Icon name="search" size={17} />
                Search and filter
              </Link>
            </Button>

            <Button asChild variant="outline" className="justify-start gap-2.5">
              <Link href="/feed" onClick={close}>
                <Icon name="person" size={17} />
                My Feed
              </Link>
            </Button>
          </div>

          <p className="text-ink-faint mt-stack mb-element px-1 text-kicker font-semibold tracking-wider uppercase">
            Sections
          </p>

          {/* A grid, not a list: eleven sections fit on one screen this way,
              which is the entire advantage the sheet has over the scroll rail
              it replaces. */}
          <ul className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === active;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "hover:bg-muted flex items-center rounded-md px-3 py-2.5 text-nav transition-colors",
                      isActive ? "bg-muted text-ink font-semibold" : "text-ink-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
