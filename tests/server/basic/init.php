<?php
require('./../../../vendor/autoload.php');
require('./../InitDB.php');

$init=new InitDB(
    'test.db',
    [
        'user'=>[
            'login TEXT',
            'pass TEXT'
        ],
        'person'=> [
            'lastname TEXT',
            'firstname TEXT',
            'user_id INTEGER NOT NULL #FK_user'
        ],
        'note'=> [
            'title TEXT',
            'note TEXT',
            'user_id INTEGER NOT NULL #FK_user'
        ],
        'sub_note'=> [
            'note_id INTEGER NOT NULL #FK_note'
        ]
    ]
);
$init->execute();