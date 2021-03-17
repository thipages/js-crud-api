<?php
include_once './../../../vendor/mevdschee/php-crud-api/api.include.php';
require ('./../PCA.php');
$dbPath='./test.db';
$config=[
    'middlewares'=>'dbAuth',
    "dbAuth.mode"=>"required",
    "dbAuth.usersTable"=>"user",
    "dbAuth.usernameColumn"=>"login",
    "dbAuth.passwordColumn"=>"pass",
    "dbAuth.returnedColumns"=>"",
    "dbAuth.registerUser"=>"1",
    "dbAuth.passwordLength"=>"6",
    "dbAuth.sessionName"=>"user_id",
    'driver' => 'sqlite',
    'address' => $dbPath,
    'username' => '',
    'password' => '',
    'database' => $dbPath
    ,'debug' => false
];
$pca=new PCA($dbPath, $config);
$pca->execute();