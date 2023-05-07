<?php

use Cowsayphp\Farm;
use Wheeler\Fortune\Fortune;

// These are old library
error_reporting(E_ALL & ~E_DEPRECATED);

function load($event) {
    $fortune = Fortune::make();

    $animals = [
        Farm\Whale::class,
        Farm\Cow::class,
        Farm\Dragon::class,
        Farm\Tux::class,
    ];
    $pet = Farm::create($animals[rand(0, 3)]);

    $art = $pet->say($fortune);
    
    return [
        'lines' => explode("\n", $art)
    ];
}