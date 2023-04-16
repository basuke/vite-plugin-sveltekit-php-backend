## How to run demo

### Prerequirements:

- PHP with PHP fpm running
- composer for PHP packages
- Node.js

### Steps

1. cd to `example/`
2. `yarn` to install required packages.
3. `yarn dev --open` to launch dev server.

Try pages and take a look into the code in `src/routes`

### routes/php/[fruite]

> Example of page server load. The route parameters are passed to `+page.server.php`. Also it returns `$_SERVER` php variables for reference.

### routes/php/emoji/[fruite]

> Example of endpoing.

### routes/pherdle

> Example of form actions. Ported Sverdle to PHP.
