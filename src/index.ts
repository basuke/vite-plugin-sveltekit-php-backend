import type { Plugin } from "vite";

import path from "node:path";
import fs from "node:fs";
import { createClient } from "fastcgi-kit";

const name = "vite-plugin-sveltekit-php-backend";
const sharedClientVirtualModule = `virtual:${name}/shared-client`;
const sharedClientResolvedModuleId = "\0" + sharedClientVirtualModule;

interface PHPBackendOptions {
  address?: string;
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
  const address = options.address ?? "localhost:9000";
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
        return sharedClientJS({ address, debug, root });
      }
    },

    async transform(code, id) {
      if (id.endsWith(".php")) {
        id = path.relative(root, id);

        const phpPath = path.join(phpDir, flattenId(id));
        fs.writeFileSync(phpPath, code + phpBackendMain);

        // const client = createClient({
        //   address,
        //   debug,
        //   params: {
        //     DOCUMENT_ROOT: root,
        //   },
        // });

        // const response = await client.get(backendUrl, fcgiParams);
        // console.log(response.json());

        const relativePath = path.relative(root, phpPath);
        if (id.endsWith("+server.php")) {
          code = invokePhpEndpointJS(relativePath, "GET");
        } else {
          code =
            invokePhpLoadJS(relativePath) +
            definePhpActionsJS(relativePath, ["update", "enter", "restart"]);
        }
        return { code };
      }
    },
    buildEnd() {},
  };
  return [plugin];
}

interface PHPStructure {}

const sharedClientJS = ({ address, debug, root }): string => `
  import { createClient } from "fastcgi-kit";
  import { fail } from '@sveltejs/kit';
  import Cookie from "cookie";

  export const client = createClient({
    address: ${Q(address)},
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
      const parsed = Cookie.parse(setCookieHeader);
      for (const name in parsed) {
        const value = parsed[name];
        if (value === 'deleted') {
          cookies.delete(name);
        } else {
          cookies.set(name, value);
        }
        break;
      }
    }
  }

  export const invokePhpLoad = async (path, event) => {
    return new Promise(async (resolve, reject) => {
      const backendUrl = 'http://localhost/' + path;
      const fcgiParams = createFCGIParams(event);
  
      try {
        const response = await client.get(backendUrl, fcgiParams);
        console.log(response);
        forwardCookies(response, event);
        resolve(response.json());
      } catch (e) {
        reject(e);
      }
    });
  };

  export const invokePhpEndpoint = async (path, method, event) => {
    return new Promise(async (resolve, reject) => {
      const backendUrl = 'http://localhost/' + path;
      const fcgiParams = createFCGIParams(event);
      fcgiParams['REQUEST_METHOD'] = method;
      fcgiParams['SVELTEKIT_METHOD'] = method;

      try {
        const response = await client.get(backendUrl, fcgiParams);
        console.log(response);
        forwardCookies(response, event);

        const res = new Response(response.body, {
          status: response.statusCode,
          headers: response.headers,
        });
        resolve(res);
      } catch (e) {
        reject(e);
      }
    });
  }

  export async function invokePhpActions(path, action, event) {
    const request = event.request;
    const body = (new URLSearchParams(await request.formData())).toString();

    return new Promise(async (resolve, reject) => {
      const backendUrl = 'http://localhost/' + path;
      const fcgiParams = createFCGIParams(event);
      fcgiParams['SVELTEKIT_ACTION'] = action;
  
      try {
        const response = await client.post(backendUrl, body, fcgiParams);
        if (response.statusCode >= 400) {
          resolve(fail(response.statusCode, response.json()));
        }
        forwardCookies(response, event);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
`;

const invokePhpLoadJS = (phpPath: string) => `
  import { invokePhpLoad } from "${sharedClientVirtualModule}";

  export const load = (async (event) => {
    return await invokePhpLoad(${Q(phpPath)}, event);
  });
`;

const invokePhpEndpointJS = (phpPath: string, method: string) => `
  import { invokePhpEndpoint } from "${sharedClientVirtualModule}";

  export async function ${method}(event) {
    return await invokePhpEndpoint(${Q(phpPath)}, ${Q(method)}, event);
  }
`;
//
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

const phpBackendMain = `
\\Basuke\\SvelteKit\\Backend::main(__NAMESPACE__);
`;

export default plugin;
