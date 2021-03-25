const users=[ // and persons ...
    {login:'tit1',pass:'tit1pass', 'firstname':'t1', lastname:'it1', user_id:1},
    {login:'tit2',pass:'tit2pass', 'firstname':'t2', lastname:'it2', user_id:2},
    {login:'tit3',pass:'tit3pass', 'firstname':'t3', lastname:'it3', user_id:3}
];
const notes=[
    {note:'note11', title:'title11', user_id: 1},
    {note:'note21', title:'title21', user_id: 2},
    {note:'note31', title:'title31', user_id: 3},
    // will be deleted
    {note:'note12', title:'title12', user_id: 1},
    {note:'note13', title:'title13', user_id: 1},
    {note:'note14', title:'title14', user_id: 1},
    {note:'note15', title:'title15', user_id: 1},
    {note:'note16', title:'title16', user_id: 1},
    // used for multiple ordering
    {note:'note1', title:'multi-ordering', user_id: 3},
    {note:'note2', title:'multi-ordering', user_id: 1},
    {note:'note3', title:'multi-ordering', user_id: 1}
];
// todo improve paginatino tests
/*const pagination=Array(1).fill('').map(v=>({foo:1}));
const pagination_expected=JSON.stringify([...Array(1).fill('').keys()].map(v=>v+1));
*/
export default (jca)=>[
    [
        ()=>jca.create('user',users[0]),
        1,
        'Creation of 1 user'
    ],
    [
        ()=>jca.read('user'),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read the user created (no arguments)'
    ],
    [
        ()=>jca.create('user',[users[1],users[2]]),
        '[2,3]',
        'Creation of 2 more users'
    ],
    [
        ()=>jca.create('person',[...users]),
        '[1,2,3]',
        'Creation of 3 associated persons'
    ],
    [
        ()=>jca.create('note',[...notes]),
        '[1,2,3,4,5,6,7,8,9,10,11]',
        'Creation of 11 notes associated to the three users'
    ],
    [
        ()=>jca.create('sub_note', {note_id:1}),
        1,
        'Creation of 11 notes associated to the three users'
    ],
    [
        ()=>jca.update('note',1,{note:'up_note11'}),
        1,
        'Update the note id 1'
    ],
    [
        ()=>jca.update('note','2,3', [{note:'up_note21'},{note:'up_note31'}]),
        '[1,1]',
        'Update 2 notes as string'
    ],
    [
        ()=>jca.update('note', '1,2,3',[{note:'note11'},{note:'note21'},{note:'note31'}]),
        '[1,1,1]',
        'Update three notes as array'
    ],
    [
        ()=>jca.delete('note', 4),
        1,
        'Delete note id 4'
    ],
    [
        ()=>jca.delete('note', '5,6'),
        '[1,1]',
        'Delete notes id 5/6 as string'
    ],
    [
        ()=>jca.delete('note', [7,8]),
        '[1,1]',
        'Delete notes id 7/8 as array'
    ],
    [
        ()=>jca.read('user', 1),
        '{"id":1,"login":"tit1","pass":"tit1pass"}',
        'Read user id 1'
    ],
    [
        ()=>jca.read('user', '1,2'),
        '[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"}]',
        'Read user id 1/2 as string'
    ],
    [
        ()=>jca.read('user', [1,2]),
        '[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"}]',
        'Read user id 1/2 as array'
    ]/*,
    [
        ()=>jca.read('user', 2, {join:'note',include:'user.id,note.title'}),
        '{"id":2,"note":[{"title":"title21","user_id":2}]}',
        'Read user id 1 and join note table'
    ]*/,
    [
        ()=>jca.read('user', 2, {join:'note',include:'user.id,note.title'}),
        '{"id":2,"note":[{"title":"title21","user_id":2}]}',
        'Read user id 1 and join note table'
    ],
    [
        ()=>jca.list('user', {filter:'pass,cs,pass'}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"},{"id":3,"login":"tit3","pass":"tit3pass"}]}',
        'Read with one filter made of String field,cs,val'
    ],
    [
        ()=>jca.list('user', {filter:['pass','cs','pass']}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"},{"id":3,"login":"tit3","pass":"tit3pass"}]}',
        'Read with one filter made of Array [field,cs,val]'
    ],
    [
        ()=>jca.list('user', {filter:['pass,cs,pass','login,eq,tit1']}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read with a filters array &lt; field1,cs,val1 , field2,eq,val2 &gt; (AND)'
    ],
    [
        ()=>jca.list('user', {filter:[['pass','cs','pass'],'login,eq,tit1']}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read with a filters mixed array of array/string &lt; [field1,cs,val1] , field2,eq,val2 &gt; (AND)'
    ],
    [
        ()=>jca.list('user', {filter:[['pass','cs','pass'],['login','eq','tit1']]}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read with a filters array of array &lt; [field1,cs,val1] , [field2,eq,val2] &gt; (AND)'
    ],
    [
        ()=>jca.list('user', {filter1:['pass,cs,pass','login,eq,tit1']}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read with a filters (with filter1 keyword) array &lt; field1,cs,val1 , field2,eq,val2 &gt; (AND)'
    ],
    [
        ()=>jca.list('user', {filter1:'login,eq,tit1',filter2:'pass,eq,tit2pass'}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"}]}',
        'Read with a multiple filters (OR)'
    ],
    [
        ()=>jca.list('user', {include:'id'}),
        '{"records":[{"id":1},{"id":2},{"id":3}]}',
        'Read with include'
    ],
    [
        ()=>jca.list('user', {exclude:'login,pass'}),
        '{"records":[{"id":1},{"id":2},{"id":3}]}',
        'Read with exclude as string'
    ],
    [
        ()=>jca.list('user', {exclude:['login','pass']}),
        '{"records":[{"id":1},{"id":2},{"id":3}]}',
        'Read with exclude as array'
    ],
    [
        ()=>jca.list('user', {order:'login,desc', include:'id'}),
        '{"records":[{"id":3},{"id":2},{"id":1}]}',
        'Read with one ordering'
    ],
    [
        ()=>jca.list('note', {order:['user_id','note,desc'], include:'user_id,note', filter:'title,eq,multi-ordering'}),
        '{"records":[{"note":"note3","user_id":1},{"note":"note2","user_id":1},{"note":"note1","user_id":3}]}',
        'Read with 2 ordering'
    ],
    [
        ()=>jca.list('user', {size:1, include:'id'}),
        '{"records":[{"id":1}]}',
        'Read with size condition'
    ],
    [
        ()=>jca.list('user', {page:1, include:'id'}),
        '{"records":[{"id":1},{"id":2},{"id":3}],"results":3}',
        'Read with pagination condition'
    ],
    [
        ()=>jca.list('user', {page:'1,2', include:'id'}),
        '{"records":[{"id":1},{"id":2}],"results":3}', // todo : results should be 2?
        'Read with pagination conditions as string'
    ],
    [
        ()=>jca.list('user', {page:[1,2], include:'id'}),
        '{"records":[{"id":1},{"id":2}],"results":3}', // todo : results should be 2?
        'Read with pagination conditions as array'
    ],
    [
        ()=>jca.list('user', {join:'note', include:'note.id,user.id'}), // Important: fk fields are always returned
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1},{"id":10,"user_id":1},{"id":11,"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3},{"id":9,"user_id":3}]}]}',
        'Read with  join, path : user/note'
    ],/*
    [
        ()=>jca.list('user', {join:'note',join1:'person', include:'note.id,user.id'}),
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1},{"id":10,"user_id":1},{"id":11,"user_id":1}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3},{"id":9,"user_id":3}],"person":[{"user_id":3}]}]}',
        'Read with user/note join'
    ],
    [
        ()=>jca.list('user', {join:'note,sub_note',join1:'person', include:'note.id,user.id,sub_note.id'}),
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1,"sub_note":[{"id":1,"note_id":1}]},{"id":10,"user_id":1,"sub_note":[]},{"id":11,"user_id":1,"sub_note":[]}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2,"sub_note":[]}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3,"sub_note":[]},{"id":9,"user_id":3,"sub_note":[]}],"person":[{"user_id":3}]}]}',
        'Read with user/note join - OLD TESTS - TO REMOVE'
    ]*/
    [
        ()=>jca.list('user', {join:['note','person'], include:'note.id,user.id'}),
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1},{"id":10,"user_id":1},{"id":11,"user_id":1}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3},{"id":9,"user_id":3}],"person":[{"user_id":3}]}]}',
        'Read with join, path : user/note/person'
    ],
    [
        ()=>jca.list('user', {join:[['note,sub_note'],'person'], include:'note.id,user.id,sub_note.id'}),
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1,"sub_note":[{"id":1,"note_id":1}]},{"id":10,"user_id":1,"sub_note":[]},{"id":11,"user_id":1,"sub_note":[]}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2,"sub_note":[]}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3,"sub_note":[]},{"id":9,"user_id":3,"sub_note":[]}],"person":[{"user_id":3}]}]}',
        'Read with join, paths : user/note/sub_note and user/person (string version)'
    ],
    [
        ()=>jca.list('user', {join:[['note,sub_note'],['person']], include:'note.id,user.id,sub_note.id'}),
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1,"sub_note":[{"id":1,"note_id":1}]},{"id":10,"user_id":1,"sub_note":[]},{"id":11,"user_id":1,"sub_note":[]}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2,"sub_note":[]}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3,"sub_note":[]},{"id":9,"user_id":3,"sub_note":[]}],"person":[{"user_id":3}]}]}',
        'Read with join, paths : user/note/sub_note and user/person (Array version)'
    ]
];