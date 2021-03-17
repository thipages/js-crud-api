const users=[
    ['tit','titpass']
];
const person={firstname:'fn1',lastname:'ln1', user_id:1};
export default (pca)=>[
    [
        ()=>pca.logout(),
        '#1011',
        'FORCED logout' // special FORCED comment, always pass test
    ],
    [
        ()=>pca.me(),
        '#1011',
        'Who is connected 1?'
    ],
    [
        ()=>pca.create('person',person),
        '#1011',
        'tit logged creates a person'
    ],
    [
        ()=>pca.login(...users[0]),
        '#1012',
        "tit logs without registration"
    ],
    [
        ()=>pca.register(...users[0]),
        '{"id":1,"login":"tit"}',
        "tit registers"
    ],
    [
        ()=>pca.password(...users[0], 'newPassword'),
        '#1012',
        "tit non logged changes password"
    ],
    [
        ()=>pca.me(),
        '#1011',
        'Who is connected 2?'
    ],
    [
        ()=>pca.login(...users[0]),
        '{"id":1,"login":"tit"}',
        "tit logs"
    ],
    [
        ()=>pca.me(),
        '{"id":1,"login":"tit"}',
        "Who is connected 3?"
    ],
    [
        ()=>pca.create('person',person),
        1,
        'tit logged creates a person'
    ],
    [
        ()=>pca.password(...users[0], 'newPassword'),
        '{"id":1,"login":"tit"}',
        "tit logged changes password"
    ],
    [
        ()=>pca.create('person',person),
        2,
        'tit logged creates another person'
    ],
    [
        ()=>pca.logout(),
        '{"id":1,"login":"tit"}',
        'tit logs out'
    ],
    [
        ()=>pca.me(),
        '#1011',
        "Who is connected 4?"
    ],
    [
        ()=>pca.create('person',person),
        '#1011',
        'tit not logged creates a person'
    ],
    [
        ()=>pca.login(...users[0]),
        '#1012',
        'tit logs with the old password'
    ],
    [
        ()=>pca.login(users[0][0],'newPassword'),
        '{"id":1,"login":"tit"}',
        'tit logs with the new password'
    ]
];