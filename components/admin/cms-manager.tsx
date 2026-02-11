"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { db, storage } from "@/lib/firebase/client";
import {
  BlogPostContent,
  CertificateContent,
  ExperienceContent,
  IntegrationSettings,
  MediaAsset,
  ProfileContent,
  ProjectContent,
  SeoDefaults,
  ServiceContent,
  SocialLinkContent
} from "@/types/cms";
import { slugify } from "@/lib/utils";

const emptyProfile: ProfileContent = {
  name: "Saleh Abbaas",
  headline: "Software Engineer",
  bio: "",
  location: "",
  email: "",
  resumeUrl: "",
  avatarUrl: ""
};

const emptySeo: SeoDefaults = {
  titleTemplate: "Saleh Abbaas",
  defaultDescription: "",
  defaultOgImage: ""
};

const emptyIntegration: IntegrationSettings = {
  emailProvider: "resend",
  senderEmail: "",
  senderName: "Saleh Abbaas",
  sendgridApiKeyPlaceholder: "",
  resendApiKeyPlaceholder: "",
  mailgunApiKeyPlaceholder: "",
  mailgunDomainPlaceholder: "",
  zohoEnabled: false,
  zohoClientIdPlaceholder: "",
  zohoClientSecretPlaceholder: "",
  zohoRedirectUriPlaceholder: ""
};

const emptyExperience: Omit<ExperienceContent, "id"> = {
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  summary: "",
  achievements: [],
  sortOrder: 0
};

const emptyProject: Omit<ProjectContent, "id"> = {
  slug: "",
  title: "",
  description: "",
  longDescription: "",
  tags: [],
  coverImage: "",
  projectUrl: "",
  status: "draft",
  sortOrder: 0
};

const emptyService: Omit<ServiceContent, "id"> = {
  title: "",
  detail: "",
  sortOrder: 0
};

const emptyCertificate: Omit<CertificateContent, "id"> = {
  title: "",
  issuer: "",
  year: "",
  credentialUrl: "",
  imageUrl: "",
  sortOrder: 0
};

const emptySocial: Omit<SocialLinkContent, "id"> = {
  label: "",
  url: "",
  sortOrder: 0
};

const emptyBlog: Omit<BlogPostContent, "id"> = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  tags: [],
  coverImage: "",
  status: "draft",
  publishedAt: "",
  seoTitle: "",
  seoDesc: ""
};

function mapDocWithId<T>(id: string, data: Record<string, unknown>) {
  return { id, ...(data as T) };
}

