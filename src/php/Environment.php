<?php

namespace Basuke\SvelteKit;

class Environment {
    public ?array $load;
    public array $actions = [];
    public array $endpoints = [];

    const Methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

    public function __construct() {
        $this->load = self::functionInfo('load');

        foreach (self::Methods as $method) {
            $def = self::functionInfo($method);
            if ($def) {
                $this->endpoints[$method] = $def;
            }
        }

        global $actions;
        if (is_array($actions)) {
            foreach ($actions as $action => $callable) {
                $def = self::functionInfo($callable);
                if ($def) {
                    $this->actions[$action] = $def;
                }
            }
        }
    }

    public static function functionInfo($callable): ?array {
        try {
            $function = new \ReflectionFunction($callable);
            return array_map(function ($param) {
                return self::parameterInfo($param);
            }, $function->getParameters());
        } catch (\ReflectionException $e) {
            return null;
        }
    }

    public static function parameterInfo(\ReflectionParameter $param): array {
        $name = $param->getName();
        $type = strval($param->getType());
        return [$type, $name];
    }
}
