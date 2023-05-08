import { fail } from '@sveltejs/kit';
import Cookie from 'cookie';
import { createClient } from 'fastcgi-kit';

export const client = createClient({
    address: '%ADDRESS%',
    debug: false,
    params: {
        DOCUMENT_ROOT: '%DOCUMENT_ROOT%',
    },
});

function createFCGIParams({ params, route, url, cookies, request }) {
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
        fcgiParams['HTTP_COOKIE'] = allCookies
            .map(({ name, value }) => Cookie.serialize(name, value))
            .join('; ');
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
            // console.log(response);
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
            // console.log(response);
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
};

export async function invokePhpActions(path, action, event) {
    const request = event.request;
    const body = new URLSearchParams(await request.formData()).toString();

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
            resolve(null);
        } catch (e) {
            reject(e);
        }
    });
}
