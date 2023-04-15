<?php

require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

function load(array $event) {
    $fruite = $event['params']['fruite'] ?? 'unknown';

    switch ($fruite) {
        case 'apple':
            $emoji = '🍎';
            break;
        case 'orange':
            $emoji = '🍊';
            break;
        default:
            $emoji = '🤷🏻‍♂️';
            break;
    }

    $lastChoise = $_COOKIE['fruite'];
    setcookie('fruite', $fruite);

    return [
        'name' => Ucfirst($fruite),
        'previous' => ucfirst($lastChoise),
        'emoji' => $emoji,
        'encoded' => serialize($fruite . $emoji),
        'server' => $_SERVER,
    ];
}
