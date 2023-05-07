<?php

namespace Basuke\SvelteKit;

use ArrayAccess;

class Post implements ArrayAccess {
    private array $values = [];

    public function __construct() {
        $input = file_get_contents('php://input');
        $input = str_replace('=', '[]=', $input);
        parse_str($input, $this->values);
    }

    public function getAll($name) {
        return $this->values[$name] ?? null;
    }

    public function get($name) {
        $values = $this->getAll($name);
        return $values && count($values) > 0 ? $values[0] : null;
    }

    public function offsetExists(mixed $offset): bool { return $this->getAll($offset); }
    public function offsetGet(mixed $offset): mixed { return $this->get($offset); }
    public function offsetSet(mixed $offset, mixed $value): void {}
    public function offsetUnset(mixed $offset): void {}
}
