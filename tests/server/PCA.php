<?php
require_once('InitDB.php');
use Tqdev\PhpCrudApi\Api;
use Tqdev\PhpCrudApi\Config\Config;
use Tqdev\PhpCrudApi\RequestFactory;
use Tqdev\PhpCrudApi\ResponseUtils;
class PCA {
    private $dbPath;
    private $config;
    public function __construct($dbPath, $config) {
        $this->dbPath = $dbPath;
        $this->config = new Config($config);
    }
    public function execute() {
        if (isset($_GET['reset_db'])) {
            $valid=InitDB::resetDb($this->dbPath);
            echo($valid?'ok':'nok');
        } else {
            $request = RequestFactory::fromGlobals();
            $api = new Api($this->config);
            $response = $api->handle($request);
            ResponseUtils::output($response);
        }
    }
}