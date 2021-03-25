const castArray=a=>Array.isArray(a)?a:[a];
const matchJoin=(key)=>key!=='join' && key.substr(0,4)==='join';
const prefix=p=>s=>p+s;
const join=(d=',')=>a=>castArray(a).join(d);
const mapN=a=>(...f)=>f.reduce((acc,v)=>acc.map(v),a);
const pca_join=s=>join('&')(
    mapN(castArray(s))(join(),prefix('join='))
);
//const matchJoins=(key)=>key==='join' || key.substr(0,4)==='join';
/*const filtered =(raw,p)=> Object.keys(raw)
    .filter(key => p(key))
    .reduce((obj, key) => {
        obj[key] = raw[key];
        return obj;
    }, {});*/
const query=(conditions) => '?'+Object.keys(conditions).reduce((acc,key)=> {
        acc.push(...dispatch(key,castArray(conditions[key])));
        return acc;
    },[]).join('&');
const dispatch=(key, a)=>{
    let values=[];
    /**
     * php-crud-api syntax for multiple separated join (join=table1,table2&join=table3)
     * is incompatible with the current js API
     */
    if (matchJoin(key)) key='join';
    /**
     * filter/filterx conditions works whatever order
     */
    if (['include','exclude','page','join'].indexOf(key)===-1) {
        a.forEach((item)=> {
            values.push(key+'='+item);
        })
    } else {
        values= [key+"="+a.join(',')];
    }
    return values;
};
export default (baseUrl, config={})=>{
    // todo headers Content-Type? application/json vs multipart/form-data ...
    const headers = {};
    const _config = (method, body)=>{
        let c= {
            method: method,
            ...config,
            headers: {
                ...headers,
                ...config.headers,
            }
        };
        // todo do manage array of FormData?
        if (body) c.body=body instanceof FormData ? body :JSON.stringify(body);
        return c;
    };
    const url=(parts)=>[baseUrl,...parts].join('/');
    const _fetch=(method,body, parts)=> {
        return fetch(url(parts), _config(method, body))
            .then(async response =>{
                const data=await response.json();
                return (response.status === 200 || response.ok)
                    ? Promise.resolve(data)
                    : Promise.reject(data);
            }).catch (e=>{
                return Promise.reject(e.code?e:{code:-1, message:e.message})
            });
    };
    const _readOrList=([part1,conditions])=>_fetch(
        'GET',
        null,
        ['records', ...part1].concat(conditions ? [query(conditions)] : [])
    );
    return {
        list:(table,conditions={})=>_readOrList([[table],conditions]),
        // todo : a read method without ids will be considered as a list operation by php-crud-api. JS error?
        read:(table,ids,conditions={})=>_readOrList(ids?[[table,join()(ids)],conditions]:[[table]]),
        create:(table,data)=>_fetch('POST',data,['records',table]),
        update:(table,idOrList,data)=>_fetch('PUT',data,['records',table,join()(idOrList)]),
        delete:(table,idOrList)=>_fetch('DELETE',null,['records',table,join()(idOrList)]),
        register:(username,password)=>_fetch('POST', {username,password},['register']),
        login:(username,password)=>_fetch('POST', {username,password},['login']),
        logout:()=>_fetch('POST',{},['logout']),
        password:(username, password, newPassword)=>_fetch('POST',{username, password, newPassword},['password']),
        me:()=>_fetch('GET',null,['me'])
    };
};