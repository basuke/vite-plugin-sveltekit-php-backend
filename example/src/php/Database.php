<?php

namespace App;

class Database {
    static public function getDb(): Database {
        return new Database();
    }

    public function __construct()
    {
    }
};