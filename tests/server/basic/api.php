<?php
include_once './../../../vendor/mevdschee/php-crud-api/api.include.php';
require('./../PCA.php');
$dbPath='./test.db';
$config = [
    'driver' => 'sqlite',
    'address' => './test.db',
    'username' => '',
    'password' => '',
    'database' => $dbPath
    ,'debug' => true
];
$pca=new PCA($dbPath,$config);
$pca->execute();