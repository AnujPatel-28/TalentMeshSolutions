/**
 * Generates docs/api/openapi.json from the App Router source.
 *
 *   npm run docs:openapi
 *
 * The spec is DERIVED, never hand-edited — a hand-written one drifts the moment a route
 * changes. Everything here is read out of app/api/:
 *
 *   - paths and path params  from the directory layout ([id] -> {id}, [...slug] -> {slug})
 *   - HTTP methods           from the exported GET/POST/PATCH/PUT/DELETE bindings
 *   - auth and roles         from the withApi({ allowedRoles, requireAuth, requiredPermission })
 *                            options object, which is the real enforcement point (lib/api/handler.ts)
 *   - request/response shape from the Zod schemas named in withApi({ schema: { body, query } }),
 *                            converted with Zod 4's native z.toJSONSchema() — no extra dependency
 *
 * Routes that do not use withApi (auth/*, consent/*, newsletter/*, storage, v1/remote) are still
 * listed, but their request bodies cannot be derived and are marked as undocumented rather than
 * guessed at. See the x-undocumented-body flag in the output.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Every route.ts under `dir`, repo-relative. (fs.globSync is runtime-only in these typings.) */
function findRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...findRoutes(p));
    else if (e.name === 'route.ts') out.push(p);
  }
  return out;
}

/** Extracts the balanced {...} or (...) block starting at `from`. */
function balanced(src: string, from: number, open: string, close: string): string | null {
  const start = src.indexOf(open, from);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** identifier -> module specifier, from the route file's import statements. */
function importMap(src: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop()!.trim();
      if (name) map[name] = m[2];
    }
  }
  return map;
}

const moduleCache = new Map<string, Record<string, unknown>>();

async function loadSchema(ident: string, spec: string): Promise<unknown | null> {
  const rel = spec.startsWith('@/') ? spec.slice(2) : spec;
  if (!rel.startsWith('lib/')) return null; // only project validation modules
  try {
    let mod = moduleCache.get(rel);
    if (!mod) {
      mod = (await import(pathToFileURL(join(ROOT, rel)).href)) as Record<string, unknown>;
      moduleCache.set(rel, mod);
    }
    const val = mod[ident];
    return val && typeof val === 'object' && '~standard' in (val as object) ? val : null;
  } catch {
    return null;
  }
}

async function toJsonSchema(schema: unknown, io: 'input' | 'output') {
  try {
    return z.toJSONSchema(schema as never, { io, unrepresentable: 'any' });
  } catch {
    return null;
  }
}

/** JSON Schema object -> OpenAPI query parameter list. */
function queryParams(js: Record<string, unknown> | null) {
  if (!js || js.type !== 'object' || !js.properties) return [];
  const required = (js.required as string[]) ?? [];
  return Object.entries(js.properties as Record<string, unknown>).map(([name, sch]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: sch,
  }));
}

