<?php

use thipages\quick\QDb;
use thipages\sqlitecli\SqliteCli;

class InitDB {
    private $dbPath;
    private $schemaArray;
    private $schemaPath;
    public function __construct($dbPath, $schemaArray, $schemaPath='./schema.sql') {
        $this->dbPath = $dbPath;
        $this->schemaArray = $schemaArray;
        $this->schemaPath = $schemaPath;
    }
    public function execute() {
        if (file_exists($this->dbPath)) unlink($this->dbPath);
        $sql = new QDb(['omnifields' => []]);
        $def = $sql->create($this->schemaArray);
        $cli = new SqliteCli($this->dbPath);
        $cli->execute($def, '.output '.$this->schemaPath, '.schema --nosys');
    }
    public static function resetDb($dbPath,$schemaPath='./schema.sql') {
        $exists= file_exists($dbPath);
        $valid=true;
        if ($exists) $valid=unlink($dbPath);
        if ($valid) {
            try {
                $db = new PDO('sqlite:' . $dbPath);
                $sql = file_get_contents($schemaPath);
                $db->exec($sql);
            } catch (Exception $exception) {
                $valid=false;
            }
            $db = null;
        }
        return $valid;
    }
}