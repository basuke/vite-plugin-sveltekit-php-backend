<?php

use Basuke\SvelteKit\PageServerEvent;
use function Basuke\SvelteKit\json;

function GET(PageServerEvent $event) {
    $fruite = $event->params['fruite'];

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

    json([
        'fruite' => $fruite,
        'emoji' => $emoji,
    ]);
}
