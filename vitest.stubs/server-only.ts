// Next.js special-cases the "server-only" import at the webpack/turbopack layer; the package
// isn't a real npm dependency here. Vite's resolver has no such special case, so any lib/*
// file that does `import 'server-only'` fails to even load under vitest without this alias
// (see vitest.config.ts resolve.alias). No-op — the guarantee it provides is enforced by
// Next's bundler at build time, not at test time.
export {};
