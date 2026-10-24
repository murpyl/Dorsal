/// <reference types="vite/client" />
// claude.ts is a "use node" action that imports the Anthropic SDK; tests never load it (scenario 7 drives the
// error path through clusters.markRunError instead), so no test can make an API call.
export const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.ts", "!./test.setup.ts", "!./claude.ts"]);
