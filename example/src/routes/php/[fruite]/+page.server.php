<?php

require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

use \Basuke\SvelteKit\PageServerEvent;

function load(PageServerEvent $event) {
    $fruite = $event->params['fruite'] ?? 'unknown';

    $lastChoise = $_COOKIE['fruite'];
    setcookie('fruite', $fruite);

    return [
        'name' => Ucfirst($fruite),
        'previous' => ucfirst($lastChoise),
        'encoded' => serialize($fruite),
        'server' => $_SERVER,
    ];
}
