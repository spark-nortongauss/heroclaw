'use client';

import { useMemo, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

type ArtifactItem = {
  id: string;
  name: string | null;
  filename: string | null;
  kind: string | null;
  created_at: string | null;
  url: string | null;
  object_path: string | null;
};

type TicketArtifactsPanelProps = {
  artifacts: ArtifactItem[];
  artifactsErrorMessage: string | null;
};

const STORAGE_BUCKET_CANDIDATES = ['mc-artifacts', 'ticket-attachments'];

function artifactLabel(artifact: ArtifactItem) {
  return artifact.name ?? artifact.filename ?? artifact.kind ?? artifact.id;
}

async function resolveArtifactDownloadUrl(artifact: ArtifactItem) {
  if (artifact.url) return artifact.url;
  if (!artifact.object_path) throw new Error('Artifact has no storage path.');

  const supabase = createClient();

  for (const bucket of STORAGE_BUCKET_CANDIDATES) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(artifact.object_path, 120);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  throw new Error('Unable to create a download URL for this artifact.');
}

export default function TicketArtifactsPanel({ artifacts, artifactsErrorMessage }: TicketArtifactsPanelProps) {
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  const selectedArtifacts = useMemo(
    () => artifacts.filter((artifact) => selectedArtifactIds.includes(artifact.id)),
    [artifacts, selectedArtifactIds]
  );

  const allSelected = artifacts.length > 0 && selectedArtifactIds.length === artifacts.length;

  const toggleSelected = (artifactId: string, checked: boolean) => {
    setSelectedArtifactIds((current) => {
      if (checked) {
        if (current.includes(artifactId)) return current;
        return [...current, artifactId];
      }
      return current.filter((id) => id !== artifactId);
    });
  };

  const onToggleAll = (checked: boolean) => {
    setSelectedArtifactIds(checked ? artifacts.map((artifact) => artifact.id) : []);
  };

  const onDownloadSelected = async () => {
    if (selectedArtifacts.length === 0) return;

    try {
      setDownloading(true);
      const urls = await Promise.all(selectedArtifacts.map((artifact) => resolveArtifactDownloadUrl(artifact)));
      urls.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
    } catch (error) {
      console.error(error);
      window.alert('Failed to download one or more selected artifacts.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-3" id="attachments">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Artifacts</h2>
        <button
          className="rounded border border-border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedArtifacts.length === 0 || downloading}
          onClick={() => void onDownloadSelected()}
          type="button"
        >
          {downloading ? 'Preparing…' : `Download selected (${selectedArtifacts.length})`}
        </button>
      </div>

      <div className="mt-2 space-y-2 text-sm">
        {artifactsErrorMessage && <p className="text-red-600">Failed to load artifacts: {artifactsErrorMessage}</p>}
        {!artifactsErrorMessage && artifacts.length === 0 && <p className="text-muted-foreground">No artifacts linked.</p>}

        {!artifactsErrorMessage && artifacts.length > 0 && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 pb-1 text-xs text-muted-foreground">
              <input checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} type="checkbox" />
              Select all
            </label>

            {artifacts.map((artifact) => (
              <label className="flex items-start gap-2" key={artifact.id}>
                <input
                  checked={selectedArtifactIds.includes(artifact.id)}
                  onChange={(event) => toggleSelected(artifact.id, event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="font-medium">{artifactLabel(artifact)}</span>
                  {artifact.object_path ? <span className="text-muted-foreground"> · {artifact.object_path}</span> : null}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
