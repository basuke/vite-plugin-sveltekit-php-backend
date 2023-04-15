import type { Plugin } from "vite";

const name = "vite-plugin-sveltekit-php-backend";
const sharedClientVirtualModule = `virtual:${name}/shared-client`;
const sharedClientResolvedModuleId = "\0" + sharedClientVirtualModule;

interface PHPBackendOptions {
  host?: string;
  port?: number;
  debug?: boolean;
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

  const plugin: Plugin = {
    name,

    config(config) {
      root = config.root;
    },

    buildStart() {},

    resolveId(id) {
      if (id === sharedClientVirtualModule) {
        return sharedClientResolvedModuleId;
      }

      if (id.endsWith(".php")) {
        if (id !== "+server.php" && !id.endsWith(".server.php")) {
          throw new Error("PHP cannot run on client side.");
        }
      }
    },

    load(id) {
      if (id === sharedClientResolvedModuleId) {
        return `
          import { createClient } from "fastcgi-kit";

          export const client = createClient({
            host: ${JSON.stringify(host)},
            port: ${JSON.stringify(port)},
            debug: ${JSON.stringify(debug)},
            params: {
              DOCUMENT_ROOT: ${JSON.stringify(root)},
            },
          });

          export const invokePhpLoad = (params, route, url, file) => {
            const backendUrl = 'http://localhost/src/routes' + route.id + '/' + file;
  
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
      }
    },

    transform(code, id) {
      if (id.endsWith(".php")) {
        code = `
          import { invokePhpLoad } from "${sharedClientVirtualModule}";

          export const load = (async ({ params, route, url }) => {
            return await invokePhpLoad(params, route, url, '+page.server.php');
          });
        `;

        return { code };
      }
    },
    buildEnd() {},
  };
  return [plugin];
}

export default plugin;
