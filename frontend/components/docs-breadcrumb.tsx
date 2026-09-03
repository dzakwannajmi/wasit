"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { findNavPage } from "@/lib/docs-nav"

export function DocsBreadcrumb() {
  const pathname = usePathname()
  const slug = pathname.replace(/^\/docs\/?/, "").split("/").filter(Boolean)
  const found = findNavPage(slug)
  const pageTitle = found?.page.title ?? "Docs"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {found?.group && (
          <>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/docs/${found.group.pages[0].slug.join("/")}`}>
                {found.group.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
          </>
        )}
        <BreadcrumbItem>
          <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
