<?php

require '../vendor/autoload.php';

use \Basuke\SvelteKit\PageServerEvent;

function load(PageServerEvent $event) {
    return $event;
}

$actions = [
    'submit' => function (string $url, array $params) {

    },
];

\Basuke\SvelteKit\Backend::main(__NAMESPACE__);
