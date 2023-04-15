# SvelteKit PHP Backend vite plugin

## TL;TR

You can have PHP logic directly in SvelteKit route directory like this: `+page.server.php`

```PHP
<?php
function load(array $pageServerLoad) {
    return [
        'message' => "Hello " . ($pageServerLoad['params']['name'] ?? 'unknownn'),
    ]
}

```

- Not like the one which uses SvelteKit as an assets manager.
- This plugin allows you to use SvelteKit the frontend of PHP backend.
- No need to have a router in PHP.
- No need to have Nginx as a front end of PHP-fpm.
- Plugin does the communication directly to PHP-fpm.
- Of course, it's Composer compatible so that you can use any composer packages inlcuding your own application logic.

## No nginx required any more

Usually you PHP application is served via PHP-fpm. Because PHP-fpm doesn't talk HTTP by itself, you usually place nginx in front of PHP-fpm. This plugin uses `fastcgi-kit` npm package (which is written by me for this project :p ) to communicate with PHP-fpm.

On development phase, there's no need to launch PHP dev server any more. Just launch PHP-fpm service and any script will run from SvelteKit route. (Well, of course with under the ristriction of PHP-fpm security).

On production, you can replace `nginx` with node application (might be Express.js) to run SvelteKit application and every PHP call will be handled via FastCGI directly from the SvelteKit's page logic.

## Frontend is easier to replace than backend

Suppose your codebase has been running for decades. Your app uses PHP for a historical reason. You are very passopnated to make the application modernized. What can you do?

Simple application is easy. You can rewrite the app from the scratch. But decent size of application includes many business logics in the code. Frontend trends such as user interface changes quickly but your businness logic isn't. At lease those changes should be unrelated to the frontend trends.
