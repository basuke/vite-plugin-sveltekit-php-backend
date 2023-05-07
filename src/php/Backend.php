<?php

namespace Basuke\SvelteKit;

class Backend {
    public static function main(string $namespace = '\\') {
        static $run = false;
        if (!$run) {
            $run = true;
            $backend = new Backend($namespace);
            $backend->run();
        }
    }

    private string $namespace;
    private Environment $environment;

    public function __construct(string $namespace) {
        $this->namespace = $namespace;
        $this->environment = new Environment();
    }

    public function run() {
        if (!empty($_SERVER['SVELTEKIT_METHOD'])) {
            $this->endpoint($_SERVER['SVELTEKIT_METHOD']);
        } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $this->load();
        } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->action();
        } else if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            $this->options();
        } else {
            fail(500, ['error' => "Invalid calling convention"]);
        }
    }

    public function load() {
        $method = 'load';
        if (is_callable($method)) {
            $event = PageServerEvent::get();
            $result = call_user_func($method, $event);

            json($result);
        } else {
            fail(500, ['error' => "Function '{$method}' is not defiened or callable"]);
        }
    }

    public function endpoint(string $method) {
        if (is_callable($method)) {
            $event = PageServerEvent::get();
            call_user_func($method, $event);
        } else {
            fail(500, ['error' => "Function '{$method}' is not defiened or callable"]);
        }
    }

    public function action() {
        $action = $_SERVER['SVELTEKIT_ACTION'] ?? 'default';
        global $actions;
        if (isset($actions[$action])) {
            if (is_callable($actions[$action])) {
                $event = PageServerEvent::get();
                call_user_func($actions[$action], $event);
            } else {
                fail(500, ['error' => "Action '{$action}' is defiened but not callable"]);
            }
        } else {
            fail(500, ['error' => "Action '{$action}' is not defiened"]);
        }
    }

    public function options() {
        json($this->environment);
    }
}
