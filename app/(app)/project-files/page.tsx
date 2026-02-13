'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, RefreshCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';

type FileTypeFilter = 'all' | 'pdf' | 'xlsx' | 'pptx' | 'docx' | 'png' | 'zip' | 'other';

type ArtifactFile = {
  name: string;
  fullPath: string;
  extension: string;
  bytes: number;
  updatedAt: string | null;
  ticketKey: string | null;
};

type ScanProgress = {
  foldersScanned: number;
  filesFound: number;
};

const BUCKET = 'mc-artifacts';
const ROOT_PREFIX = 'artifacts';
const PAGE_SIZE = 100;

const TICKET_KEY_REGEX = /\b((?:MC|TICKET)-\d+)\b/i;

function detectTicketKey(path: string) {
  const match = path.match(TICKET_KEY_REGEX);
  return match ? match[1].toUpperCase() : null;
}

function normalizeExtension(filename: string) {
  const raw = filename.split('.').pop()?.toLowerCase();
  if (!raw || raw === filename.toLowerCase()) return 'other';
  if (['pdf', 'xlsx', 'pptx', 'docx', 'png', 'zip'].includes(raw)) return raw;
  return 'other';
}

function prettySize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

async function listFolderPage(path: string, offset: number) {
  const supabase = createClient();
  return supabase.storage.from(BUCKET).list(path, {
    limit: PAGE_SIZE,
    offset,
    sortBy: { column: 'name', order: 'asc' }
  });
}

async function scanArtifacts(onProgress?: (progress: ScanProgress) => void) {
  const files: ArtifactFile[] = [];
  const queue: Array<{ path: string; depth: number }> = [{ path: ROOT_PREFIX, depth: 0 }];
  let foldersScanned = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    foldersScanned += 1;
    let offset = 0;

    while (true) {
      const { data, error } = await listFolderPage(current.path, offset);

      if (error) {
        throw error;
      }

      const rows = data ?? [];
      if (rows.length === 0) break;

      for (const row of rows) {
        if (!row.name) continue;

        const fullPath = `${current.path}/${row.name}`;
        const metadata = (row.metadata ?? {}) as { size?: number };
        const size = typeof metadata.size === 'number' ? metadata.size : 0;

        if (row.id) {
          files.push({
            name: row.name,
            fullPath,
            extension: normalizeExtension(row.name),
            bytes: size,
            updatedAt: row.updated_at ?? row.created_at ?? null,
            ticketKey: detectTicketKey(fullPath)
          });
        } else if (current.depth < 8) {
          queue.push({ path: fullPath, depth: current.depth + 1 });
        }
      }

      onProgress?.({ foldersScanned, filesFound: files.length });

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return files.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

async function resolveDownloadUrl(path: string) {
  const supabase = createClient();
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  if (publicData.publicUrl) {
    try {
      const head = await fetch(publicData.publicUrl, { method: 'HEAD' });
      if (head.ok) return publicData.publicUrl;
    } catch {
      // ignored and fallback to signed url
    }
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export default function ProjectFilesPage() {
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState<FileTypeFilter>('all');
  const [ticketKey, setTicketKey] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [progress, setProgress] = useState<ScanProgress>({ foldersScanned: 0, filesFound: 0 });
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const { data = [], isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['project-files', BUCKET, ROOT_PREFIX],
    queryFn: () => scanArtifacts(setProgress),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30
  });

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    const ticketLower = ticketKey.trim().toLowerCase();

    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return data.filter((file) => {
      const matchesSearch = !searchLower || file.name.toLowerCase().includes(searchLower);
      const matchesType = fileType === 'all' || file.extension === fileType;
      const matchesTicket = !ticketLower || (file.ticketKey ? file.ticketKey.toLowerCase().includes(ticketLower) : false);

      const fileDate = file.updatedAt ? new Date(file.updatedAt) : null;
      const matchesFrom = !fromDate || (fileDate ? fileDate >= fromDate : false);
      const matchesTo = !toDate || (fileDate ? fileDate <= toDate : false);

      return matchesSearch && matchesType && matchesTicket && matchesFrom && matchesTo;
    });
  }, [data, dateFrom, dateTo, fileType, search, ticketKey]);

  const onDownload = async (path: string) => {
    try {
      setDownloadingPath(path);
      const url = await resolveDownloadUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      console.error(downloadError);
      alert('Download failed. Check your Storage RLS policies for list/select/object access.');
    } finally {
      setDownloadingPath(null);
    }
  };

  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Unable to list files. Storage RLS/policies may be blocking list access for this user.';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="h1 font-[var(--font-heading)]">Project Files</h1>
          <p className="text-body">Browse artifacts uploaded by agents from Supabase Storage.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
        <Input placeholder="Search filename contains..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search filename" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={fileType} onValueChange={(value) => setFileType(value as FileTypeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="File type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="xlsx">XLSX</SelectItem>
              <SelectItem value="pptx">PPTX</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="zip">ZIP</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
          <Input placeholder="Ticket key (e.g. MC-101)" value={ticketKey} onChange={(e) => setTicketKey(e.target.value)} aria-label="Ticket key" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Filename</TableHeaderCell>
              <TableHeaderCell>Ticket</TableHeaderCell>
              <TableHeaderCell>Path</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Size</TableHeaderCell>
              <TableHeaderCell>Updated</TableHeaderCell>
              <TableHeaderCell>Download</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(isLoading || isFetching) && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex items-center gap-2 text-sm text-mutedForeground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning storage folders... ({progress.foldersScanned} folders, {progress.filesFound} files)
                  </div>
                </TableCell>
              </TableRow>
            )}

            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="text-destructive">
                  Failed to load project files. Storage RLS/policy likely needs update for list/download access. Details: {errorMessage}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-mutedForeground">
                  No files found for current filters.
                </TableCell>
              </TableRow>
            )}

            {!isError &&
              filtered.map((file) => (
                <TableRow key={file.fullPath}>
                  <TableCell className="font-medium">{file.name}</TableCell>
                  <TableCell>
                    {file.ticketKey ? (
                      <Link href={`/tickets/key/${encodeURIComponent(file.ticketKey)}`} className="text-blue-700 underline underline-offset-2">
                        {file.ticketKey}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-mutedForeground">{file.fullPath}</TableCell>
                  <TableCell className="uppercase">{file.extension}</TableCell>
                  <TableCell>{prettySize(file.bytes)}</TableCell>
                  <TableCell>{formatDate(file.updatedAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => onDownload(file.fullPath)} disabled={downloadingPath === file.fullPath}>
                      {downloadingPath === file.fullPath ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
