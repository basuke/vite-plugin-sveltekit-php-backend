import type { Plugin } from 'vite';

import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import { createClient } from 'fastcgi-kit';

const name = 'vite-plugin-sveltekit-php-backend';
const sharedClientVirtualModule = `virtual:${name}/shared-client`;
const sharedClientResolvedModuleId = '\0' + sharedClientVirtualModule;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const runtimeCode = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8');

const verbose = {
    showCodeStructure: false,
    showGeneratedJSCode: false,
};

interface PHPBackendOptions {
    address?: string;
    debug?: boolean;
}

type ParameterSpec = [string, string]; // [type, name]
type FunctionSpec = ParameterSpec[];

interface CodeStructure {
    load: FunctionSpec | null;
    endpoints: Record<string, FunctionSpec>;
    actions: Record<string, FunctionSpec>;
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
export async function plugin(options: PHPBackendOptions = {}): Promise<Plugin> {
    const address = options.address ?? 'localhost:9000';
    const debug = options.debug ?? false;
    let root: string;
    let building = false;
    let phpDir: string;
    let sharedCode: string;

    const plugin: Plugin = {
        name,

        configResolved(config) {
            root = config.root;
            building = config.command === 'build';
            phpDir = path.join(config.cacheDir, 'php');
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

                const structure = await analyzeCodeStructure(
                    address,
                    root,
                    relativePath
                );
                if (verbose.showCodeStructure) {
                    console.log(structure);
                }

                if (id.endsWith('+server.php')) {
                    code = invokePhpEndpointJS(relativePath, structure);
                } else {
                    code =
                        invokePhpLoadJS(relativePath, structure) +
                        definePhpActionsJS(relativePath, structure);
                }
                if (verbose.showGeneratedJSCode) {
                    code.split('\n').forEach((line) => console.log(line));
                }
                return { code };
            }
        },
        buildEnd() {},
    };
    return plugin;
}

async function analyzeCodeStructure(
    address: string,
    root: string,
    phpPath: string
): Promise<CodeStructure> {
    const client = createClient({
        address,
        params: {
            DOCUMENT_ROOT: root,
        },
    });

    const backendUrl = new URL('http://localhost/' + phpPath);
    const response = await client.options(backendUrl, {});
    const config = response.json();

    const endpoints: Record<string, FunctionSpec> = {};
    const actions: Record<string, FunctionSpec> = {};
    let load: FunctionSpec | null = null;

    const filterParam = (arg): ParameterSpec | null => {
        if (Array.isArray(arg) && arg.length === 2) {
            const [type, name] = arg;
            return [type, name];
        } else {
            return null;
        }
    };

    const filterFunc = (arg): FunctionSpec | null => {
        if (Array.isArray(arg)) {
            return arg.map(filterParam).filter((x) => x !== null);
        } else {
            return null;
        }
    };

    if (typeof config === 'object') {
        if (config.load) {
            load = filterFunc(config.load);
        }
        if (config.endpoints && typeof config.endpoints === 'object') {
            for (const method in config.endpoints) {
                const spec = filterFunc(config.endpoints[method]);
                if (spec) {
                    endpoints[method] = spec;
                }
            }
        }
        if (config.actions && typeof config.actions === 'object') {
            for (const action in config.actions) {
                const spec = filterFunc(config.actions[action]);
                if (spec) {
                    actions[action] = spec;
                }
            }
        }
    }

    return {
        load,
        endpoints,
        actions,
    };
}

const invokePhpLoadJS = (phpPath: string, structure: CodeStructure) => {
    if (!structure.load) {
        return '';
    }

    return `
import { invokePhpLoad } from "${sharedClientVirtualModule}";

export const load = (async (event) => {
    return await invokePhpLoad(${Q(phpPath)}, event);
});
`;
};

const invokePhpEndpointJS = (phpPath: string, structure: CodeStructure) => {
    const methods = Object.keys(structure.endpoints);
    if (methods.length === 0) {
        return '';
    }

    return (
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
            .join('\n')
    );
};

const definePhpActionsJS = (phpPath: string, structure: CodeStructure) => {
    const actions = Object.keys(structure.actions);
    if (actions.length === 0) {
        return '';
    }

    return (
        `
import { invokePhpActions } from "${sharedClientVirtualModule}";

export const actions = {` +
        // prettier-ignore
        actions.map((action) => `
    ${Q(action)}: async (event) => invokePhpActions(${Q(phpPath)}, ${Q(action)}, event)`).join(",\n") +
        `
};
`
    );
};

const phpBackendMain = `<?php
require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

use \\Basuke\\SvelteKit\\Backend;

register_shutdown_function([Backend::class, 'main'], __NAMESPACE__);
?>`;

export default plugin;
