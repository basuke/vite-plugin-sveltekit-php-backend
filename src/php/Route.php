<?php

namespace Basuke\SvelteKit;

class Route {
    public string $id;

    public function __construct(string $id = '') {
        $this->id = $id;
    }
}
