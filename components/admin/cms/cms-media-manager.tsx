"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, storage } from "@/lib/firebase/client";

type MediaRow = {
  id: string;
  name: string;
  url: string;
  path: string;
  contentType?: string;
  size?: number;
};

export function CmsMediaManager() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "mediaAssets"), orderBy("createdAt", "desc")), (snap) => {
      setRows(
        snap.docs.map((document) => ({
          id: document.id,
          name: String(document.data().name ?? ""),
          url: String(document.data().url ?? ""),
          path: String(document.data().path ?? ""),
          contentType: String(document.data().contentType ?? ""),
          size: Number(document.data().size ?? 0)
        }))
      );
    });
    return () => unsub();
  }, []);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
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
      setFile(null);
      setUploadOpen(false);
      setMessage("Media uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CMS Media</CardTitle>
          <CardDescription>Single media library used by all CMS owner pages.</CardDescription>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardHeader>
        <CardContent className="pt-0">
          <Button onClick={() => setUploadOpen(true)}>Upload Media</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library Assets</CardTitle>
          <CardDescription>{rows.length} media item(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    <a href={row.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80">
                      {row.url}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">{row.path}</TableCell>
                  <TableCell>{row.contentType || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={onUpload} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
              <DialogDescription>Select an image file and upload it into the shared media library.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="media-upload-file" label="Image File" required />
              <Input id="media-upload-file" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
