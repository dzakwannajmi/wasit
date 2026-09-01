"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, ExternalLink } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DOCS_NAV } from "@/lib/docs-nav"

function pageHref(slug: string[]): string {
  return slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`
}

function isActivePage(pathname: string, slug: string[]): boolean {
  return pathname === pageHref(slug)
}

/**
 * The left nav: a fixed site map (unlike the right-hand DocsToc, which
 * rebuilds itself per page). A group's own row only ever expands or
 * collapses it — every actual page link is one level down, in
 * SidebarMenuSubButton, matching shadcn's sidebar-07 nav-main pattern.
 */
export function DocsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  // Which groups are expanded. Seeded from whichever group holds the
  // page you land on; after that it's yours — navigating to a page in a
  // different group only ever adds an entry here, it never collapses a
  // group you opened yourself.
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const entry of DOCS_NAV) {
      if (entry.kind === "group") {
        initial[entry.title] = entry.pages.some((p) => isActivePage(pathname, p.slug))
      }
    }
    return initial
  })

  React.useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false
      const next = { ...prev }
      for (const entry of DOCS_NAV) {
        if (
          entry.kind === "group" &&
          entry.pages.some((p) => isActivePage(pathname, p.slug)) &&
          !next[entry.title]
        ) {
          next[entry.title] = true
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [pathname])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="flex size-8 items-center justify-center rounded-md border border-sidebar-border text-xs">
                  W
                </span>
                <span className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">wasit</span>
                  <span className="text-xs text-sidebar-foreground/60">docs</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Docs</SidebarGroupLabel>
          <SidebarMenu>
            {DOCS_NAV.map((entry) => {
              const Icon = entry.icon

              if (entry.kind === "link") {
                return (
                  <SidebarMenuItem key={entry.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={entry.title}
                      isActive={isActivePage(pathname, entry.page.slug)}
                    >
                      <Link href={pageHref(entry.page.slug)}>
                        <Icon />
                        <span>{entry.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              const groupActive = entry.pages.some((p) => isActivePage(pathname, p.slug))

              return (
                <Collapsible
                  key={entry.title}
                  asChild
                  open={openGroups[entry.title] ?? false}
                  onOpenChange={(open) =>
                    setOpenGroups((prev) => ({ ...prev, [entry.title]: open }))
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={entry.title} isActive={groupActive}>
                        <Icon />
                        <span>{entry.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {entry.pages.map((page) => (
                          <SidebarMenuSubItem key={page.slug.join("/")}>
                            <SidebarMenuSubButton asChild isActive={isActivePage(pathname, page.slug)}>
                              <Link href={pageHref(page.slug)}>
                                <span>{page.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="GitHub">
              <a href="https://github.com/dzakwannajmi/wasit" target="_blank" rel="noreferrer">
                <ExternalLink />
                <span>GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
