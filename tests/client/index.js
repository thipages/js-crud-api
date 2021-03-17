import pcajs_test from "./pcajs_test.js";
import queries_basic from "./queries_basic.js";
import queries_dbAuth from "./queries_dbAuth.js";

const root='./../../tests/server';
export default(index)=>pcajs_test(tests[index][1],tests[index][2]);
const tests=[
    ['basic',root+'/basic/api.php', queries_basic],
    ['dbAuth',root+'/dbAuth/api.php',queries_dbAuth]
];



