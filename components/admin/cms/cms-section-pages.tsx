"use client";

import { Badge } from "@/components/ui/badge";
import { CmsCollectionManager } from "@/components/admin/cms/cms-collection-manager";

const cmsProjectFilters = [
  {
    field: "status",
    operator: "in" as const,
    value: ["draft", "published", "hidden"]
  }
];

export function CmsProjectsPage() {
  return (
    <CmsCollectionManager
      title="CMS Projects"
      description="Owner page for projects CRUD, publish/hide, archive/restore, and media selection."
      collectionName="projects"
      orderField="sortOrder"
      orderDirection="asc"
      filters={cmsProjectFilters}
      statusField="status"
      slugField="slug"
      getSiteHref={(row) => {
        const slug = String(row.slug ?? "").trim();
        return slug ? `/projects/${slug}` : "/projects";
      }}
      defaultForm={{
        title: "",
        slug: "",
        description: "",
        longDescription: "",
        tags: [],
        coverImage: "",
        projectUrl: "",
        status: "draft",
        sortOrder: 0,
        isDeleted: false
      }}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "slug", label: "Slug", type: "slug", required: true, autoFrom: "title" },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "longDescription", label: "Long Description", type: "textarea" },
        { key: "projectUrl", label: "Project URL", type: "url" },
        { key: "coverImage", label: "Cover Image", type: "image" },
        { key: "tags", label: "Tags", type: "tags", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" }
          ]
        },
        { key: "sortOrder", label: "Sort Order", type: "number" }
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "slug", label: "Slug" },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge variant={String(row.status) === "published" ? "secondary" : "outline"}>{String(row.status ?? "draft")}</Badge>
        },
        { key: "sortOrder", label: "Sort" }
      ]}
    />
  );
}

export function CmsBlogPage() {
  return (
    <CmsCollectionManager
      title="CMS Blog"
      description="Owner page for blog CRUD, SEO fields, publish/hide, archive/restore, and media selection."
      collectionName="blogPosts"
      orderField="updatedAt"
      orderDirection="desc"
      statusField="status"
      slugField="slug"
      getSiteHref={(row) => {
        const slug = String(row.slug ?? "").trim();
        return slug ? `/blog/${slug}` : "/blog";
      }}
      defaultForm={{
        title: "",
        slug: "",
        excerpt: "",
        body: "",
        tags: [],
        coverImage: "",
        status: "draft",
        publishedAt: "",
        seoTitle: "",
        seoDesc: "",
        isDeleted: false
      }}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "slug", label: "Slug", type: "slug", required: true, autoFrom: "title" },
        { key: "excerpt", label: "Excerpt", type: "textarea", required: true },
        { key: "body", label: "Body", type: "textarea", required: true },
        { key: "coverImage", label: "Cover Image", type: "image" },
        { key: "tags", label: "Tags", type: "tags", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" }
          ]
        },
        { key: "publishedAt", label: "Published At (ISO)", type: "text" },
        { key: "seoTitle", label: "SEO Title", type: "text" },
        { key: "seoDesc", label: "SEO Description", type: "textarea" }
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "slug", label: "Slug" },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge variant={String(row.status) === "published" ? "secondary" : "outline"}>{String(row.status ?? "draft")}</Badge>
        },
        { key: "publishedAt", label: "Published At" }
      ]}
    />
  );
}

export function CmsExperiencePage() {
  return (
    <CmsCollectionManager
      title="CMS Experience"
      description="Owner page for experience records with publish/hide and archive/restore."
      collectionName="experiences"
      orderField="sortOrder"
      orderDirection="asc"
      statusField="status"
      getSiteHref={() => "/experience"}
      defaultForm={{
        companyId: "",
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        summary: "",
        achievements: [],
        sortOrder: 0,
        status: "published",
        isDeleted: false
      }}
      fields={[
        { key: "company", label: "Company", type: "company", required: true },
        { key: "role", label: "Role", type: "text", required: true },
        { key: "startDate", label: "Start Date", type: "text" },
        { key: "endDate", label: "End Date", type: "text" },
        { key: "summary", label: "Summary", type: "textarea", required: true },
        { key: "achievements", label: "Achievements", type: "tags" },
        { key: "sortOrder", label: "Sort Order", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" }
          ]
        }
      ]}
      columns={[
        { key: "company", label: "Company" },
        { key: "role", label: "Role" },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge variant={String(row.status ?? "published") === "published" ? "secondary" : "outline"}>{String(row.status ?? "published")}</Badge>
        },
        { key: "sortOrder", label: "Sort" }
      ]}
    />
  );
}

export function CmsServicesPage() {
  return (
    <CmsCollectionManager
      title="CMS Services"
      description="Owner page for service cards with publish/hide and archive/restore."
      collectionName="services"
      orderField="sortOrder"
      orderDirection="asc"
      statusField="status"
      getSiteHref={() => "/services"}
      defaultForm={{
        title: "",
        detail: "",
        sortOrder: 0,
        status: "published",
        isDeleted: false
      }}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "detail", label: "Detail", type: "textarea", required: true },
        { key: "sortOrder", label: "Sort Order", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" }
          ]
        }
      ]}
      columns={[
        { key: "title", label: "Title" },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge variant={String(row.status ?? "published") === "published" ? "secondary" : "outline"}>{String(row.status ?? "published")}</Badge>
        },
        { key: "sortOrder", label: "Sort" }
      ]}
    />
  );
}

export function CmsCertificatesPage() {
  return (
    <CmsCollectionManager
      title="CMS Certificates"
      description="Owner page for certificates with image upload/select, publish/hide, and archive/restore."
      collectionName="certificates"
      orderField="sortOrder"
      orderDirection="asc"
      statusField="status"
      getSiteHref={() => "/certificates"}
      defaultForm={{
        title: "",
        issuer: "",
        year: "",
        credentialUrl: "",
        imageUrl: "",
        sortOrder: 0,
        status: "published",
        isDeleted: false
      }}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "issuer", label: "Issuer", type: "text", required: true },
        { key: "year", label: "Year", type: "text" },
        { key: "credentialUrl", label: "Credential URL", type: "url" },
        { key: "imageUrl", label: "Image URL", type: "image" },
        { key: "sortOrder", label: "Sort Order", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" }
          ]
        }
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "issuer", label: "Issuer" },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge variant={String(row.status ?? "published") === "published" ? "secondary" : "outline"}>{String(row.status ?? "published")}</Badge>
        },
        { key: "sortOrder", label: "Sort" }
      ]}
    />
  );
}

export function CmsSocialPage() {
  return (
    <CmsCollectionManager
      title="CMS Social"
      description="Owner page for social links with publish/hide and archive/restore."
      collectionName="socialLinks"
      orderField="sortOrder"
      orderDirection="asc"
      statusField="status"
      getSiteHref={() => "/"}
      defaultForm={{
        label: "",
        url: "",
        sortOrder: 0,
        status: "published",
        isDeleted: false
      }}
      fields={[
        { key: "label", label: "Label", type: "text", required: true },
        { key: "url", label: "URL", type: "url", required: true },
        { key: "sortOrder", label: "Sort Order", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" }
          ]
        }
      ]}
      columns={[
        { key: "label", label: "Label" },
        { key: "url", label: "URL" },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge variant={String(row.status ?? "published") === "published" ? "secondary" : "outline"}>{String(row.status ?? "published")}</Badge>
        },
        { key: "sortOrder", label: "Sort" }
      ]}
    />
  );
}
