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
const pagination=Array(1).fill('').map(v=>({foo:1}));
const pagination_expected=JSON.stringify([...Array(1).fill('').keys()].map(v=>v+1));
// todo : lessons learned from tests, espacially when wrong with conditions
/**
 * 
 * - include restricts fields but not FK fields
 * - invalid conditions are discarded, this may lead to unexpected result. Why not implementing a strict mode?
 * - register does not log in, this could be an option
 * - pacajs allows to treat batch operations as string (1,2) or arrays [1,2]
 * - trabsversal joins can not be implemented as the original API (join=table1,table2&join=table3).
 * They have been implemented as {join:'table1,table2',join1:'table3'} close to the filter formalism
 * 
 */
export default (pca)=>[
    [
        ()=>pca.create('user',users[0]),
        1,
        'Creation of 1 user'
    ],
    [
        ()=>pca.create('user',[users[1],users[2]]),
        '[2,3]',
        'Creation of 2 more users'
    ],
    [
        ()=>pca.create('person',[...users]),
        '[1,2,3]',
        'Creation of 3 associated persons'
    ],
    [
        ()=>pca.create('note',[...notes]),
        '[1,2,3,4,5,6,7,8,9,10,11]',
        'Creation of 11 notes associated to the three users'
    ],
    [
        ()=>pca.create('sub_note', {note_id:1}),
        1,
        'Creation of 11 notes associated to the three users'
    ],
    [
        ()=>pca.update('note',1,{note:'up_note11'}),
        1,
        'Update the note id 1'
    ],
    [
        ()=>pca.update('note','2,3', [{note:'up_note21'},{note:'up_note31'}]),
        '[1,1]',
        'Update 2 notes as string'
    ],
    [
        ()=>pca.update('note', '1,2,3',[{note:'note11'},{note:'note21'},{note:'note31'}]),
        '[1,1,1]',
        'Update three notes as array'
    ],
    [
        ()=>pca.delete('note', 4),
        1,
        'Delete note id 4'
    ],
    [
        ()=>pca.delete('note', '5,6'),
        '[1,1]',
        'Delete notes id 5/6 as string'
    ],
    [
        ()=>pca.delete('note', [7,8]),
        '[1,1]',
        'Delete notes id 7/8 as array'
    ],
    [
        ()=>pca.read('user', 1),
        '{"id":1,"login":"tit1","pass":"tit1pass"}',
        'Read user id 1'
    ],
    [
        ()=>pca.read('user', '1,2'),
        '[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"}]',
        'Read user id 1/2 as string'
    ],
    [
        ()=>pca.read('user', [1,2]),
        '[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"}]',
        'Read user id 1/2 as array'
    ],
    [
        ()=>pca.read('user', 2, {join:'note',include:'user.id,note.title'}),
        '{"id":2,"note":[{"title":"title21","user_id":2}]}',
        'Read user id 1 and join note table'
    ],
    [
        ()=>pca.list('user', {filter:'pass,cs,pass'}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"},{"id":3,"login":"tit3","pass":"tit3pass"}]}',
        'Read with one filter made of field,cs,val'
    ],
    [
        ()=>pca.list('user', {filter:['pass,cs,pass','login,eq,tit1']}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read with a filters array &lt; field1,cs,val1 , field2,eq,val2 &gt; (AND)'
    ],
    [
        ()=>pca.list('user', {filter1:['pass,cs,pass','login,eq,tit1']}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"}]}',
        'Read with a filters (with filter1 keyword) array &lt; field1,cs,val1 , field2,eq,val2 &gt; (AND)'
    ],
    [
        ()=>pca.list('user', {filter1:'login,eq,tit1',filter2:'pass,eq,tit2pass'}),
        '{"records":[{"id":1,"login":"tit1","pass":"tit1pass"},{"id":2,"login":"tit2","pass":"tit2pass"}]}',
        'Read with a multiple filters (OR)'
    ],
    [
        ()=>pca.list('user', {include:'id'}),
        '{"records":[{"id":1},{"id":2},{"id":3}]}',
        'Read with include'
    ],
    [
        ()=>pca.list('user', {exclude:'login,pass'}),
        '{"records":[{"id":1},{"id":2},{"id":3}]}',
        'Read with exclude as string'
    ],
    [
        ()=>pca.list('user', {exclude:['login','pass']}),
        '{"records":[{"id":1},{"id":2},{"id":3}]}',
        'Read with exclude as array'
    ],
    [
        ()=>pca.list('user', {order:'login,desc', include:'id'}),
        '{"records":[{"id":3},{"id":2},{"id":1}]}',
        'Read with one ordering'
    ],
    [
        ()=>pca.list('note', {order:['user_id','note,desc'], include:'user_id,note', filter:'title,eq,multi-ordering'}),
        '{"records":[{"note":"note3","user_id":1},{"note":"note2","user_id":1},{"note":"note1","user_id":3}]}',
        'Read with 2 ordering'
    ],
    [
        ()=>pca.list('user', {size:1, include:'id'}),
        '{"records":[{"id":1}]}',
        'Read with size condition'
    ],
    [
        ()=>pca.list('user', {page:1, include:'id'}),
        '{"records":[{"id":1},{"id":2},{"id":3}],"results":3}',
        'Read with pagination condition'
    ],
    [
        ()=>pca.list('user', {page:'1,2', include:'id'}),
        '{"records":[{"id":1},{"id":2}],"results":3}', // todo : results should be 2?
        'Read with pagination conditions as string'
    ],
    [
        ()=>pca.list('user', {page:[1,2], include:'id'}),
        '{"records":[{"id":1},{"id":2}],"results":3}', // todo : results should be 2?
        'Read with pagination conditions as array'
    ],
    [
        ()=>pca.list('user', {join:'note', include:'note.id,user.id'}), // todo : did not expect user_id field
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1},{"id":10,"user_id":1},{"id":11,"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3},{"id":9,"user_id":3}]}]}',
        'Read with user/note join'
    ],
    [
        ()=>pca.list('user', {join:'note',join1:'person', include:'note.id,user.id'}), // todo : did not expect user_id field
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1},{"id":10,"user_id":1},{"id":11,"user_id":1}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3},{"id":9,"user_id":3}],"person":[{"user_id":3}]}]}',
        'Read with user/note join'
    ],
    [
        ()=>pca.list('user', {join:'note,sub_note',join1:'person', include:'note.id,user.id,sub_note.id'}), // todo : did not expect user_id field
        '{"records":[{"id":1,"note":[{"id":1,"user_id":1,"sub_note":[{"id":1,"note_id":1}]},{"id":10,"user_id":1,"sub_note":[]},{"id":11,"user_id":1,"sub_note":[]}],"person":[{"user_id":1}]},{"id":2,"note":[{"id":2,"user_id":2,"sub_note":[]}],"person":[{"user_id":2}]},{"id":3,"note":[{"id":3,"user_id":3,"sub_note":[]},{"id":9,"user_id":3,"sub_note":[]}],"person":[{"user_id":3}]}]}',
        'Read with user/note join'
    ]
];