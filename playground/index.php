<?php

require '../vendor/autoload.php';

use \Basuke\SvelteKit\PageServerEvent;

function load(PageServerEvent $event) {
    return $event;
}

function GET(PageServerEvent $event) {
    return $event;
}

function POST(string $url) {
    return $url;
}

function PUT(string $url) {
    return $url;
}

function DELETE(string $url) {
    return $url;
}

function PATCH(string $url) {
    return $url;
}

function OPTIONS(string $url) {
    return $url;
}

$actions = [
    'submit' => function (string $url, array $params) {

    },
];

\Basuke\SvelteKit\Backend::main(__NAMESPACE__);
