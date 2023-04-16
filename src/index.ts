import type { Plugin } from "vite";

import path from "node:path";
import fs from "node:fs";

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
        forwardCookies(response, event);
        resolve(response.json());
      } catch (e) {
        reject(e);
      }
    });
  };

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

function fail(int $status_code, $body = []) {
  header("HTTP/1.1 {$status_code} Failure");
  header("Content-type: application/json");
  echo json_encode($body);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  class SvelteKitPost implements ArrayAccess {
    private array $values = [];
    public function __construct() {
      $input = file_get_contents('php://input');
      $input = str_replace('=', '[]=', $input);
      parse_str($input, $this->values);
    }

    public function getAll($name) {
      return $this->values[$name] ?? null;
    }

    public function get($name) {
      $values = $this->getAll($name);
      return $values && count($values) > 0 ? $values[0] : null;
    }
    public function offsetExists(mixed $offset): bool { return $this->getAll($offset); }
    public function offsetGet(mixed $offset): mixed { return $this->get($offset); }
    public function offsetSet(mixed $offset, mixed $value): void {}
    public function offsetUnset(mixed $offset): void {}
  };

  $_POST = new SvelteKitPost();

  $event = json_decode($_SERVER['SVELTEKIT_PAGESERVEREVENT'] ?? '{"params":{},"url":"","route":{"id":""}}', true);
  $action = $_SERVER['SVELTEKIT_ACTION'] ?? 'default';

  if (isset($actions[$action]) && is_callable($actions[$action])) {
    call_user_func($actions[$action], $event);
  } else {
    echo "Action '{$action}' is not defiened";
  }

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
