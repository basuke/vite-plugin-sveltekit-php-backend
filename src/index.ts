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
  const debug = options.debug ?? false;
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

        const relativePath = path.relative(root, phpPath);
        code =
          invokePhpLoadJS(relativePath) +
          definePhpActionsJS(relativePath, ["update", "enter", "restart"]);
        return { code };
      }
    },
    buildEnd() {},
  };
  return [plugin];
}

const sharedClientJS = ({ host, port, debug, root }): string => `
  import { createClient } from "fastcgi-kit";
  import Cookie from "cookie";

  export const client = createClient({
    host: ${Q(host)},
    port: ${Q(port)},
    debug: ${Q(debug)},
    params: {
      DOCUMENT_ROOT: ${Q(root)},
    },
  });

  function createFCGIParams({params, route, url, cookies, request}) {
    const fcgiParams = {
      SVELTEKIT_PAGESERVEREVENT: JSON.stringify({
        params,
        route,
        url: url.toString(),
      }),
    };
  
    // add cookie params if cookie exists.
    const allCookies = cookies.getAll();
    if (allCookies.length) {
      fcgiParams['HTTP_COOKIE'] = allCookies.map(({name, value}) => Cookie.serialize(name, value)).join('; ');
    }

    return fcgiParams;
  }

  function forwardCookies(response, { cookies }) {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const setCookies = Cookie.parse(setCookieHeader);
      for (const name in setCookies) {
        cookies.set(name, setCookies[name]);
      }
    }
  }

  export const invokePhpLoad = async (path, event) => {
    return new Promise(async (resolve, reject) => {
      const backendUrl = 'http://localhost/' + path;
      const fcgiParams = createFCGIParams(event);
  
      try {
        const response = await client.get(backendUrl, fcgiParams);
        forwardCookies(response, event);
        resolve(response.json());
      } catch (e) {
        reject(e);
      }
    });
  };

  export async function invokePhpActions(path, action, {params, route, url, cookies, request}) {
    const data = await request.formData();
    const formData = JSON.stringify(Array.from(data));
    console.log({formData});
  }
`;

const invokePhpLoadJS = (phpPath: string) => `
  import { invokePhpLoad } from "${sharedClientVirtualModule}";

  export const load = (async (event) => {
    return await invokePhpLoad(${Q(phpPath)}, event);
  });
`;

const definePhpActionsJS = (phpPath: string, actions: string[]) =>
  `
  import { invokePhpActions } from "${sharedClientVirtualModule}";

  export const actions = {` +
  // prettier-ignore
  actions.map((action) => `
    ${Q(action)}: async (event) => invokePhpActions(${Q(phpPath)}, ${Q(action)}, event)`).join(",") +
  `
  };
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
    $event = json_decode($_SERVER['SVELTEKIT_PAGESERVEREVENT'] ?? '{"params":{},"url":"","route":{"id":""}}', true);
    header('Content-Type: application/json');
    echo json_encode(load($event));
}
`;

export default plugin;
