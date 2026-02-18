/**
 * Interactive prompts for enrich-analytics (TTY only).
 * Uses Node.js readline; no external dependency.
 */

import * as readline from "readline";

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY);
}

function createRL(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

export function question(prompt: string, defaultValue?: string): Promise<string> {
  const rl = createRL();
  const def = defaultValue !== undefined ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${prompt}${def}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function promptYesNo(prompt: string, defaultYes: boolean = true): Promise<boolean> {
  const label = defaultYes ? "Y/n" : "y/N";
  const raw = await question(prompt, label);
  if (raw === "") return defaultYes;
  const lower = raw.toLowerCase();
  if (lower === "y" || lower === "yes") return true;
  if (lower === "n" || lower === "no") return false;
  return defaultYes;
}

export async function promptInt(prompt: string, defaultValue: number): Promise<number> {
  const raw = await question(prompt, String(defaultValue));
  if (raw === "") return defaultValue;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return defaultValue;
  return n;
}

export async function promptChoice<T>(prompt: string, choices: { value: T; label: string }[], defaultIndex: number = 0): Promise<T> {
  const lines = choices.map((c, i) => `  ${i + 1}. ${c.label}`).join("\n");
  const def = choices[defaultIndex];
  const raw = await question(`${prompt}\n${lines}\nChoice`, String(defaultIndex + 1));
  if (raw === "") return def.value;
  const i = parseInt(raw, 10);
  if (Number.isNaN(i) || i < 1 || i > choices.length) return def.value;
  return choices[i - 1].value;
}
