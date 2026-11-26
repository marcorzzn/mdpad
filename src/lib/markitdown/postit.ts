import type { FolderFileSummary, FolderPostItResult } from './types.ts';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function cleanSnippet(text: string, maxLen = 150): string {
  const normalized = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[|`*_~>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return 'Contenuto multimediale o strutturato.';
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1).trimEnd()}…`;
}

export function extractMarkdownHeadings(markdown: string, limit = 4): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const cleaned = match[2]
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[#*_`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned && !headings.includes(cleaned)) {
        headings.push(cleaned);
        if (headings.length >= limit) break;
      }
    }
  }
  return headings;
}

export function buildInfoTip(folderName: string, items: FolderFileSummary[], customBullets?: string[]): string {
  if (customBullets && customBullets.length > 0) {
    const joined = customBullets
      .map((b) => b.replace(/^[-*]\s*/, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(' | ');
    return `${folderName} (${items.length} file): ${joined}`.slice(0, 240);
  }

  const okItems = items.filter((f) => f.status === 'ok');
  const highlights = okItems
    .slice(0, 3)
    .map((f) => `${f.filename}${f.title ? ` (${f.title})` : ''}`)
    .join(', ');
  const rest = okItems.length > 3 ? ` + altri ${okItems.length - 3}` : '';
  return `${folderName} — ${items.length} file: ${highlights}${rest}`.slice(0, 240);
}

export function buildWindowsDesktopIni(infoTip: string): string {
  const safeTip = infoTip.replace(/[\r\n]+/g, ' ').trim();
  return [
    '[.ShellClassInfo]',
    `InfoTip=${safeTip}`,
    'IconResource=%SystemRoot%\\System32\\SHELL32.dll,4',
    '',
  ].join('\r\n');
}

export function buildLinuxDirectoryFile(infoTip: string): string {
  const safeTip = infoTip.replace(/[\r\n]+/g, ' ').trim();
  return [
    '[Desktop Entry]',
    `Comment=${safeTip}`,
    'Icon=folder-documents',
    '',
  ].join('\n');
}

export function buildWindowsApplyBat(folderName: string): string {
  return [
    '@echo off',
    'REM Attiva il tooltip desktop.ini su Windows 7 Starter (32-bit), 8, 10 e 11',
    `echo Applicazione Post-it Windows per la cartella "${folderName}"...`,
    'attrib +h +s desktop.ini',
    'attrib +r "%~dp0."',
    'echo Completato! Passa il mouse sulla cartella in Esplora File o apri _POST-IT.md.',
    'pause',
    '',
  ].join('\r\n');
}

export function buildLocalFolderPostIt(
  folderName: string,
  items: FolderFileSummary[],
  customNote?: string
): FolderPostItResult {
  const okItems = items.filter((i) => i.status === 'ok');
  const failedItems = items.filter((i) => i.status === 'error');
  const today = new Date().toISOString().slice(0, 10);

  const extCounts = new Map<string, number>();
  for (const item of items) {
    const dot = item.filename.lastIndexOf('.');
    const ext = dot !== -1 ? item.filename.slice(dot).toLowerCase() : '(senza est.)';
    extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
  }
  const formatSummary = [...extCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `${count} ${ext}`)
    .join(', ');

  const bulletLines: string[] = [];
  for (const item of okItems) {
    const label = item.title && item.title !== item.filename
      ? `**${item.filename}** — *${item.title}*`
      : `**${item.filename}**`;
    const detail = item.headings.length > 0
      ? `Sezioni: ${item.headings.slice(0, 3).join(' · ')}. ${cleanSnippet(item.excerpt, 110)}`
      : cleanSnippet(item.excerpt, 140);
    bulletLines.push(`- ${label}: ${detail}`);
  }
  for (const item of failedItems) {
    bulletLines.push(`- **${item.filename}**: file non convertito (${item.error ?? 'formato binario'})`);
  }

  const tableRows = items.map((item) => {
    const safeName = item.relativePath.replace(/\|/g, '\\|');
    const summary = (item.title || cleanSnippet(item.excerpt, 64)).replace(/\|/g, '\\|');
    return `| \`${safeName}\` | ${item.converterUsed} | ${formatBytes(item.sizeBytes)} | ${summary} |`;
  });

  const mdParts: string[] = [
    `# Post-it Cartella: ${folderName}`,
    '',
    `> **Aggiornato:** ${today} · **File analizzati:** ${items.length} (${formatSummary || 'nessun file'}) · **Motore:** MarkItDown (locale)`,
    '',
  ];

  if (customNote && customNote.trim()) {
    mdParts.push('## Nota dell’utente', '', customNote.trim(), '');
  }

  mdParts.push(
    '## Riepilogo a colpo d’occhio',
    '',
    ...(bulletLines.length > 0 ? bulletLines : ['- Cartella vuota.']),
    '',
    '## Promemoria rapidi',
    '',
    '- [ ] Verificare i documenti prioritari della cartella',
    '- [ ] Aggiornare il post-it dopo l’aggiunta di nuovi file',
    '',
    '## Indice completo dei file',
    '',
    '| File | Convertitore | Dimensione | Contenuto principale |',
    '| --- | --- | --- | --- |',
    ...tableRows,
    '',
    '---',
    '*Generato con MDPad + MarkItDown. Compatibile con Windows 7–11, macOS, iPadOS, Android e Linux.*'
  );

  const postItMarkdown = mdParts.join('\n');
  const infoTip = buildInfoTip(folderName, items);

  return {
    folderName,
    filesProcessed: items.length,
    filesSucceeded: okItems.length,
    filesFailed: failedItems.length,
    mode: 'local',
    postItMarkdown,
    desktopIni: buildWindowsDesktopIni(infoTip),
    linuxDirectory: buildLinuxDirectoryFile(infoTip),
    applyBat: buildWindowsApplyBat(folderName),
    infoTip,
    files: items,
  };
}

export function buildAiFolderPostItDocument(
  folderName: string,
  items: FolderFileSummary[],
  aiBulletsMarkdown: string,
  customNote?: string
): FolderPostItResult {
  const okItems = items.filter((i) => i.status === 'ok');
  const failedItems = items.filter((i) => i.status === 'error');
  const today = new Date().toISOString().slice(0, 10);

  const bulletLines = aiBulletsMarkdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- ') || l.startsWith('* '));

  const tableRows = items.map((item) => {
    const safeName = item.relativePath.replace(/\|/g, '\\|');
    const summary = (item.title || cleanSnippet(item.excerpt, 64)).replace(/\|/g, '\\|');
    return `| \`${safeName}\` | ${item.converterUsed} | ${formatBytes(item.sizeBytes)} | ${summary} |`;
  });

  const mdParts: string[] = [
    `# Post-it Cartella: ${folderName}`,
    '',
    `> **Aggiornato:** ${today} · **File analizzati:** ${items.length} · **Sintesi:** MarkItDown + AI`,
    '',
  ];

  if (customNote && customNote.trim()) {
    mdParts.push('## Nota dell’utente', '', customNote.trim(), '');
  }

  mdParts.push(
    '## Sintesi a colpo d’occhio',
    '',
    aiBulletsMarkdown.trim(),
    '',
    '## Indice completo dei file',
    '',
    '| File | Convertitore | Dimensione | Contenuto principale |',
    '| --- | --- | --- | --- |',
    ...tableRows,
    '',
    '---',
    '*Generato con MDPad + MarkItDown. Compatibile con Windows 7–11, macOS, iPadOS, Android e Linux.*'
  );

  const infoTip = buildInfoTip(folderName, items, bulletLines);
  return {
    folderName,
    filesProcessed: items.length,
    filesSucceeded: okItems.length,
    filesFailed: failedItems.length,
    mode: 'ai',
    postItMarkdown: mdParts.join('\n'),
    desktopIni: buildWindowsDesktopIni(infoTip),
    linuxDirectory: buildLinuxDirectoryFile(infoTip),
    applyBat: buildWindowsApplyBat(folderName),
    infoTip,
    files: items,
  };
}

export function buildWindowsRegScript(): string {
  return [
    'Windows Registry Editor Version 5.00',
    '',
    '; Compatibile con Windows 7 Starter (32-bit), Windows 8, Windows 10 e Windows 11',
    '; Aggiunge "Apri con MDPad" sui file .md e "Genera Post-it Cartella" sul menu cartelle',
    '',
    '[HKEY_CURRENT_USER\\Software\\Classes\\.md\\shell\\MDPad]',
    '@="Apri con MDPad"',
    '',
    '[HKEY_CURRENT_USER\\Software\\Classes\\.md\\shell\\MDPad\\command]',
    '@="\\"C:\\\\Program Files\\\\MDPad\\\\mdpad.exe\\" \\"%1\\""',
    '',
    '[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\MDPadPostIt]',
    '@="Genera Post-it Cartella (_POST-IT.md)"',
    '',
    '[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\MDPadPostIt\\command]',
    '@="python \\"C:\\\\Program Files\\\\MDPad\\\\mdpad_postit.py\\" \\"%1\\""',
    '',
  ].join('\r\n');
}

export function buildPythonCliScript(): string {
  return `#!/usr/bin/env python3
"""
MDPad Folder Post-it Generator (MarkItDown CLI)
Genera _POST-IT.md + desktop.ini (Windows 7-11) + .directory (Linux) per qualsiasi cartella.
Funziona 100% offline con: pip install 'markitdown[all]'
"""
import os
import sys
import subprocess
from datetime import date
from pathlib import Path
from markitdown import MarkItDown

def genera_postit(cartella: str) -> None:
    root = Path(cartella).resolve()
    md = MarkItDown()
    voci = []

    for voce in sorted(root.iterdir()):
        if not voce.is_file():
            continue
        if voce.name.startswith("_POST-IT") or voce.name.lower() in ("desktop.ini", ".directory"):
            continue
        try:
            res = md.convert_local(str(voce))
            estratto = " ".join(res.markdown.split())[:180]
            voci.append((voce.name, voce.stat().st_size, estratto or "Documento convertito."))
        except Exception as exc:
            voci.append((voce.name, voce.stat().st_size, f"File non convertito ({type(exc).__name__})"))

    righe = [
        f"# Post-it Cartella: {root.name}",
        "",
        f"> **Aggiornato:** {date.today().isoformat()} · **File analizzati:** {len(voci)} · **Motore:** MarkItDown",
        "",
        "## Riepilogo a colpo d'occhio",
        "",
    ]
    for nome, _, estratto in voci:
        righe.append(f"- **{nome}**: {estratto}")

    postit_path = root / "_POST-IT.md"
    postit_path.write_text("\\n".join(righe) + "\\n", encoding="utf-8")

    infotip = f"{root.name} ({len(voci)} file): " + ", ".join(n for n, _, _ in voci[:4])
    desktop_ini = root / "desktop.ini"
    desktop_ini.write_text(f"[.ShellClassInfo]\\r\\nInfoTip={infotip[:230]}\\r\\n", encoding="utf-8")

    if os.name == "nt":
        subprocess.run(["attrib", "+h", "+s", str(desktop_ini)], check=False)
        subprocess.run(["attrib", "+r", str(root)], check=False)

    print(f"Creato {postit_path}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    genera_postit(target)
`;
}
