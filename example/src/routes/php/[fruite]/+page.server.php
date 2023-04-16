<?php

require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

function load(array $event) {
    $fruite = $event['params']['fruite'] ?? 'unknown';

    $lastChoise = $_COOKIE['fruite'];
    setcookie('fruite', $fruite);

    return [
        'name' => Ucfirst($fruite),
        'previous' => ucfirst($lastChoise),
        'encoded' => serialize($fruite),
        'server' => $_SERVER,
    ];
}
