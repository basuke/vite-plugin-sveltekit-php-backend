<?php

function GET($event) {
    $fruite = $event['params']['fruite'];

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
        'fruite' => $fruite,
        'emoji' => $emoji,
    ];
}
