import serialp from "./serialp.js";
import pcajs from "./../../esm/index.js";

const getTestResult=(expected,index,success,result)=> {
    const isOk_expected=!expected.startsWith('#');
    const result_expected=isOk_expected
        ? expected
        : expected.slice(1);
    const result_observed=typeof (result === 'object') && result.code
        ? ""+result.code
        : JSON.stringify(result);
    return [
        result_expected===result_observed,
        result_observed,
        result_expected,
        JSON.stringify(result)
    ];
};
const getDetails=(parameters)=>{
    return `
        <details>
        <summary>more</summary>
        ${Object.entries(parameters).map(([k,v])=>`<div><span style="font-weight:bold">${k}</span> : <span>${v}</span></div>`).join('')}
        </details>
    `;
};
function getRegularHtml(index,success_promise, success_test, observed, expected,observed_full, comment) {
    const details=getDetails({index,success_promise, success_test, observed, expected,observed_full, comment});
    const OK=success_test?'OK':'NOK';
    const log=success_test
        ? ''
        : `<div>observed:${observed}</div><div>expected:${expected}</div>`;
    const errorCaught=success_promise
        ? ''
        : `(error "${expected}" caught)`;
    return `<div style="display: flex">${index} ${OK} - ${comment} ${errorCaught}&nbsp;${details}</div>${log}`;
        
}
const getForcedHtml=(index,comment)=>`<div>${index} OK - ${comment}</div>`;
const run=(queries)=>serialp(
    queries.map(v=>v[0]),(index,success,result)=> {
        const expected=""+queries[index][1];
        const comment=queries[index][2];
        let next, html;
        if (comment.substring(0,6)==='FORCED') {
            html=getForcedHtml(index,comment);
            next= true;
        } else {
            const results=getTestResult(expected,index,success,result);
            html=getRegularHtml(index, success,...results, comment);
            next= results[0];
        }
        document.body.insertAdjacentHTML('beforeend',html);
        return next
    }
);
export default(path,queries)=>new Promise (
    resolve=>{
        const q=queries(pcajs(path));
        console.log('start');
        fetch (path+"?reset_db").then(
            x=>x.text().then(x=>{
                console.log(x);
                run(q).then (x=>{
                    resolve()
                });
            })
        );
    }
);