export function CmsManager() {
  const [profile, setProfile] = useState<ProfileContent>(emptyProfile);
  const [seoDefaults, setSeoDefaults] = useState<SeoDefaults>(emptySeo);
  const [integrations, setIntegrations] = useState<IntegrationSettings>(emptyIntegration);

  const [experiences, setExperiences] = useState<ExperienceContent[]>([]);
  const [projects, setProjects] = useState<ProjectContent[]>([]);
  const [services, setServices] = useState<ServiceContent[]>([]);
  const [certificates, setCertificates] = useState<CertificateContent[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkContent[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostContent[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const [experienceForm, setExperienceForm] = useState(emptyExperience);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [certificateForm, setCertificateForm] = useState(emptyCertificate);
  const [socialForm, setSocialForm] = useState(emptySocial);
  const [blogForm, setBlogForm] = useState(emptyBlog);

  const [editingIds, setEditingIds] = useState<Record<string, string | null>>({});
  const [status, setStatus] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubProfile = onSnapshot(doc(db, "siteContent", "profile"), (snap) => {
      if (!snap.exists()) return;
      setProfile((prev) => ({ ...prev, ...(snap.data() as Partial<ProfileContent>) }));
    });

    const unsubSeo = onSnapshot(doc(db, "siteContent", "seoDefaults"), (snap) => {
      if (!snap.exists()) return;
      setSeoDefaults((prev) => ({ ...prev, ...(snap.data() as Partial<SeoDefaults>) }));
    });

    const unsubIntegrations = onSnapshot(doc(db, "siteContent", "integrations"), (snap) => {
      if (!snap.exists()) return;
      setIntegrations((prev) => ({ ...prev, ...(snap.data() as Partial<IntegrationSettings>) }));
    });

    const unsubExperiences = onSnapshot(query(collection(db, "experiences"), orderBy("sortOrder", "asc")), (snap) => {
      setExperiences(snap.docs.map((d) => mapDocWithId<ExperienceContent>(d.id, d.data() as Record<string, unknown>)));
    });

    const unsubProjects = onSnapshot(query(collection(db, "projects"), orderBy("sortOrder", "asc")), (snap) => {
      setProjects(snap.docs.map((d) => mapDocWithId<ProjectContent>(d.id, d.data() as Record<string, unknown>)));
    });

    const unsubServices = onSnapshot(query(collection(db, "services"), orderBy("sortOrder", "asc")), (snap) => {
      setServices(snap.docs.map((d) => mapDocWithId<ServiceContent>(d.id, d.data() as Record<string, unknown>)));
    });

    const unsubCertificates = onSnapshot(query(collection(db, "certificates"), orderBy("sortOrder", "asc")), (snap) => {
      setCertificates(snap.docs.map((d) => mapDocWithId<CertificateContent>(d.id, d.data() as Record<string, unknown>)));
    });

    const unsubSocial = onSnapshot(query(collection(db, "socialLinks"), orderBy("sortOrder", "asc")), (snap) => {
      setSocialLinks(snap.docs.map((d) => mapDocWithId<SocialLinkContent>(d.id, d.data() as Record<string, unknown>)));
    });

    const unsubBlog = onSnapshot(query(collection(db, "blogPosts"), orderBy("updatedAt", "desc")), (snap) => {
      setBlogPosts(snap.docs.map((d) => mapDocWithId<BlogPostContent>(d.id, d.data() as Record<string, unknown>)));
    });

    const unsubMedia = onSnapshot(query(collection(db, "mediaAssets"), orderBy("createdAt", "desc")), (snap) => {
      setMediaAssets(snap.docs.map((d) => mapDocWithId<MediaAsset>(d.id, d.data() as Record<string, unknown>)));
    });

    return () => {
      unsubProfile();
      unsubSeo();
      unsubIntegrations();
      unsubExperiences();
      unsubProjects();
      unsubServices();
      unsubCertificates();
      unsubSocial();
      unsubBlog();
      unsubMedia();
    };
  }, []);

  async function saveDocument<T extends object>(path: string, payload: T) {
    const [collectionId, documentId] = path.split("/");
    if (!collectionId || !documentId) {
      throw new Error(`Invalid document path: ${path}`);
    }

    await setDoc(doc(db, collectionId, documentId), { ...(payload as Record<string, unknown>), updatedAt: serverTimestamp() }, { merge: true });
  }

  async function upsertCollectionItem(collectionName: string, id: string | null, payload: Record<string, unknown>) {
    if (id) {
      await updateDoc(doc(db, collectionName, id), { ...payload, updatedAt: serverTimestamp() });
      return;
    }

    await addDoc(collection(db, collectionName), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async function removeCollectionItem(collectionName: string, id: string) {
    if (!window.confirm("Delete this item?")) return;
    await deleteDoc(doc(db, collectionName, id));
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveDocument("siteContent/profile", profile);
    setStatus("Profile saved.");
  }

  async function handleSeoSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveDocument("siteContent/seoDefaults", seoDefaults);
    setStatus("SEO defaults saved.");
  }

  async function handleIntegrationSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveDocument("siteContent/integrations", integrations);
    setStatus("Integration settings saved.");
  }

  async function saveExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertCollectionItem("experiences", editingIds.experience ?? null, {
      ...experienceForm,
      achievements: experienceForm.achievements
    });
    setEditingIds((prev) => ({ ...prev, experience: null }));
    setExperienceForm(emptyExperience);
    setStatus("Experience saved.");
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertCollectionItem("projects", editingIds.project ?? null, {
      ...projectForm,
      slug: projectForm.slug || slugify(projectForm.title),
      tags: projectForm.tags
    });
    setEditingIds((prev) => ({ ...prev, project: null }));
    setProjectForm(emptyProject);
    setStatus("Project saved.");
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertCollectionItem("services", editingIds.service ?? null, serviceForm as Record<string, unknown>);
    setEditingIds((prev) => ({ ...prev, service: null }));
    setServiceForm(emptyService);
    setStatus("Service saved.");
  }

  async function saveCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertCollectionItem("certificates", editingIds.certificate ?? null, certificateForm as Record<string, unknown>);
    setEditingIds((prev) => ({ ...prev, certificate: null }));
    setCertificateForm(emptyCertificate);
    setStatus("Certificate saved.");
  }

  async function saveSocial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertCollectionItem("socialLinks", editingIds.social ?? null, socialForm as Record<string, unknown>);
    setEditingIds((prev) => ({ ...prev, social: null }));
    setSocialForm(emptySocial);
    setStatus("Social link saved.");
  }

  async function saveBlog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertCollectionItem("blogPosts", editingIds.blog ?? null, {
      ...blogForm,
      slug: blogForm.slug || slugify(blogForm.title),
      tags: blogForm.tags,
      publishedAt: blogForm.status === "published" ? blogForm.publishedAt || new Date().toISOString() : null
    });
    setEditingIds((prev) => ({ ...prev, blog: null }));
    setBlogForm(emptyBlog);
    setStatus("Blog post saved.");
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mediaFile) return;

    setUploading(true);
    try {
      const path = `media/${Date.now()}-${mediaFile.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, mediaFile, { contentType: mediaFile.type });
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "mediaAssets"), {
        name: mediaFile.name,
        url,
        path,
        size: mediaFile.size,
        contentType: mediaFile.type,
        createdAt: serverTimestamp()
      });

      setMediaFile(null);
      setStatus("Media uploaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const blogStats = useMemo(() => {
    const published = blogPosts.filter((post) => post.status === "published").length;
    const draft = blogPosts.filter((post) => post.status === "draft").length;
    return { published, draft };
  }, [blogPosts]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CMS & Integrations</CardTitle>
          <CardDescription>Manage public website content, SEO defaults, media, and future integration toggles.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-3">
              <Input placeholder="Name" value={profile.name} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} />
              <Input
                placeholder="Headline"
                value={profile.headline}
                onChange={(event) => setProfile((prev) => ({ ...prev, headline: event.target.value }))}
              />
              <Textarea placeholder="Bio" value={profile.bio} onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))} />
              <Input
                placeholder="Location"
                value={profile.location}
                onChange={(event) => setProfile((prev) => ({ ...prev, location: event.target.value }))}
              />
              <Input placeholder="Email" value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} />
              <Input
                placeholder="Resume URL"
                value={profile.resumeUrl}
                onChange={(event) => setProfile((prev) => ({ ...prev, resumeUrl: event.target.value }))}
              />
              <Input
                placeholder="Avatar URL"
                value={profile.avatarUrl}
                onChange={(event) => setProfile((prev) => ({ ...prev, avatarUrl: event.target.value }))}
              />
              <Button type="submit">Save Profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSeoSave} className="space-y-3">
              <Input
                placeholder="Title template"
                value={seoDefaults.titleTemplate}
                onChange={(event) => setSeoDefaults((prev) => ({ ...prev, titleTemplate: event.target.value }))}
              />
              <Textarea
                placeholder="Default description"
                value={seoDefaults.defaultDescription}
                onChange={(event) => setSeoDefaults((prev) => ({ ...prev, defaultDescription: event.target.value }))}
              />
              <Input
                placeholder="Default OG image URL"
                value={seoDefaults.defaultOgImage}
                onChange={(event) => setSeoDefaults((prev) => ({ ...prev, defaultOgImage: event.target.value }))}
              />
              <Button type="submit">Save SEO Defaults</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email + Zoho Integration Settings</CardTitle>
          <CardDescription>Provider selection and placeholders with Zoho toggle (OFF by default).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleIntegrationSave} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Email Provider</Label>
              <Select
                value={integrations.emailProvider}
                onChange={(event) =>
                  setIntegrations((prev) => ({ ...prev, emailProvider: event.target.value as IntegrationSettings["emailProvider"] }))
                }
              >
                <option value="sendgrid">SendGrid</option>
                <option value="resend">Resend</option>
                <option value="mailgun">Mailgun</option>
                <option value="zoho">Zoho Mail</option>
              </Select>
            </div>
            <Input
              placeholder="Sender email"
              value={integrations.senderEmail}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, senderEmail: event.target.value }))}
            />
            <Input
              placeholder="Sender name"
              value={integrations.senderName}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, senderName: event.target.value }))}
            />
            <Input
              placeholder="SendGrid key placeholder"
              value={integrations.sendgridApiKeyPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, sendgridApiKeyPlaceholder: event.target.value }))}
            />
            <Input
              placeholder="Resend key placeholder"
              value={integrations.resendApiKeyPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, resendApiKeyPlaceholder: event.target.value }))}
            />
            <Input
              placeholder="Mailgun key placeholder"
              value={integrations.mailgunApiKeyPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, mailgunApiKeyPlaceholder: event.target.value }))}
            />
            <Input
              placeholder="Mailgun domain placeholder"
              value={integrations.mailgunDomainPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, mailgunDomainPlaceholder: event.target.value }))}
            />
            <Select
              value={String(integrations.zohoEnabled)}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, zohoEnabled: event.target.value === "true" }))}
            >
              <option value="false">Zoho Toggle: OFF</option>
              <option value="true">Zoho Toggle: ON</option>
            </Select>
            <Input
              placeholder="Zoho Client ID placeholder"
              value={integrations.zohoClientIdPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, zohoClientIdPlaceholder: event.target.value }))}
            />
            <Input
              placeholder="Zoho Client Secret placeholder"
              value={integrations.zohoClientSecretPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, zohoClientSecretPlaceholder: event.target.value }))}
            />
            <Input
              placeholder="Zoho Redirect URI placeholder"
              value={integrations.zohoRedirectUriPlaceholder}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, zohoRedirectUriPlaceholder: event.target.value }))}
            />
            <div className="md:col-span-3">
              <Button type="submit">Save Integration Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Experiences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={saveExperience} className="space-y-2">
              <Input placeholder="Company" value={experienceForm.company} onChange={(event) => setExperienceForm((prev) => ({ ...prev, company: event.target.value }))} />
              <Input placeholder="Role" value={experienceForm.role} onChange={(event) => setExperienceForm((prev) => ({ ...prev, role: event.target.value }))} />
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Start date" value={experienceForm.startDate} onChange={(event) => setExperienceForm((prev) => ({ ...prev, startDate: event.target.value }))} />
                <Input placeholder="End date" value={experienceForm.endDate} onChange={(event) => setExperienceForm((prev) => ({ ...prev, endDate: event.target.value }))} />
                <Input type="number" placeholder="Sort" value={experienceForm.sortOrder} onChange={(event) => setExperienceForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
              </div>
              <Textarea placeholder="Summary" value={experienceForm.summary} onChange={(event) => setExperienceForm((prev) => ({ ...prev, summary: event.target.value }))} />
              <Input
                placeholder="Achievements (comma separated)"
                value={experienceForm.achievements.join(", ")}
                onChange={(event) => setExperienceForm((prev) => ({ ...prev, achievements: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))}
              />
              <Button type="submit">{editingIds.experience ? "Update" : "Add"}</Button>
            </form>
            <div className="max-h-56 space-y-2 overflow-auto text-sm">
              {experiences.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="font-medium">{item.role} · {item.company}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingIds((prev) => ({ ...prev, experience: item.id })); setExperienceForm({ ...item }); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeCollectionItem("experiences", item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={saveProject} className="space-y-2">
              <Input placeholder="Title" value={projectForm.title} onChange={(event) => setProjectForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Slug" value={projectForm.slug} onChange={(event) => setProjectForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))} />
              <Input placeholder="Description" value={projectForm.description} onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))} />
              <Textarea placeholder="Long description" value={projectForm.longDescription} onChange={(event) => setProjectForm((prev) => ({ ...prev, longDescription: event.target.value }))} />
              <Input placeholder="Project URL" value={projectForm.projectUrl} onChange={(event) => setProjectForm((prev) => ({ ...prev, projectUrl: event.target.value }))} />
              <Input placeholder="Cover Image URL" value={projectForm.coverImage} onChange={(event) => setProjectForm((prev) => ({ ...prev, coverImage: event.target.value }))} />
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Tags (comma separated)"
                  value={projectForm.tags.join(", ")}
                  onChange={(event) => setProjectForm((prev) => ({ ...prev, tags: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))}
                />
                <Select value={projectForm.status} onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value as ProjectContent["status"] }))}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </Select>
                <Input type="number" placeholder="Sort" value={projectForm.sortOrder} onChange={(event) => setProjectForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
              </div>
              <Button type="submit">{editingIds.project ? "Update" : "Add"}</Button>
            </form>
            <div className="max-h-56 space-y-2 overflow-auto text-sm">
              {projects.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.status}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingIds((prev) => ({ ...prev, project: item.id })); setProjectForm({ ...item }); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeCollectionItem("projects", item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={saveService} className="space-y-2">
              <Input placeholder="Title" value={serviceForm.title} onChange={(event) => setServiceForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Textarea placeholder="Detail" value={serviceForm.detail} onChange={(event) => setServiceForm((prev) => ({ ...prev, detail: event.target.value }))} />
              <Input type="number" placeholder="Sort" value={serviceForm.sortOrder} onChange={(event) => setServiceForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
              <Button type="submit">{editingIds.service ? "Update" : "Add"}</Button>
            </form>
            <div className="max-h-52 space-y-2 overflow-auto text-sm">
              {services.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="font-medium">{item.title}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingIds((prev) => ({ ...prev, service: item.id })); setServiceForm({ ...item }); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => removeCollectionItem("services", item.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={saveCertificate} className="space-y-2">
              <Input placeholder="Title" value={certificateForm.title} onChange={(event) => setCertificateForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Issuer" value={certificateForm.issuer} onChange={(event) => setCertificateForm((prev) => ({ ...prev, issuer: event.target.value }))} />
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Year" value={certificateForm.year} onChange={(event) => setCertificateForm((prev) => ({ ...prev, year: event.target.value }))} />
                <Input placeholder="Credential URL" value={certificateForm.credentialUrl} onChange={(event) => setCertificateForm((prev) => ({ ...prev, credentialUrl: event.target.value }))} />
                <Input type="number" placeholder="Sort" value={certificateForm.sortOrder} onChange={(event) => setCertificateForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
              </div>
              <Input placeholder="Image URL" value={certificateForm.imageUrl} onChange={(event) => setCertificateForm((prev) => ({ ...prev, imageUrl: event.target.value }))} />
              <Button type="submit">{editingIds.certificate ? "Update" : "Add"}</Button>
            </form>
            <div className="max-h-52 space-y-2 overflow-auto text-sm">
              {certificates.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="font-medium">{item.title}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingIds((prev) => ({ ...prev, certificate: item.id })); setCertificateForm({ ...item }); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => removeCollectionItem("certificates", item.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={saveSocial} className="space-y-2">
              <Input placeholder="Label" value={socialForm.label} onChange={(event) => setSocialForm((prev) => ({ ...prev, label: event.target.value }))} />
              <Input placeholder="URL" value={socialForm.url} onChange={(event) => setSocialForm((prev) => ({ ...prev, url: event.target.value }))} />
              <Input type="number" placeholder="Sort" value={socialForm.sortOrder} onChange={(event) => setSocialForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
              <Button type="submit">{editingIds.social ? "Update" : "Add"}</Button>
            </form>
            <div className="max-h-52 space-y-2 overflow-auto text-sm">
              {socialLinks.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.url}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingIds((prev) => ({ ...prev, social: item.id })); setSocialForm({ ...item }); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => removeCollectionItem("socialLinks", item.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blog Posts</CardTitle>
            <CardDescription>{blogStats.published} published • {blogStats.draft} draft</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={saveBlog} className="space-y-2">
              <Input placeholder="Title" value={blogForm.title} onChange={(event) => setBlogForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Slug" value={blogForm.slug} onChange={(event) => setBlogForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))} />
              <Textarea placeholder="Excerpt" value={blogForm.excerpt} onChange={(event) => setBlogForm((prev) => ({ ...prev, excerpt: event.target.value }))} />
              <Textarea placeholder="Body" className="min-h-[120px]" value={blogForm.body} onChange={(event) => setBlogForm((prev) => ({ ...prev, body: event.target.value }))} />
              <Input placeholder="Cover image URL" value={blogForm.coverImage} onChange={(event) => setBlogForm((prev) => ({ ...prev, coverImage: event.target.value }))} />
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Tags (comma separated)"
                  value={blogForm.tags.join(", ")}
                  onChange={(event) => setBlogForm((prev) => ({ ...prev, tags: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))}
                />
                <Select value={blogForm.status} onChange={(event) => setBlogForm((prev) => ({ ...prev, status: event.target.value as BlogPostContent["status"] }))}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </Select>
                <Input placeholder="Published ISO date" value={blogForm.publishedAt} onChange={(event) => setBlogForm((prev) => ({ ...prev, publishedAt: event.target.value }))} />
              </div>
              <Input placeholder="SEO title" value={blogForm.seoTitle} onChange={(event) => setBlogForm((prev) => ({ ...prev, seoTitle: event.target.value }))} />
              <Textarea placeholder="SEO description" value={blogForm.seoDesc} onChange={(event) => setBlogForm((prev) => ({ ...prev, seoDesc: event.target.value }))} />
              <Button type="submit">{editingIds.blog ? "Update" : "Add"}</Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>{post.title}</TableCell>
                    <TableCell>{post.status}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingIds((prev) => ({ ...prev, blog: post.id })); setBlogForm({ ...post }); }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeCollectionItem("blogPosts", post.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media Manager (Storage)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={uploadMedia} className="flex flex-wrap items-center gap-3">
            <Input type="file" onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} />
            <Button type="submit" disabled={!mediaFile || uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
          </form>
          <div className="grid gap-3 md:grid-cols-3">
            {mediaAssets.slice(0, 30).map((asset) => (
              <a key={asset.id} href={asset.url} target="_blank" className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm hover:border-primary">
                <p className="font-medium">{asset.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{asset.path}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
