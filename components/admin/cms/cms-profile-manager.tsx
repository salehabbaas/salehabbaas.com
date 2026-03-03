"use client";

import { FormEvent, useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { addDoc, collection } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Link from "next/link";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db, storage } from "@/lib/firebase/client";
import type { ProfileContent } from "@/types/cms";

const defaultProfile: ProfileContent = {
  name: "Saleh Abbaas",
  headline: "Software Engineer",
  bio: "",
  location: "",
  email: "",
  resumeUrl: "",
  avatarUrl: ""
};

export function CmsProfileManager() {
  const [profile, setProfile] = useState<ProfileContent>(defaultProfile);
  const [draft, setDraft] = useState<ProfileContent>(defaultProfile);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "siteContent", "profile"), (snap) => {
      if (!snap.exists()) return;
      const next = { ...defaultProfile, ...(snap.data() as Partial<ProfileContent>) };
      setProfile(next);
      if (!open) setDraft(next);
    });
    return () => unsub();
  }, [open]);

  function openEdit() {
    setDraft(profile);
    setOpen(true);
    setStep("form");
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const path = `media/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "mediaAssets"), {
        name: file.name,
        url,
        path,
        size: file.size,
        contentType: file.type,
        createdAt: serverTimestamp()
      });
      setDraft((prev) => ({ ...prev, avatarUrl: url }));
      setMessage("Avatar uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "form") {
      setStep("preview");
      return;
    }

    await setDoc(
      doc(db, "siteContent", "profile"),
      {
        ...draft,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    setProfile(draft);
    setOpen(false);
    setMessage("Profile saved.");
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CMS Profile</CardTitle>
          <CardDescription>Owner page for profile identity, biography, and avatar.</CardDescription>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Name</p>
              <p className="mt-1 font-medium">{profile.name}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Headline</p>
              <p className="mt-1 font-medium">{profile.headline}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Bio</p>
            <p className="mt-1 whitespace-pre-wrap">{profile.bio || "-"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openEdit}>Edit Profile</Button>
            <Button variant="outline" asChild>
              <Link href="/about" target="_blank" rel="noreferrer">
                Open Site
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Sections</CardTitle>
          <CardDescription>Open and update key CMS pages quickly.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/cms/experience">Edit Experience</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/cms/services">Edit Services</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/cms/projects">Edit Projects</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/cms/blog">Edit Blog</Link>
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Step {step === "form" ? "1" : "2"} of 2: {step === "form" ? "Fill fields." : "Preview then save."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            {step === "form" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <AdminFieldLabel htmlFor="profile-name" label="Name" required />
                  <Input id="profile-name" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <AdminFieldLabel htmlFor="profile-headline" label="Headline" required />
                  <Input id="profile-headline" value={draft.headline} onChange={(event) => setDraft((prev) => ({ ...prev, headline: event.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <AdminFieldLabel htmlFor="profile-bio" label="Bio" />
                  <Textarea id="profile-bio" value={draft.bio} onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <AdminFieldLabel htmlFor="profile-location" label="Location" />
                    <Input id="profile-location" value={draft.location} onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <AdminFieldLabel htmlFor="profile-email" label="Email" />
                    <Input id="profile-email" value={draft.email} onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <AdminFieldLabel htmlFor="profile-resume-url" label="Resume URL" />
                  <Input id="profile-resume-url" value={draft.resumeUrl} onChange={(event) => setDraft((prev) => ({ ...prev, resumeUrl: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <AdminFieldLabel htmlFor="profile-avatar-url" label="Avatar URL" />
                  <Input id="profile-avatar-url" value={draft.avatarUrl} onChange={(event) => setDraft((prev) => ({ ...prev, avatarUrl: event.target.value }))} />
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void uploadAvatar(file);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploading ? "Uploading selected file..." : "Select an image file to upload directly."}
                    </p>
                  </div>
                  {draft.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.avatarUrl} alt="Avatar preview" className="h-28 w-full rounded-lg border border-border/70 object-cover" />
                  ) : null}
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {draft.name}</p>
                  <p><span className="text-muted-foreground">Headline:</span> {draft.headline}</p>
                  <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Bio:</span> {draft.bio || "-"}</p>
                  <p><span className="text-muted-foreground">Location:</span> {draft.location || "-"}</p>
                  <p><span className="text-muted-foreground">Email:</span> {draft.email || "-"}</p>
                  <p><span className="text-muted-foreground">Resume URL:</span> {draft.resumeUrl || "-"}</p>
                  <p><span className="text-muted-foreground">Avatar URL:</span> {draft.avatarUrl || "-"}</p>
                  {draft.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.avatarUrl} alt="Avatar preview" className="h-32 w-full rounded-lg border border-border/70 object-cover" />
                  ) : null}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-2">
              {step === "preview" ? (
                <Button type="button" variant="outline" onClick={() => setStep("form")}>
                  Back to Form
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                {step === "preview" ? (
                  <Button type="button" variant="outline" asChild>
                    <Link href="/about" target="_blank" rel="noreferrer">
                      Open Site
                    </Link>
                  </Button>
                ) : null}
                <Button type="submit">{step === "form" ? "Continue to Preview" : "Save Profile"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
