export default async (promises, observer)=> {
    const next=(i,s,r)=>typeof observer==='function'?observer(i,s,r):observer;
    const results = [];
    for (let i=0;i<promises.length;i++) {
        let result,success;
        try {
            result=await promises[i]();
            success=true;
        } catch (e) {
            result=e;
            success=false;
        }
        console.log('serialp',success, result)
        results.push([success,result]);
        if (!next(i,success,result)) break;
    }
    return results;
};