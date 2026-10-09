'use client';

import React, { useState } from 'react';
import { RefreshCw, Copy, Check, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getSessionToken } from '@/lib/api/client';
import { importSession } from '@/lib/api/session';
import { copyText } from '@/lib/utils';

interface Props {
  onSessionImported: () => void;
}

export function SyncCodePopover({ onSessionImported }: Props) {
  const [copied, setCopied] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(false);

  const token = getSessionToken();

  const handleCopy = async () => {
    if (!token) return;
    await copyText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    const code = importCode.trim();
    if (!code) return;
    setImporting(true);
    setImportError('');
    const ok = await importSession(code);
    setImporting(false);
    if (ok) {
      setImportCode('');
      setOpen(false);
      onSessionImported();
    } else {
      setImportError('Sync code not found. Check and try again.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Sync
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Sync patterns across browsers</TooltipContent>
      </Tooltip>

      <PopoverContent side="bottom" align="end" className="w-80 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your Sync Code
          </Label>
          <p className="text-xs text-muted-foreground">
            Copy this code into another browser to access your patterns there.
          </p>
          <div className="flex gap-1.5">
            <Input
              readOnly
              value={token ?? '—'}
              className="h-8 font-mono text-xs"
            />
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Import Code
          </Label>
          <p className="text-xs text-muted-foreground">
            Paste a sync code from another browser to switch to that account.
          </p>
          <div className="flex gap-1.5">
            <Input
              placeholder="Paste sync code…"
              value={importCode}
              onChange={(e) => { setImportCode(e.target.value); setImportError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              className="h-8 font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={importing || !importCode.trim()}
              onClick={handleImport}
            >
              <LogIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          {importError && (
            <p className="text-xs text-destructive">{importError}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
