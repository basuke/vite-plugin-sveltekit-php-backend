<?php

namespace Basuke\SvelteKit;

use function Uitls\fail;

class Backend {
    public static function main(string $namespace = '\\') {
        $backend = new Backend($namespace);
        $backend->run();
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
            $event = PageServerEvent::get();
            $result = call_user_func($method, $event);

            self::contentTypeIsJson();
            echo json_encode($result);
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
        self::contentTypeIsJson();

        echo json_encode($this->environment);
    }

    public static function contentTypeIsJson() {
        header("Content-type: application/json");
    }
}
