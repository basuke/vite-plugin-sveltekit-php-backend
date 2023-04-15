import type { Plugin } from "vite";

import path from "node:path";
import fs from "node:fs";

const name = "vite-plugin-sveltekit-php-backend";
const sharedClientVirtualModule = `virtual:${name}/shared-client`;
const sharedClientResolvedModuleId = "\0" + sharedClientVirtualModule;

interface PHPBackendOptions {
  host?: string;
  port?: number;
  debug?: boolean;
}

function posixify(str: string): string {
  return str.replace(/\\/g, "/");
}

function flattenId(id: string): string {
  return posixify(id).replaceAll("/", "_");
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
  const host = options.host ?? "localhost";
  const port = options.port ?? 9000;
  const debug = options.debug ?? true;
  let root;
  let building = false;
  let phpDir;

  const plugin: Plugin = {
    name,

    configResolved(config) {
      root = config.root;
      building = config.command === "build";
      phpDir = path.join(
        building ? config.build.outDir : config.cacheDir,
        "php"
      );
      fs.mkdirSync(phpDir, { recursive: true });
    },

    buildStart() {},

    resolveId(id) {
      if (id === sharedClientVirtualModule) {
        return sharedClientResolvedModuleId;
      }

      // Error check for client side logic.
      if (id.endsWith(".php")) {
        if (id !== "+server.php" && !id.endsWith(".server.php")) {
          throw new Error("PHP cannot run on client side.");
        }
      }
    },

    load(id) {
      if (id === sharedClientResolvedModuleId) {
        return sharedClientJS({ host, port, debug, root });
      }
    },

    transform(code, id) {
      if (id.endsWith(".php")) {
        id = path.relative(root, id);

        const phpPath = path.join(phpDir, flattenId(id));
        fs.writeFileSync(phpPath, code + phpHandler());

        return { code: invokePhpLoadJS(path.relative(root, phpPath)) };
      }
    },
    buildEnd() {},
  };
  return [plugin];
}

const sharedClientJS = ({ host, port, debug, root }): string => `
  import { createClient } from "fastcgi-kit";

  export const client = createClient({
    host: ${Q(host)},
    port: ${Q(port)},
    debug: ${Q(debug)},
    params: {
      DOCUMENT_ROOT: ${Q(root)},
    },
  });

  export const invokePhpLoad = (path, params, route, url) => {
    const backendUrl = 'http://localhost/' + path;

    return new Promise(async (resolve, reject) => {
      try {
        const response = await client.get(backendUrl, {
          SVELTEKIT_PAGESERVERLOAD: JSON.stringify({
            params,
            route,
            url: url.toString(),
          }),
        });
        resolve(response.json());
      } catch (e) {
        reject(e);
      }
    });
  };
`;

const invokePhpLoadJS = (phpPath: string) => `
  import { invokePhpLoad } from "${sharedClientVirtualModule}";

  export const load = (async ({ params, route, url }) => {
    return await invokePhpLoad(${Q(phpPath)}, params, route, url);
  });
`;

const phpHandler = () => `
// ===============================================
// following code should be added by vite plugin
// ===============================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

} elseif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode([
        'load' => [
            'defined' => function_exists('load'),
        ],
        'action' => [
            'defined' => function_exists('action'),
        ],
    ]);
} else {
    $pageServerLoad = json_decode($_SERVER['SVELTEKIT_PAGESERVERLOAD'] ?? '{"params":{},"url":"","route":{"id":""}}', true);
    echo json_encode(load($pageServerLoad));
}
`;

export default plugin;
