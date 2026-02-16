'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

type AgentOption = {
  id: string;
  display_name: string | null;
};

const NONE_VALUE = '__none__';
const PROJECT_STATUS_OPTIONS = ['active', 'paused', 'completed', 'archived'] as const;
const KEY_PATTERN = /^[A-Z0-9_-]+$/;

function suggestProjectKey(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 64);
}

export default function CreateProjectButton() {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [ownerAgentId, setOwnerAgentId] = useState(NONE_VALUE);
  const [status, setStatus] = useState<(typeof PROJECT_STATUS_OPTIONS)[number]>('active');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyValidationError = useMemo(() => {
    if (!projectKey.trim()) return 'Project key is required.';
    if (!KEY_PATTERN.test(projectKey.trim())) return 'Use uppercase letters, numbers, hyphen, or underscore only.';
    return null;
  }, [projectKey]);

  useEffect(() => {
    if (!open) return;

    setIsLoadingAgents(true);
    setError(null);

    const supabase = createClient();
    void supabase
      .from('mc_agents')
      .select('id, display_name')
      .eq('is_active', true)
      .order('display_name', { ascending: true })
      .then(({ data, error: agentsError }) => {
        setIsLoadingAgents(false);
        if (agentsError) {
          setError(agentsError.message);
          return;
        }
        setAgents((data ?? []) as AgentOption[]);
      });
  }, [open]);

  const resetForm = () => {
    setName('');
    setProjectKey('');
    setKeyTouched(false);
    setDescription('');
    setOwnerAgentId(NONE_VALUE);
    setStatus('active');
    setError(null);
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const onNameChange = (value: string) => {
    setName(value);
    if (!keyTouched) {
      setProjectKey(suggestProjectKey(value));
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (keyValidationError) {
      setError(keyValidationError);
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const { data, error: insertError } = await (supabase as any)
      .from('mc_projects')
      .insert({
        key: projectKey.trim(),
        name: name.trim(),
        description: description.trim() || null,
        owner_agent_id: ownerAgentId === NONE_VALUE ? null : ownerAgentId,
        status
      })
      .select('id')
      .single();

    setIsSubmitting(false);

    if (insertError) {
      if ((insertError as any).code === '23505') {
        setError(`Project key \"${projectKey.trim()}\" already exists. Please choose a unique key.`);
        return;
      }

      notify(insertError.message, 'error');
      setError(insertError.message);
      return;
    }

    closeModal();
    router.refresh();
    router.push(`/projects/${data.id}`);
  };

  return (
    <>
      <Button className="bg-[#D9FF35] text-[#172B4D] hover:bg-[#cde934]" onClick={() => setOpen(true)}>
        Create
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-[#172B4D]">Create Project</h2>
            <form className="mt-4 space-y-3" onSubmit={onSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Name *</Label>
                  <Input value={name} onChange={(event) => onNameChange(event.target.value)} required />
                </div>
                <div>
                  <Label className="mb-1 block">Key *</Label>
                  <Input
                    value={projectKey}
                    onChange={(event) => {
                      setProjectKey(event.target.value.toUpperCase());
                      setKeyTouched(true);
                    }}
                    placeholder="PROJECT_KEY"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Uppercase letters, numbers, hyphen, underscore.</p>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Description</Label>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Owner agent</Label>
                  <Select value={ownerAgentId} onValueChange={setOwnerAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAgents ? 'Loading active agents…' : 'Unassigned'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.display_name ?? 'Unnamed Agent'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1 block">Status *</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as (typeof PROJECT_STATUS_OPTIONS)[number])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
                  <p className="font-medium text-[#172B4D]">Created at</p>
                  <p className="text-muted-foreground">Will be set automatically.</p>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
                  <p className="font-medium text-[#172B4D]">Project ID</p>
                  <p className="text-muted-foreground">Will be generated automatically.</p>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || Boolean(keyValidationError) || !name.trim()}>
                  {isSubmitting ? 'Creating…' : 'Create project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
