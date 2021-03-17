const users=[
    ['tit','titpass']
];
const person={firstname:'fn1',lastname:'ln1', user_id:1};
export default (jca)=>[
    [
        ()=>jca.logout(),
        '#1011',
        'FORCED logout' // special FORCED comment, always pass test
    ],
    [
        ()=>jca.me(),
        '#1011',
        'Who is connected 1?'
    ],
    [
        ()=>jca.create('person',person),
        '#1011',
        'tit logged creates a person'
    ],
    [
        ()=>jca.login(...users[0]),
        '#1012',
        "tit logs without registration"
    ],
    [
        ()=>jca.register(...users[0]),
        '{"id":1,"login":"tit"}',
        "tit registers"
    ],
    [
        ()=>jca.password(...users[0], 'newPassword'),
        '#1012',
        "tit non logged changes password"
    ],
    [
        ()=>jca.me(),
        '#1011',
        'Who is connected 2?'
    ],
    [
        ()=>jca.login(...users[0]),
        '{"id":1,"login":"tit"}',
        "tit logs"
    ],
    [
        ()=>jca.me(),
        '{"id":1,"login":"tit"}',
        "Who is connected 3?"
    ],
    [
        ()=>jca.create('person',person),
        1,
        'tit logged creates a person'
    ],
    [
        ()=>jca.password(...users[0], 'newPassword'),
        '{"id":1,"login":"tit"}',
        "tit logged changes password"
    ],
    [
        ()=>jca.create('person',person),
        2,
        'tit logged creates another person'
    ],
    [
        ()=>jca.logout(),
        '{"id":1,"login":"tit"}',
        'tit logs out'
    ],
    [
        ()=>jca.me(),
        '#1011',
        "Who is connected 4?"
    ],
    [
        ()=>jca.create('person',person),
        '#1011',
        'tit not logged creates a person'
    ],
    [
        ()=>jca.login(...users[0]),
        '#1012',
        'tit logs with the old password'
    ],
    [
        ()=>jca.login(users[0][0],'newPassword'),
        '{"id":1,"login":"tit"}',
        'tit logs with the new password'
    ]
];