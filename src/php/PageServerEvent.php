<?php

namespace Basuke\SvelteKit;

class PageServerEvent {
    public static function get(): self {
        return new self($_SERVER['SVELTEKIT_PAGESERVEREVENT'] ?? '', $_SERVER['REQUEST_METHOD'] === 'POST');
    }

    public array $params = [];
    public string $url = '';
    public Route $route;
    public ?Post $post = null;

    public function __construct(string $event, bool $post = false) {
        $route = '';
        if ($event) {
            $decoded = json_decode($event, true);
            $this->params = $decoded['params'] ?? [];
            $this->url = $decoded['url'] ?? '';
            $route = $decoded['route']['id'] ?? '';
        }
        $this->route = new Route($route);

        if ($post) {
            $this->post = new Post();
        }
    }
}
