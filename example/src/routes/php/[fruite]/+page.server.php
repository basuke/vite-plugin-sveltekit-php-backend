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

// ===============================================
// following code should be added by vite plugin
// ===============================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

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
    $pageServerLoad = json_decode($_SERVER['SVELTEKIT_PAGESERVERLOAD'] ?? '{"params":{},"url":"","route":{"id":""}}', true);
    echo json_encode(load($pageServerLoad));
}