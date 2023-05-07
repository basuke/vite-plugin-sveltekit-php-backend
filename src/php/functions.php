<?php

namespace Basuke\SvelteKit;

function fail(int $status_code, $body = []) {
    header("HTTP/1.1 {$status_code} Failure");

    json($body);
}

function json($body) {
    header("Content-type: application/json");

    echo json_encode($body);
}
