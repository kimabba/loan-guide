import { promises as fs } from "fs";
import path from "path";

interface PackageInfo {
  name?: string;
  version?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface TsConfigInfo {
  strict?: boolean;
  jsx?: string;
  module?: string;
  target?: string;
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

interface WranglerInfo {
  pages_build_output_dir?: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  hasEnvPreview?: boolean;
  hasEnvProduction?: boolean;
}

interface WorkspaceTechInfo {
  path: string;
  package: PackageInfo | null;
  tsconfig: TsConfigInfo | null;
  wrangler: WranglerInfo | null;
}

interface ProjectTechInfo {
  generatedAt: string;
  rootPackage: PackageInfo | null;
  workspaces: WorkspaceTechInfo[];
}

async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseTsConfig(raw: any): TsConfigInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const compilerOptions = raw.compilerOptions ?? {};
  return {
    strict: compilerOptions.strict,
    jsx: compilerOptions.jsx,
    module: compilerOptions.module,
    target: compilerOptions.target,
    baseUrl: compilerOptions.baseUrl,
    paths: compilerOptions.paths,
  };
}

function parseWranglerToml(text: string | null): WranglerInfo | null {
  if (!text) return null;

  const getString = (key: string): string | undefined => {
    const match = text.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
    return match?.[1];
  };

  const getStringArray = (key: string): string[] | undefined => {
    const match = text.match(new RegExp(`^${key}\\s*=\\s*\\[([^\\]]*)\\]`, "m"));
    if (!match) return undefined;
    const inner = match[1];
    return inner
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/^"|"$/g, ""));
  };

  return {
    pages_build_output_dir: getString("pages_build_output_dir"),
    compatibility_date: getString("compatibility_date"),
    compatibility_flags: getStringArray("compatibility_flags"),
    hasEnvPreview: /\[env\.preview\]/.test(text),
    hasEnvProduction: /\[env\.production\]/.test(text),
  };
}

async function collectWorkspaceInfo(rootDir: string): Promise<WorkspaceTechInfo[]> {
  const workspaces: WorkspaceTechInfo[] = [];

  const workspacePaths = [
    "apps/web",
    "packages/shared",
  ];

  for (const rel of workspacePaths) {
    const base = path.join(rootDir, rel);
    const pkg = await readJsonFile<PackageInfo>(path.join(base, "package.json"));
    const tsconfig = parseTsConfig(
      await readJsonFile<any>(path.join(base, "tsconfig.json"))
    );
    const wrangler = parseWranglerToml(
      await readTextFile(path.join(base, "wrangler.toml"))
    );

    workspaces.push({
      path: rel,
      package: pkg,
      tsconfig,
      wrangler,
    });
  }

  return workspaces;
}

function formatMarkdown(info: ProjectTechInfo): string {
  const lines: string[] = [];

  lines.push("# 기술 스택 자동 요약 (Generated)");
  lines.push("");
  lines.push(`생성 시각: ${info.generatedAt}`);
  lines.push("");

  if (info.rootPackage) {
    lines.push("## 루트 프로젝트");
    lines.push("");
    lines.push(`- 이름: ${info.rootPackage.name ?? "(알 수 없음)"}`);
    lines.push("- 워크스페이스: apps/*, packages/*");
    if (info.rootPackage.dependencies) {
      lines.push("- 공통 Dependencies:");
      for (const [name, version] of Object.entries(info.rootPackage.dependencies)) {
        lines.push(`  - ${name}: ${version}`);
      }
    }
    if (info.rootPackage.devDependencies) {
      lines.push("- 공통 DevDependencies:");
      for (const [name, version] of Object.entries(info.rootPackage.devDependencies)) {
        lines.push(`  - ${name}: ${version}`);
      }
    }
    lines.push("");
  }

  lines.push("## 워크스페이스");
  lines.push("");

  for (const ws of info.workspaces) {
    lines.push(`### ${ws.package?.name ?? ws.path}`);
    lines.push("");
    lines.push(`- 경로: \`${ws.path}\``);
    if (ws.package?.version) {
      lines.push(`- 버전: ${ws.package.version}`);
    }
    if (ws.package?.scripts) {
      const importantScripts = Object.entries(ws.package.scripts).filter(([key]) =>
        ["dev", "build", "preview", "lint", "pages:dev", "pages:deploy"].includes(key)
      );
      if (importantScripts.length > 0) {
        lines.push("- 주요 스크립트:");
        for (const [name, script] of importantScripts) {
          lines.push(`  - ${name}: \`${script}\``);
        }
      }
    }

    if (ws.package?.dependencies) {
      lines.push("- 주요 라이브러리:");
      for (const key of [
        "react",
        "react-dom",
        "react-router-dom",
        "zustand",
        "hono",
        "@supabase/supabase-js",
        "@google/genai",
      ]) {
        const v = ws.package.dependencies[key];
        if (v) {
          lines.push(`  - ${key}: ${v}`);
        }
      }
    }

    if (ws.tsconfig) {
      lines.push("- TypeScript 설정:");
      lines.push(`  - strict: ${ws.tsconfig.strict ? "true" : "false"}`);
      if (ws.tsconfig.jsx) lines.push(`  - jsx: ${ws.tsconfig.jsx}`);
      if (ws.tsconfig.module) lines.push(`  - module: ${ws.tsconfig.module}`);
      if (ws.tsconfig.target) lines.push(`  - target: ${ws.tsconfig.target}`);
      if (ws.tsconfig.paths && Object.keys(ws.tsconfig.paths).length > 0) {
        lines.push("  - paths:");
        for (const [alias, targets] of Object.entries(ws.tsconfig.paths)) {
          lines.push(`    - ${alias} -> ${targets.join(", ")}`);
        }
      }
    }

    if (ws.wrangler) {
      lines.push("- Cloudflare 설정 (wrangler.toml):");
      if (ws.wrangler.pages_build_output_dir) {
        lines.push(`  - pages_build_output_dir: ${ws.wrangler.pages_build_output_dir}`);
      }
      if (ws.wrangler.compatibility_date) {
        lines.push(`  - compatibility_date: ${ws.wrangler.compatibility_date}`);
      }
      if (ws.wrangler.compatibility_flags && ws.wrangler.compatibility_flags.length > 0) {
        lines.push(
          `  - compatibility_flags: ${ws.wrangler.compatibility_flags.join(", ")}`
        );
      }
      lines.push(
        `  - env.preview 정의 여부: ${ws.wrangler.hasEnvPreview ? "있음" : "없음"}`
      );
      lines.push(
        `  - env.production 정의 여부: ${ws.wrangler.hasEnvProduction ? "있음" : "없음"}`
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const rootDir = process.cwd();

  const rootPackage = await readJsonFile<PackageInfo>(
    path.join(rootDir, "package.json")
  );

  const workspaces = await collectWorkspaceInfo(rootDir);

  const info: ProjectTechInfo = {
    generatedAt: new Date().toISOString(),
    rootPackage,
    workspaces,
  };

  const jsonPath = path.join(rootDir, "tech-info.json");
  const mdPath = path.join(rootDir, "TECH_STACK.generated.md");

  await fs.writeFile(jsonPath, JSON.stringify(info, null, 2) + "\n", "utf8");
  await fs.writeFile(mdPath, formatMarkdown(info), "utf8");

  console.log("Generated:");
  console.log("-", path.relative(rootDir, jsonPath));
  console.log("-", path.relative(rootDir, mdPath));
}

main().catch((err) => {
  console.error("Failed to collect tech info:", err);
  process.exit(1);
});
