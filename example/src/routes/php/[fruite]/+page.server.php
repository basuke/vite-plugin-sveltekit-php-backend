<?php

require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

function load(array $pageServerLoad) {
    $fruite = $pageServerLoad['params']['fruite'] ?? 'unknown';

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

    return [
        'name' => Ucfirst($fruite),
        'emoji' => $emoji,
        'encoded' => serialize($fruite . $emoji),
        'server' => $_SERVER,
    ];
}
