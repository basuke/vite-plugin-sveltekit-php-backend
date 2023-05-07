<?php

function fail(int $status_code, $body = []) {
    header("HTTP/1.1 {$status_code} Failure");
    self::contentTypeIsJson();

    echo json_encode($body);
}
