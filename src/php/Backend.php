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
        switch ($_SERVER['REQUEST_METHOD']) {
            case 'GET':
                $this->get();
                break;
            case 'POST':
                $this->post();
                break;
            case 'OPTIONS':
                $this->options();
                break;
            default:
                fail(405, ['message' => 'Method Not Allowed']);
        };
    }

    public function get() {
        $method = $_SERVER['SVELTEKIT_METHOD'] ?? 'load';
        if (is_callable($method)) {
            if ($method === 'load') {
                $event = PageServerEvent::get();
                $result = call_user_func($method, $event);

                json($result);
            } else {
                $event = PageServerEvent::get();
                call_user_func($method, $event);
            }
        } else {
            fail(500, ['error' => "Function '{$method}' is not defiened"]);
        }
    }

    public function post() {
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
