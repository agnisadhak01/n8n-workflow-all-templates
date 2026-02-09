/**
 * Build script: parses index_files_*.md and tags/*.md to produce templates-index.json
 * Run from repo root: node scripts/build-index.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW_BASE = 'https://raw.githubusercontent.com/zengfr/n8n-workflow-all-templates/main/';

// Noise tags to exclude (common words)
const NOISE_TAGS = new Set([
  'with', 'and', 'to', 'from', 'for', 'in', 'a', 'the', 'or', 'by', 'of', 'an',
  'as', 'on', 'at', 'is', 'it', 's', 'your', 'you', 'them', 'that', 'this'
]);

// Service groups mapping
const SERVICE_GROUPS = {
  Google: ['google', 'sheets', 'drive', 'gmail', 'calendar'],
  Messaging: ['slack', 'telegram', 'discord', 'whatsapp', 'gmail', 'email'],
  AI: ['ai', 'openai', 'gemini', 'gpt-4o', 'gpt-4', 'claude', 'chatbot', 'agent', 'rag'],
  Databases: ['supabase', 'airtable', 'postgres', 'notion'],
  Social: ['linkedin', 'youtube', 'instagram', 'twitter', 'facebook'],
  Automation: ['automate', 'automated', 'automation', 'bot'],
  Integrations: ['api', 'webhook', 'mcp']
};

function parseIndexFiles() {
  const templates = [];
  const templateMap = new Map(); // id -> template

  for (let i = 1; i <= 8; i++) {
    const filePath = path.join(ROOT, `index_files_${i}.md`);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    // Match: | idx | [filename](url) |
    const rowRegex = /\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|/g;
    let match;
    while ((match = rowRegex.exec(content)) !== null) {
      const idx = match[1];
      const filename = match[2];
      const blobUrl = match[3];
      if (!filename.endsWith('.json')) continue;

      // Derive human-readable name: "123_Name_Here.json" -> "Name Here" (replace _ with space)
      const namePart = filename.replace(/^\d+_/, '').replace(/\.json$/, '');
      const name = namePart.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

      // Convert blob URL to raw URL: github.com/.../blob/main/path -> raw.githubusercontent.com/.../main/path
      const rawUrl = blobUrl.includes('github.com')
        ? blobUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
        : RAW_BASE + extractPathFromUrl(blobUrl) || `n8n-workflow-all-templates/00/00/00/${filename}`;

      const template = { id: String(idx), name, filename, rawUrl, tags: [] };
      templates.push(template);
      templateMap.set(idx, template);
    }
  }

  return { templates, templateMap };
}

function extractPathFromUrl(url) {
  const m = url.match(/n8n-workflow-all-templates\/(.+\.json)/);
  return m ? m[1] : '';
}

function parseTagCounts() {
  const filePath = path.join(ROOT, 'tag_counts.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const tagCounts = [];
  const rowRegex = /\|\s*\[([^\]]+)\]\([^)]+\)\s*\|\s*(\d+)\s*\|/g;
  let match;
  while ((match = rowRegex.exec(content)) !== null) {
    const tag = match[1].trim();
    const count = parseInt(match[2], 10);
    if (!NOISE_TAGS.has(tag)) {
      tagCounts.push({ tag, count });
    }
  }
  return tagCounts;
}

function parseTagFiles(templateMap) {
  const tagToIds = {};
  const tagsDir = path.join(ROOT, 'tags');
  const files = fs.readdirSync(tagsDir);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const tag = file.replace('.md', '');
    if (NOISE_TAGS.has(tag)) continue;

    const filePath = path.join(tagsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const ids = [];

    // Match table rows: |id|[filename](url)| or |29|[29_...json](url)|
    const rowRegex = /\|\s*(\d+)\s*\|[^\|]+\|/g;
    let match;
    while ((match = rowRegex.exec(content)) !== null) {
      const id = match[1];
      ids.push(id);
      const template = templateMap.get(id);
      if (template && !template.tags.includes(tag)) {
        template.tags.push(tag);
      }
    }

    if (ids.length > 0) {
      tagToIds[tag] = ids;
    }
  }

  return tagToIds;
}

function buildServiceGroups() {
  return SERVICE_GROUPS;
}

function main() {
  console.log('Parsing index files...');
  const { templates, templateMap } = parseIndexFiles();
  console.log(`Found ${templates.length} templates`);

  console.log('Parsing tag counts...');
  const tagCounts = parseTagCounts();
  console.log(`Found ${tagCounts.length} tags (excluding noise)`);

  console.log('Parsing tag files...');
  const tagToIds = parseTagFiles(templateMap);

  const serviceGroups = buildServiceGroups();

  const output = {
    templates,
    tags: tagCounts,
    tagToIds,
    serviceGroups,
    meta: {
      totalTemplates: templates.length,
      totalTags: tagCounts.length,
      generatedAt: new Date().toISOString()
    }
  };

  const outputPath = path.join(ROOT, 'webapp', 'public', 'templates-index.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(output), 'utf-8');
  console.log(`Wrote ${outputPath} (${(JSON.stringify(output).length / 1024).toFixed(1)} KB)`);
}

main();
