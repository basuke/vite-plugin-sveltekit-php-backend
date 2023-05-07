<?php

namespace Basuke\SvelteKit;

class Environment {
    public ?array $load;
    public ?array $GET;
    public ?array $POST;
    public ?array $PATCH;
    public ?array $PUT;
    public ?array $DELETE;
    public ?array $OPTIONS;
    public array $actions;

    public function __construct() {
        $this->load = self::functionInfo('load');
        $this->GET = self::functionInfo('GET');
        $this->POST = self::functionInfo('POST');
        $this->PATCH = self::functionInfo('PATCH');
        $this->PUT = self::functionInfo('PUT');
        $this->DELETE = self::functionInfo('DELETE');
        $this->OPTIONS = self::functionInfo('OPTIONS');

        global $actions;
        $this->actions = [];
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
