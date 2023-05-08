import type { Plugin } from 'vite';

import path from 'node:path';
import fs from 'node:fs';
import { createClient } from 'fastcgi-kit';

const name = 'vite-plugin-sveltekit-php-backend';
const sharedClientVirtualModule = `virtual:${name}/shared-client`;
const sharedClientResolvedModuleId = '\0' + sharedClientVirtualModule;

const runtimeCode = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8');

interface PHPBackendOptions {
    address?: string;
    debug?: boolean;
}

function posixify(str: string): string {
    return str.replace(/\\/g, '/');
}

function flattenId(id: string): string {
    return posixify(id).replaceAll('/', '_');
}

function Q(s: string): string {
    return JSON.stringify(s);
}

/**
 * Returns the PHP Backend for SvelteKit Vite plugin.
 */
export async function plugin(
    options: PHPBackendOptions = {}
): Promise<Plugin[]> {
    const address = options.address ?? 'localhost:9000';
    const debug = options.debug ?? false;
    let root;
    let building = false;
    let phpDir;
    let sharedCode;

    const plugin: Plugin = {
        name,

        configResolved(config) {
            root = config.root;
            building = config.command === 'build';
            phpDir = path.join(
                building ? config.build.outDir : config.cacheDir,
                'php'
            );
            sharedCode = runtimeCode
                .replace("'%ADDRESS%'", Q(address))
                .replace("'%DOCUMENT_ROOT%'", Q(root));

            fs.mkdirSync(phpDir, { recursive: true });
        },

        buildStart() {},

        resolveId(id) {
            if (id === sharedClientVirtualModule) {
                return sharedClientResolvedModuleId;
            }

            // Error check for client side logic.
            if (id.endsWith('.php')) {
                if (id !== '+server.php' && !id.endsWith('.server.php')) {
                    throw new Error('PHP cannot run on client side.');
                }
            }
        },

        load(id) {
            if (id === sharedClientResolvedModuleId) {
                return sharedCode;
            }
        },

        async transform(code, id) {
            if (id.endsWith('.php')) {
                id = path.relative(root, id);

                const phpPath = path.join(phpDir, flattenId(id));
                fs.writeFileSync(phpPath, phpBackendMain + code);

                const relativePath = path.relative(root, phpPath);

                const client = createClient({
                    address,
                    debug,
                    params: {
                        DOCUMENT_ROOT: root,
                    },
                });

                const backendUrl = 'http://localhost/' + relativePath;
                const response = await client.options(backendUrl, {});
                const config = response.json();

                if (id.endsWith('+server.php')) {
                    const methods = [
                        'GET',
                        'POST',
                        'PUT',
                        'DELETE',
                        'PATCH',
                        'OPTIONS',
                    ];
                    code = invokePhpEndpointJS(relativePath, methods);
                } else {
                    code =
                        invokePhpLoadJS(relativePath) +
                        definePhpActionsJS(relativePath, [
                            'update',
                            'enter',
                            'restart',
                        ]);
                }
                return { code };
            }
        },
        buildEnd() {},
    };
    return [plugin];
}

interface PHPStructure {}

const invokePhpLoadJS = (phpPath: string) => `
  import { invokePhpLoad } from "${sharedClientVirtualModule}";

  export const load = (async (event) => {
    return await invokePhpLoad(${Q(phpPath)}, event);
  });
`;

const invokePhpEndpointJS = (phpPath: string, methods: string[]) =>
    `
  import { invokePhpEndpoint } from "${sharedClientVirtualModule}";
` +
    methods
        .map(
            (method) => `
  export async function ${method}(event) {
    return await invokePhpEndpoint(${Q(phpPath)}, ${Q(method)}, event);
  }
`
        )
        .join('\n');
//
const definePhpActionsJS = (phpPath: string, actions: string[]) =>
    `import { invokePhpActions } from "${sharedClientVirtualModule}";

  export const actions = {` +
    // prettier-ignore
    actions.map((action) => `
    ${Q(action)}: async (event) => invokePhpActions(${Q(phpPath)}, ${Q(action)}, event)`).join(",") +
    `
  };
`;

const phpBackendMain = `<?php
require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

use \\Basuke\\SvelteKit\\Backend;

register_shutdown_function([Backend::class, 'main'], __NAMESPACE__);
?>`;

export default plugin;
