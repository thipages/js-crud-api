const castArray=(a)=>Array.isArray(a)?a:[a];
const toComma=a=>castArray(a).join(',');
const matchJoin=(key)=>key!=='join' && key.substr(0,4)==='join';
//const matchJoins=(key)=>key==='join' || key.substr(0,4)==='join';
const filtered =(raw,p)=> Object.keys(raw)
    .filter(key => p(key))
    .reduce((obj, key) => {
        obj[key] = raw[key];
        return obj;
    }, {});
const query=(o) => {
    let args=[];
    Object.keys(o).forEach((key)=> {
        args.push(...dispatch(key,castArray(o[key])));
    });
    return '?'+args.join('&');
};
const dispatch=(key, a)=>{
    let values=[];
    /**
     * php-crud-api syntax for multiple separated join (join=table1,table2&join=table3)
     * is incompatible with the current js API
     */
    if (matchJoin(key)) key='join';
    /**
     * filter/filterx conditions works both ways
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
                //console.log(response);
                const data=await response.json();
                return (response.status === 200 || response.ok)
                    ? Promise.resolve(data)
                    : Promise.reject(data);
            }).catch (e=>{
                return Promise.reject(e.code?e:{code:-1, message:e.message})
            });
    };
    const _create=(table,data)=>_fetch('POST',data,['records',table]);
    const _read=(table,ids,joins)=>_fetch(
        'GET',
        null,
        ['records',table,toComma(ids),query(joins)]//filtered(joins,matchJoins))]
    );
    const _list=(table, conditions)=> {
        let add=conditions
            ? query(conditions)
            : '';
        let parts=['records',table];
        if (add!=='') parts.push(add);
        return _fetch('GET',null,parts);
    };
    return {
        list:(table,conditions={})=>_list(table,conditions),
        read:(table,ids,joins={})=>_read(table,ids,joins),
        create:(table,data)=>_create(table,data),
        update:(table,idOrList,data)=>_fetch('PUT',data,['records',table,toComma(idOrList)]),
        delete:(table,idOrList)=>_fetch('DELETE',null,['records',table,toComma(idOrList)]),
        register:(username,password)=>_fetch('POST', {username,password},['register']),
        login:(username,password)=>_fetch('POST', {username,password},['login']),
        logout:()=>_fetch('POST',{},['logout']),
        password:(username, password, newPassword)=>_fetch('POST',{username, password, newPassword},['password']),
        me:()=>_fetch('GET',null,['me'])
    };
};