<?php

declare(strict_types=1);

use Tqdev\PhpCrudApi\Api;
use Tqdev\PhpCrudApi\Config\Config;
use Tqdev\PhpCrudApi\RequestFactory;
use Tqdev\PhpCrudApi\ResponseUtils;

require __DIR__ . '/../vendor/autoload.php';

$dbPath = __DIR__ . '/var/php-crud-api.sqlite';
$testsConfigDir = __DIR__ . '/php-crud-tests/config';

set_include_path($testsConfigDir . PATH_SEPARATOR . get_include_path());
$settings = [];
include $testsConfigDir . '/base.php';
include $testsConfigDir . '/sqlite.php';

$settings['driver'] = 'sqlite';
$settings['address'] = $dbPath;
$settings['database'] = $dbPath;
$settings['reconnect.databaseHandler'] = function () use ($dbPath) {
    return $dbPath;
};
$settings['reconnect.usernameHandler'] = function () {
    return '';
};
$settings['reconnect.passwordHandler'] = function () {
    return '';
};

if (!isset($settings['mapping']) || $settings['mapping'] === '') {
    $settings['mapping'] = 'abc_posts.abc_id=posts.id,abc_posts.abc_user_id=posts.user_id,abc_posts.abc_category_id=posts.category_id,abc_posts.abc_content=posts.content';
}
if (!isset($settings['tables']) || $settings['tables'] === '') {
    $settings['tables'] = 'all';
}

if (isset($settings['middlewares'])) {
    $middlewares = array_filter(array_map('trim', explode(',', $settings['middlewares'])));
    if (!in_array('apiKeyAuth', $middlewares)) {
        $middlewares[] = 'apiKeyAuth';
    }
    if (!in_array('authorization', $middlewares)) {
        $middlewares[] = 'authorization';
    }
    $middlewares = array_values(array_filter($middlewares, function ($m) {
        return $m !== 'sslRedirect';
    }));
    $settings['middlewares'] = implode(',', array_unique($middlewares));
}

if (!isset($settings['apiKeyAuth.keys']) || $settings['apiKeyAuth.keys'] === '') {
    $settings['apiKeyAuth.keys'] = '123456789abc';
}
if (!isset($settings['apiKeyAuth.mode']) || $settings['apiKeyAuth.mode'] === '') {
    $settings['apiKeyAuth.mode'] = 'optional';
}

$settings['authorization.tableHandler'] = function ($operation, $tableName) {
    $hasAuth = !empty($_SESSION['claims']['name'])
        || !empty($_SESSION['username'])
        || !empty($_SESSION['user'])
        || !empty($_SESSION['apiKey'])
        || !empty($_SESSION['apiUser']);
    return !($tableName == 'invisibles' && !$hasAuth);
};

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$request = RequestFactory::fromGlobals();
$api = new Api(new Config($settings));
$response = $api->handle($request);
ResponseUtils::output($response);