async function main() {
  const files = findRoutes('app/api').sort();
  const paths: Record<string, Record<string, unknown>> = {};
  let withApiCount = 0;
  let rawCount = 0;

  for (const file of files) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const imports = importMap(src);

    const urlPath =
      '/api/' +
      relative('app/api', dirname(file))
        .split(/[\\/]/)
        .filter(Boolean)
        .map((seg) =>
          seg.startsWith('[...') ? `{${seg.slice(4, -1)}}` : seg.startsWith('[') ? `{${seg.slice(1, -1)}}` : seg,
        )
        .join('/');

    const pathParams = [...urlPath.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));

    for (const method of METHODS) {
      const re = new RegExp(`export\\s+(?:const\\s+${method}\\s*=|(?:async\\s+)?function\\s+${method}\\b)`);
      const hit = re.exec(src);
      if (!hit) continue;

      const op: Record<string, unknown> = {
        operationId: `${method.toLowerCase()}${urlPath.replace(/[/{}.]+/g, '_').replace(/_+$/, '')}`,
        tags: [urlPath.split('/')[2] ?? 'root'],
        parameters: [...pathParams],
      };

      const usesWithApi = src.slice(hit.index, hit.index + 200).includes('withApi');
      if (usesWithApi) {
        withApiCount++;
        const opts = balanced(src, src.indexOf('withApi', hit.index), '{', '}') ?? '';

        const roles = /allowedRoles\s*:\s*\[([^\]]*)\]/.exec(opts);
        const roleList = roles ? [...roles[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [];
        const noAuth = /requireAuth\s*:\s*false/.test(opts);
        const perm = /requiredPermission\s*:\s*\{\s*resource\s*:\s*['"]([^'"]+)['"]\s*,\s*action\s*:\s*['"]([^'"]+)['"]/.exec(opts);

        op.security = noAuth ? [] : [{ sessionCookie: [] }];
        if (roleList.length) op['x-allowed-roles'] = roleList;
        if (perm) op['x-required-permission'] = { resource: perm[1], action: perm[2] };

        const qName = /query\s*:\s*(\w+)/.exec(opts)?.[1];
        if (qName && imports[qName]) {
          const js = await toJsonSchema(await loadSchema(qName, imports[qName]), 'input');
          (op.parameters as unknown[]).push(...queryParams(js as Record<string, unknown> | null));
          if (js) op['x-query-schema'] = qName;
        }

        const bName = /body\s*:\s*(\w+)/.exec(opts)?.[1];
        if (bName && imports[bName]) {
          const js = await toJsonSchema(await loadSchema(bName, imports[bName]), 'input');
          if (js) {
            delete (js as Record<string, unknown>).$schema;
            op.requestBody = {
              required: true,
              content: { 'application/json': { schema: js } },
            };
            op['x-body-schema'] = bName;
          }
        }
      } else {
        rawCount++;
        op.security = [{ sessionCookie: [] }];
        op['x-undocumented-body'] = 'Route does not use withApi(); request shape is not declared in a Zod schema and was not inferred.';
      }

      const responses: Record<string, unknown> = {
        '200': { description: 'Success' },
        '400': { description: 'Validation failed' },
        '500': { description: 'Server error' },
      };
      if ((op.security as unknown[])?.length) {
        responses['401'] = { description: 'Unauthorized — no valid session cookie' };
        if (op['x-allowed-roles'] || op['x-required-permission']) {
          responses['403'] = { description: 'Forbidden — role or permission check failed' };
        }
      }
      op.responses = responses;

      paths[urlPath] ??= {};
      paths[urlPath][method.toLowerCase()] = op;
    }
  }

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'TalentMesh API',
      version: pkg.version ?? '0.1.0',
      description:
        'Generated from app/api/ by scripts/generate-openapi.ts — do not edit by hand, run `npm run docs:openapi`.\n\n' +
        'Auth is a session cookie (`tm_access_token`), not a bearer header. Roles and permissions shown as ' +
        '`x-allowed-roles` / `x-required-permission` are read from the withApi() options that actually enforce them.\n\n' +
        'Operations flagged `x-undocumented-body` do not use withApi(), so their request shape is not declared ' +
        'anywhere machine-readable and has been left blank rather than guessed.',
    },
    servers: [
      { url: 'https://talentmeshsolutions.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        sessionCookie: { type: 'apiKey', in: 'cookie', name: 'tm_access_token' },
      },
    },
    security: [{ sessionCookie: [] }],
    paths,
  };

  mkdirSync(join(ROOT, 'docs/api'), { recursive: true });
  writeFileSync(join(ROOT, 'docs/api/openapi.json'), JSON.stringify(spec, null, 2) + '\n');

  const ops = Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0);
  console.log(`docs/api/openapi.json: ${Object.keys(paths).length} paths, ${ops} operations`);
  console.log(`  ${withApiCount} via withApi (schemas + roles derived), ${rawCount} raw handlers (body undocumented)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
